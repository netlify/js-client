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
        path = path.replace(`{${param.name}}`, val)
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
      } else if (param.required) {
        throw new Error(`Missing required param ${param.name}`)
      }
    })
    if (qs) path = path += `?${queryString.stringify(qs)}`

    let body

    if (params.body) {
      body = params.body
      Object.values(method.parameters.body).forEach(param => {
        const type = get(param, 'schema.format')
        if (type === 'binary') {
          opts.headers['Content-Type'] = 'application/octet-stream'
        }
      })
    }

    opts.headers = Object.assign({}, this.defaultHeaders, opts.headers)

    if (body) opts.json = body
    const req = await r2[method.verb](path, opts)
    const response = await req.response

    if (response.status >= 400) {
      const err = new Error(response.statusText)
      err.status = response.status
      err.response = response
      err.path = path
      err.opts = opts
      throw err
    }
    const status = {
      status: response.status,
      statusText: response.statusText
    }
    const json = await req.json
    Object.setPrototypeOf(json, status)
    return json
  }
}
