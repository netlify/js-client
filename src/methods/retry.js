// We retry:
//  - when receiving a rate limiting response
//  - on network failures due to timeouts
const shouldRetry = function ({ response = {}, error = {} }) {
  return isRetryStatus(response) || RETRY_ERROR_CODES.has(error.code)
}

const isRetryStatus = function ({ status }) {
  return typeof status === 'number' && (status === RATE_LIMIT_STATUS || String(status).startsWith('5'))
}

const waitForRetry = async function (response) {
  const delay = getDelay(response)
  await sleep(delay)
}

const getDelay = function (response) {
  if (response === undefined) {
    return DEFAULT_RETRY_DELAY
  }

  const rateLimitReset = response.headers.get(RATE_LIMIT_HEADER)

  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY
  }

  return Math.max(Number(rateLimitReset) * SECS_TO_MSECS - Date.now(), MIN_RETRY_DELAY)
}

const sleep = function (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const DEFAULT_RETRY_DELAY = 5e3
const MIN_RETRY_DELAY = 1e3
const SECS_TO_MSECS = 1e3
const MAX_RETRY = 5
const RATE_LIMIT_STATUS = 429
const RATE_LIMIT_HEADER = 'X-RateLimit-Reset'
const RETRY_ERROR_CODES = new Set(['ETIMEDOUT', 'ECONNRESET'])

module.exports = { shouldRetry, waitForRetry, MAX_RETRY }
