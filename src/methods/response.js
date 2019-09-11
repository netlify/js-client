const { JSONHTTPError, TextHTTPError } = require('micro-api-client')

// Read and parse the HTTP response
const parseResponse = async function(response) {
  const { method, ErrorType } = getResponseType(response)
  const parsedResponse = await response[method]()

  if (!response.ok) {
    throw new ErrorType(response, parsedResponse)
  }

  return parsedResponse
}

const getResponseType = function({ headers }) {
  const contentType = headers.get('Content-Type')

  if (contentType != null && contentType.includes('json')) {
    return { method: 'json', ErrorType: JSONHTTPError }
  }

  return { method: 'text', ErrorType: TextHTTPError }
}

const getFetchError = function(error, url, opts) {
  const data = Object.assign({}, opts)
  delete data.Authorization
  Object.assign(error, { name: 'FetchError', url, data })
  return error
}

module.exports = { parseResponse, getFetchError }
