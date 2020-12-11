// Webpack will sometimes export default exports in different places
const fetch = require('node-fetch').default || require('node-fetch')
const parseLinkHeader = require('parse-link-header')

const { getOperations } = require('../operations')

const { addBody } = require('./body.js')
const { parseResponse, getFetchError } = require('./response.js')
const { shouldRetry, waitForRetry, MAX_RETRY } = require('./retry.js')
const { getUrl } = require('./url.js')

// For each OpenAPI operation, add a corresponding method.
// The `operationId` is the method name.
const addMethods = function (NetlifyApi) {
  const methods = getMethods(NetlifyApi)
  Object.assign(NetlifyApi, methods)
}

const getMethods = function (NetlifyApi) {
  const operations = getOperations()
  const methods = operations.map((method) => getMethod(method, NetlifyApi))
  return Object.assign({}, ...methods)
}

const getMethod = function (method, NetlifyApi) {
  return {
    [method.operationId](params, opts) {
      return callMethod(method, NetlifyApi, params, opts)
    },
  }
}

const callMethod = async function (method, NetlifyApi, params, opts) {
  const { exhaustive = false } = opts || {}
  const url = getUrl(method, NetlifyApi, requestParams)
  const { parsedResponse, headers } = await retrieveResponse({ url, method, NetlifyApi, requestParams, opts })
  if (!exhaustive || !Array.isArray(parsedResponse)) {
    // If the user did not enable the retrieval of all items, or
    // if the response is a single object/item, then
    // we can skip the pagination logic.
    return parsedResponse
  }

  return await retrieveResponseForNextPages({ method, NetlifyApi, requestParams, opts, parsedResponse, headers })
}

const retrieveResponse = async function({ url, method, NetlifyApi, requestParams, opts }) {
  const response = await makeRequestOrRetry({ url, method, NetlifyApi, requestParams, opts })
  const parsedResponse = await parseResponse(response)
  return {
    parsedResponse,
    headers: response.headers
  }
}

const retrieveResponseForNextPages = async function({
  method,
  NetlifyApi,
  requestParams,
  opts,
  parsedResponse,
  headers
}) {
  // Responses for each page are accumulated in a flattened manner.
  let results = parsedResponse

  // The API directly provides the link to the next page (if any)
  // in the `Link` header.
  let url = getNextPageUrl(headers)

  // For paginated results, we retrieve all the pages for this
  // method until we exhaust the entire dataset.
  while (url) {
    const { parsedResponse, headers } = await retrieveResponse({ url, method, NetlifyApi, requestParams, opts })
    results = results.concat(parsedResponse)
    url = getNextPageUrl(headers)
  }

  return results
}

const getNextPageUrl = function(headers) {
  const linkHeader = headers.get('link') || ''
  const { next = {} } = parseLinkHeader(linkHeader) || {}
  return next.url
}

const getOpts = function ({ verb, parameters }, NetlifyApi, { body }, opts) {
  const optsA = addHttpMethod(verb, opts)
  const optsB = addDefaultHeaders(NetlifyApi, optsA)
  const optsC = addBody(body, parameters, optsB)
  const optsD = addAgent(NetlifyApi, optsC)
  return optsD
}

// Add the HTTP method based on the OpenAPI definition
const addHttpMethod = function (verb, opts) {
  return { ...opts, method: verb.toUpperCase() }
}

// Assign default HTTP headers
const addDefaultHeaders = function (NetlifyApi, opts) {
  return { ...opts, headers: { ...NetlifyApi.defaultHeaders, ...opts.headers } }
}

// Assign fetch agent (like for example HttpsProxyAgent) if there is one
const addAgent = function (NetlifyApi, opts) {
  if (NetlifyApi.agent) {
    return { ...opts, agent: NetlifyApi.agent }
  }
  return opts
}

const makeRequestOrRetry = async function ({ url, method, NetlifyApi, requestParams, opts }) {
  for (let index = 0; index <= MAX_RETRY; index++) {
    const optsA = getOpts(method, NetlifyApi, requestParams, opts)
    const { response, error } = await makeRequest(url, optsA)

    if (shouldRetry({ response, error }) && index !== MAX_RETRY) {
      await waitForRetry(response)
      continue
    }

    if (error !== undefined) {
      throw error
    }

    return response
  }
}

const makeRequest = async function (url, opts) {
  try {
    const response = await fetch(url, opts)
    return { response }
  } catch (error) {
    const errorA = getFetchError(error, url, opts)
    return { error: errorA }
  }
}

module.exports = { addMethods }
