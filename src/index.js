const set = require('lodash.set')
const get = require('lodash.get')
const { methods } = require('./shape-swagger')
const dfn = require('@netlify/open-api')
const generateMethod = require('./generate-method')

class NetlifyApi {
  constructor(accessToken, opts) {
    opts = Object.assign(
      {
        userAgent: 'Netlify node-client',
        scheme: dfn.schemes[0],
        host: dfn.host,
        pathPrefix: dfn.basePath
      },
      opts
    )
    this.defaultHeaders = {
      'User-agent': opts.userAgent,
      accept: 'application/json'
    }
    this.scheme = opts.scheme
    this.host = opts.host
    this.pathPrefix = opts.pathPrefix
    this.clientId = opts.clientId
    if (accessToken) this.accessToken = accessToken
  }

  get accessToken() {
    return (get(this, 'defaultHeaders.Authorization') || '').replace('Bearer ', '')
  }

  set accessToken(token) {
    if (token) {
      set(this, 'defaultHeaders.Authorization', 'Bearer ' + token)
    } else {
      delete this.defaultHeaders.Authorization
    }
  }

  get basePath() {
    return `${this.scheme}://${this.host}${this.pathPrefix}`
  }
}

methods.forEach(method => {
  /* {param1, param2, body, ... }, [opts] */
  NetlifyApi.prototype[method.operationId] = generateMethod(method)
})

module.exports = NetlifyApi
