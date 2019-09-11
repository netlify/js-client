const fetch = require('node-fetch').default || require('node-fetch') // Webpack will sometimes export default exports in different places

const { getOperations } = require('../operations')

const { getUrl } = require('./url.js')
const { addBody } = require('./body.js')
const { shouldRetry, waitForRetry, MAX_RETRY } = require('./retry.js')
const { parseResponse, getFetchError } = require('./response.js')

// For each OpenAPI operation, add a corresponding method.
// The `operationId` is the method name.
const addMethods = function(NetlifyApi) {
  const methods = getMethods(NetlifyApi)
  Object.assign(NetlifyApi, methods)
}

const getMethods = function(NetlifyApi) {
  const operations = getOperations()
  const methods = operations.map(method => getMethod(method, NetlifyApi))
  return Object.assign({}, ...methods)
}

const getMethod = function(method, NetlifyApi) {
  return {
    [method.operationId](params, opts) {
      return callMethod(method, NetlifyApi, params, opts)
    }
  }
}

const callMethod = async function(method, NetlifyApi, params, opts) {
  const requestParams = Object.assign({}, NetlifyApi.globalParams, params)
  const url = getUrl(method, NetlifyApi, requestParams)
  const optsA = getOpts(method, NetlifyApi, requestParams, opts)

  const response = await makeRequestOrRetry(url, optsA)

  const parsedResponse = await parseResponse(response)
  return parsedResponse
}

const getOpts = function({ verb, parameters }, NetlifyApi, { body }, opts) {
  const optsA = addHttpMethod(verb, opts)
  const optsB = addDefaultHeaders(NetlifyApi, optsA)
  const optsC = addBody(body, parameters, optsB)
  return optsC
}

// Add the HTTP method based on the OpenAPI definition
const addHttpMethod = function(verb, opts) {
  return Object.assign({}, opts, { method: verb.toUpperCase() })
}

// Assign default HTTP headers
const addDefaultHeaders = function(NetlifyApi, opts) {
  return Object.assign({}, opts, {
    headers: Object.assign({}, NetlifyApi.defaultHeaders, opts.headers)
  })
}

const makeRequestOrRetry = async function(url, opts) {
  for (let index = 0; index <= MAX_RETRY; index++) {
    const response = await makeRequest(url, opts)

    if (shouldRetry(response, index)) {
      await waitForRetry(response)
    } else {
      return response
    }
  }
}

const makeRequest = async function(url, opts) {
  try {
    return await fetch(url, opts)
  } catch (error) {
    throw getFetchError(error, url, opts)
  }
}

module.exports = { addMethods }
