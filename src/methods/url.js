const queryString = require('qs')
const camelCase = require('lodash.camelcase')

// Replace path parameters and query parameters in the URI, using the OpenAPI
// definition
const getUrl = function({ path, parameters }, NetlifyApi, requestParams) {
  const url = `${NetlifyApi.basePath}${path}`
  const urlA = addPathParams(url, parameters, requestParams)
  const urlB = addQueryParams(urlA, parameters, requestParams)
  return urlB
}

const addPathParams = function(url, parameters, requestParams) {
  const pathParams = getRequestParams(parameters.path, requestParams, 'path variable')
  return Object.entries(pathParams).reduce(addPathParam, url)
}

const addPathParam = function(url, [name, value]) {
  return url.replace(`{${name}}`, value)
}

const addQueryParams = function(url, parameters, requestParams) {
  const queryParams = getRequestParams(parameters.query, requestParams, 'query variable')

  if (Object.keys(queryParams).length === 0) {
    return url
  }

  return `${url}?${queryString.stringify(queryParams)}`
}

const getRequestParams = function(params, requestParams, name) {
  const entries = Object.values(params).map(param => getRequestParam(param, requestParams, name))
  return Object.assign({}, ...entries)
}

const getRequestParam = function(param, requestParams, name) {
  const value = requestParams[param.name] || requestParams[camelCase(param.name)]

  if (value !== undefined) {
    return { [param.name]: value }
  }

  if (param.required) {
    throw new Error(`Missing required ${name} '${param.name}'`)
  }
}

module.exports = { getUrl }
