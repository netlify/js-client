const get = require('lodash.get')
const set = require('lodash.set')
const queryString = require('qs')
const fetch = require('node-fetch')
const Headers = fetch.Headers
const camelCase = require('lodash.camelcase')
const { JSONHTTPError, TextHTTPError } = require('micro-api-client')

function existy(val) {
  return val != null
}

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

    // Path parameters
    Object.values(method.parameters.path).forEach(param => {
      const val = params[param.name] || params[camelCase(param.name)]
      if (existy(val)) {
        path = path.replace(`{${param.name}}`, val)
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
    if (qs) path = path += `?${queryString.stringify(qs)}`

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

    const discoveredHeaders = {}
    if (body) {
      switch (bodyType) {
        case 'binary': {
          opts.body = body
          set(discoveredHeaders, 'Content-Type', 'application/octet-stream')
          break
        }
        case 'json':
        default: {
          opts.body = JSON.stringify(body)
          set(discoveredHeaders, 'Content-Type', 'application/json')
          break
        }
      }
    }

    opts.headers = new Headers(Object.assign({}, this.defaultHeaders, discoveredHeaders, opts.headers))
    opts.method = method.verb.toUpperCase()

    // TODO: Use micro-api-client when it supports node-fetch
    let response
    try {
      response = await fetch(path, opts)
    } catch (e) {
      /* istanbul ignore next */
      e.name = 'FetchError'
      e.url = path
      e.data = Object.assign({}, opts)
      delete e.data.Authorization
      throw e
    }

    const contentType = response.headers.get('Content-Type')

    if (contentType && contentType.match(/json/)) {
      const json = await response.json()
      if (!response.ok) {
        throw new JSONHTTPError(response, json)
      }
      // TODO: Support pagination
      // const pagination = getPagination(response)
      // return pagination ? { pagination, items: json } : json
      return json
    }

    const text = await response.text()
    if (!response.ok) {
      throw new TextHTTPError(response, text)
    }

    return text
  }
}
