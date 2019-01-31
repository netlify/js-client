const get = require('lodash.get')
const set = require('lodash.set')
const queryString = require('qs')
const http = require('http')
const fetch = require('node-fetch').default || require('node-fetch') // Webpack will sometimes export default exports in different places
const Headers = require('node-fetch').Headers
const camelCase = require('lodash.camelcase')
const { JSONHTTPError, TextHTTPError } = require('micro-api-client')
const debug = require('debug')('netlify:open-api')
const { existy, sleep, unixNow } = require('./util')
const isStream = require('is-stream')

exports.methods = require('./shape-swagger')

// open-api 2.0
exports.generateMethod = method => {
  //
  // Warning: Expects `this`. These methods expect to live on the client prototype
  //
  return async function(params, opts) {
    opts = Object.assign({}, opts)
    params = Object.assign({}, this.globalParams, params)

    let path = this.basePath + method.path
    debug(`path template: ${path}`)

    // Path parameters
    Object.values(method.parameters.path).forEach(param => {
      const val = params[param.name] || params[camelCase(param.name)]
      if (existy(val)) {
        path = path.replace(`{${param.name}}`, val)
        debug(`replacing {${param.name}} with ${val}`)
      } else if (param.required) {
        throw new Error(`Missing required param ${param.name}`)
      }
    })

    // qs parameters
    let qs
    Object.values(method.parameters.query).forEach(param => {
      const val = params[param.name] || params[camelCase(param.name)]
      if (existy(val)) {
        if (!qs) qs = {}
        qs[param.name] = val
      } else if (param.required) {
        throw new Error(`Missing required param ${param.name}`)
      }
    })
    if (qs) {
      debug(`qs: %O`, qs)
      path = path += `?${queryString.stringify(qs)}`
    }

    // body parameters
    let body
    let bodyType = 'json'
    if (params.body) {
      body = params.body
      Object.values(method.parameters.body).forEach(param => {
        const type = get(param, 'schema.format')
        if (type === 'binary') {
          bodyType = 'binary'
        }
      })
    }
    debug(`bodyType: ${bodyType}`)

    const specialHeaders = {}
    if (body) {
      switch (bodyType) {
        case 'binary': {
          opts.body = body
          set(specialHeaders, 'Content-Type', 'application/octet-stream')
          break
        }
        case 'json':
        default: {
          opts.body = JSON.stringify(body)
          set(specialHeaders, 'Content-Type', 'application/json')
          break
        }
      }
    }
    debug('specialHeaders: %O', specialHeaders)

    opts.headers = new Headers(Object.assign({}, this.defaultHeaders, specialHeaders, opts.headers))
    opts.method = method.verb.toUpperCase()
    debug(`method: ${opts.method}`)

    // TODO: Consider using micro-api-client when it supports node-fetch

    async function makeRequest() {
      let response
      try {
        debug(`requesting ${path}`)

        if (isStream(opts.body) && opts.body.closed) {
          throw new Error('Body readable stream is already used.  Try passing a stream ctor instead')
        }

        // Pass in a function for readable stream ctors
        const fetchOpts = typeof opts.body === 'function' ? Object.assign({}, opts, { body: opts.body() }) : opts

        response = await fetch(path, fetchOpts)
      } catch (e) {
        // TODO: clean up this error path
        debug(`fetch error`)
        /* istanbul ignore next */
        e.name = 'FetchError'
        e.url = path
        e.data = Object.assign({}, opts)
        delete e.data.Authorization
        throw e
      }
      return response
    }

    async function retryIfRatelimit() {
      // Adapted from:
      // https://github.com/netlify/open-api/blob/master/go/porcelain/http/http.go

      const MAX_RETRY = 10
      const DEFAULT_RETRY_DELAY = 5000 //ms

      let last_retry_delay = DEFAULT_RETRY_DELAY
      for (let index = 0; index <= MAX_RETRY; index++) {
        debug('Rate limit attempt ' + index + ' for ' + path)
        const response = await makeRequest()
        if (http.STATUS_CODES[response.status] !== 'Too Many Requests' || index === MAX_RETRY) {
          if (index === MAX_RETRY) debug(`Rate limit retry exhausted, aborting request...`)
          return response
        } else {
          try {
            const rateLimitReset = response.headers.get('X-RateLimit-Reset')
            const resetTime = Number.parseInt(rateLimitReset)
            if (!existy(resetTime)) {
              debug('Issue getting resetTime: %O', resetTime)
              throw new Error('Header missing reset time')
            }
            const now = unixNow()
            last_retry_delay = ((resetTime - now < 0 ? 0 : resetTime - now) + 1) * 1000 // minimum 1 second
            debug(`sleeping for ${last_retry_delay}ms`)
            await sleep(last_retry_delay)
          } catch (e) {
            debug(`sleeping for ${last_retry_delay}ms`)
            await sleep(last_retry_delay)
          }
        }
      }
    }

    const response = await retryIfRatelimit()
    debug(`fetch done`)

    const contentType = response.headers.get('Content-Type')
    debug(`response contentType: ${contentType}`)

    if (contentType && contentType.match(/json/)) {
      debug('parsing json')
      const json = await response.json()
      if (!response.ok) {
        throw new JSONHTTPError(response, json)
      }
      // TODO: Support pagination
      // const pagination = getPagination(response)
      // return pagination ? { pagination, items: json } : json
      return json
    }

    debug('parsing text')
    const text = await response.text()
    if (!response.ok) {
      throw new TextHTTPError(response, text)
    }

    return text
  }
}
