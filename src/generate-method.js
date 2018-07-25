const get = require('lodash.get')
const queryString = require('qs')
const r2 = require('r2')
const camelCase = require('lodash.camelcase')

function existy(val) {
  return val != null
}

module.exports = method => {
  return async function(params, opts) {
    opts = Object.assign({}, opts)
    params = Object.assign(
      {
        client_id: this.clientId
      },
      params
    )

    let path = this.basePath + method.path

    Object.values(method.parameters.path).forEach(param => {
      const val = params[param.name] || params[camelCase(param.name)]
      if (existy(val)) {
        path.replace(`{${param.name}}`, val)
      } else if (param.required) {
        throw new Error(`Missing required param ${param.name}`)
      }
    })

    let qs
    Object.values(method.parameters.query).forEach(param => {
      const val = params[param.name] || params[camelCase(param.name)]
      if (existy(val)) {
        if (!qs) qs = {}
        qs[param.name] = val
      }
    })
    if (qs) path = path += `?${queryString.stringify(qs)}`

    let body
    if (params.body) {
      body = params.body
    }
    delete params.body

    opts.headers = Object.assign({}, this.defaultHeaders, opts.headers)
    if (body) opts.json = body
    return await r2[method.verb](path, opts).response
  }
}
