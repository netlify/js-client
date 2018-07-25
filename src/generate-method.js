const get = require('lodash.get')
const qs = require('qs')
const r2 = require('r2')

module.exports = method => {
  return async function(...args) {
    const pathParams = {}
    let pathParamCount = 0
    if (method.parameters.path) {
      pathParamCount = Object.keys(method.parameters.path).length
      Object.values(method.parameters.path).forEach(pathParam => {
        pathParams[pathParam.name] = args[pathParam.index]
      })
    }

    // last pathParam index = pathParamCount - 1
    let body = null
    let opts = null
    if (method.parameters.body) {
      body = args[pathParamCount]
      opts = args[pathParamCount + 1]
    } else {
      opts = args[pathParamCount]
    }

    opts = Object.assign({}, opts)

    let path = this.basePath + method.path
    Object.entries(pathParams).forEach(([name, value]) => {
      if (value == null) throw new Error(`Missing path argument ${name}`)
      path = path.replace(`{${name}}`, value)
    })

    if (get(method, 'parameters.query.client_id') && this.clientId) {
      const client_id = this.clientId
      opts.qs = Object.assign({ client_id }, opts.qs)
    }

    if (opts.qs) {
      path += `?${qs.stringify(opts.qs)}`
      delete opts.qs
    }

    opts.headers = Object.assign({}, this.defaultHeaders, opts.headers)
    if (body) opts.json = body
    return await r2[method.verb](path, opts).response
  }
}
