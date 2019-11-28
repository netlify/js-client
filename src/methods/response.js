const { JSONHTTPError, TextHTTPError } = require('micro-api-client')

// Read and parse the HTTP response
const parseResponse = async function(response) {
  const responseType = getResponseType(response)
  const textResponse = await response.text()

  const parsedResponse = parseJsonResponse(response, textResponse, responseType)

  if (!response.ok) {
    const ErrorType = responseType === 'json' ? JSONHTTPError : TextHTTPError
    throw new ErrorType(response, parsedResponse)
  }

  return parsedResponse
}

const getResponseType = function({ headers }) {
  const contentType = headers.get('Content-Type')

  if (contentType != null && contentType.includes('json')) {
    return 'json'
  }

  return 'text'
}

const parseJsonResponse = function(response, textResponse, responseType) {
  if (responseType === 'text') {
    return textResponse
  }

  try {
    return JSON.parse(textResponse)
  } catch (error) {
    throw new TextHTTPError(response, textResponse)
  }
}

const getFetchError = function(error, url, opts) {
  const data = Object.assign({}, opts)
  delete data.Authorization
  Object.assign(error, { name: 'FetchError', url, data })
  return error
}

module.exports = { parseResponse, getFetchError }
