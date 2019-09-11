const test = require('ava')
const nock = require('nock')
const fromString = require('from2-string')
const { TextHTTPError } = require('micro-api-client')

const NetlifyAPI = require('./index')

const scheme = 'http'
const domain = 'localhost'
const port = 1123
const pathPrefix = '/api/v10'
const host = `${domain}:${port}`
const origin = `${scheme}://${host}`
const accessToken = 'testAccessToken'

const getClient = function(opts = {}) {
  return new NetlifyAPI(opts.accessToken, Object.assign({ scheme, host, pathPrefix }, opts))
}

test('Default options', async t => {
  const client = new NetlifyAPI({})
  t.is(client.scheme, 'https')
  t.is(client.host, 'api.netlify.com')
  t.is(client.pathPrefix, '/api/v1')
  t.is(client.accessToken, null)
  t.deepEqual(client.globalParams, {})
  t.deepEqual(client.defaultHeaders, {
    'User-agent': 'netlify/js-client',
    accept: 'application/json'
  })
})

test('Can set|get scheme', async t => {
  const client = new NetlifyAPI({ scheme })
  t.is(client.scheme, scheme)
})

test('Can set|get host', async t => {
  const client = new NetlifyAPI({ host })
  t.is(client.host, host)
})

test('Can set|get pathPrefix', async t => {
  const client = new NetlifyAPI({ pathPrefix })
  t.is(client.pathPrefix, pathPrefix)
})

test('Can set|get basePath', async t => {
  const client = new NetlifyAPI({ scheme, host, pathPrefix })
  t.is(client.basePath, `${scheme}://${host}${pathPrefix}`)
})

test('Can update basePath', async t => {
  const client = new NetlifyAPI({ scheme, host, pathPrefix })

  const newScheme = 'https'
  const newHost = `${domain}:1224`
  const newPathPrefix = '/v2'
  client.scheme = newScheme
  client.host = newHost
  client.pathPrefix = newPathPrefix

  t.is(client.basePath, `${newScheme}://${newHost}${newPathPrefix}`)
})

test('Can set user agent', async t => {
  const userAgent = 'test'
  const client = new NetlifyAPI({ userAgent })
  t.is(client.defaultHeaders['User-agent'], userAgent)
})

test('Can set|get globalParams', async t => {
  const testGlobalParams = { test: 'test' }
  const client = new NetlifyAPI({ globalParams: testGlobalParams })
  t.deepEqual(client.globalParams, testGlobalParams)
})

test('Can set|get access token', async t => {
  const client = getClient()
  client.accessToken = accessToken
  t.is(client.accessToken, accessToken)
  t.is(client.defaultHeaders.Authorization, `Bearer ${accessToken}`)

  client.accessToken = undefined
  t.is(client.accessToken, null)
  t.is(client.defaultHeaders.Authorization, undefined)

  client.accessToken = accessToken
  t.is(client.accessToken, accessToken)
  t.is(client.defaultHeaders.Authorization, `Bearer ${accessToken}`)
})

test('Can specify access token as the first argument', async t => {
  const client = new NetlifyAPI(accessToken, {})
  t.is(client.accessToken, accessToken)
})

test('Can specify access token as an option', async t => {
  const client = new NetlifyAPI({ accessToken })
  t.is(client.accessToken, accessToken)
})

test('Can use underscored parameters in path variables', async t => {
  const account_id = '1'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200)

  const client = getClient()
  await client.getAccount({ account_id })

  t.true(scope.isDone())
})

test('Can use camelcase parameters in path variables', async t => {
  const account_id = '2'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200)

  const client = getClient()
  await client.getAccount({ accountId: account_id })

  t.true(scope.isDone())
})

test('Can use global parameters in path variables', async t => {
  const account_id = '3'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200)

  const client = getClient({ globalParams: { account_id } })
  await client.getAccount()

  t.true(scope.isDone())
})

test('Can use underscored parameters in query variables', async t => {
  const client_id = '1'
  const scope = nock(origin)
    .post(`${pathPrefix}/oauth/tickets`)
    .query({ client_id })
    .reply(200)

  const client = getClient()
  await client.createTicket({ client_id })

  t.true(scope.isDone())
})

test('Can use camelcase parameters in query variables', async t => {
  const client_id = '2'
  const scope = nock(origin)
    .post(`${pathPrefix}/oauth/tickets`)
    .query({ client_id })
    .reply(200)

  const client = getClient()
  await client.createTicket({ clientId: client_id })

  t.true(scope.isDone())
})

test('Can use global parameters in query variables', async t => {
  const client_id = '3'
  const scope = nock(origin)
    .post(`${pathPrefix}/oauth/tickets`)
    .query({ client_id })
    .reply(200)

  const client = getClient({ globalParams: { client_id } })
  await client.createTicket()

  t.true(scope.isDone())
})

test('Can specify JSON request body as an object', async t => {
  const body = { test: 'test' }
  const scope = nock(origin)
    .post(`${pathPrefix}/accounts`, body, { 'Content-Type': 'application/json' })
    .reply(200)

  const client = getClient()
  await client.createAccount({ body })

  t.true(scope.isDone())
})

test('Can specify JSON request body as a function', async t => {
  const body = { test: 'test' }
  const scope = nock(origin)
    .post(`${pathPrefix}/accounts`, body, { 'Content-Type': 'application/json' })
    .reply(200)

  const client = getClient()
  await client.createAccount({ body: () => body })

  t.true(scope.isDone())
})

test('Can specify binary request body as a stream', async t => {
  const deploy_id = '1'
  const path = 'testPath'
  const body = 'test'
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .put(`${pathPrefix}/deploys/${deploy_id}/files/${path}`, body, { 'Content-Type': 'application/octet-stream' })
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.uploadDeployFile({ deploy_id, path, body: fromString(body) })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can specify binary request body as a function', async t => {
  const deploy_id = '2'
  const path = 'testPath'
  const body = 'test'
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .put(`${pathPrefix}/deploys/${deploy_id}/files/${path}`, body, { 'Content-Type': 'application/octet-stream' })
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.uploadDeployFile({ deploy_id, path, body: () => fromString(body) })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can use global parameters in request body', async t => {
  const body = { test: 'test' }
  const scope = nock(origin)
    .post(`${pathPrefix}/accounts`, body)
    .reply(200)

  const client = getClient({ globalParams: { body } })
  await client.createAccount()

  t.true(scope.isDone())
})

test('Validates required path parameters', async t => {
  const account_id = '4'
  const scope = nock(origin)
    .put(`${pathPrefix}/accounts/${account_id}`)
    .reply(200)

  const client = getClient()
  await t.throwsAsync(client.updateAccount(), "Missing required path variable 'account_id'")

  t.false(scope.isDone())
})

test('Validates required query parameters', async t => {
  const account_slug = '1'
  const scope = nock(origin)
    .post(`${pathPrefix}/${account_slug}/members`)
    .reply(200)

  const client = getClient()
  await t.throwsAsync(client.addMemberToAccount({ account_slug }), "Missing required query variable 'email'")

  t.false(scope.isDone())
})

test('Can set request headers', async t => {
  const headerName = 'test'
  const headerValue = 'test'
  const account_id = '5'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .matchHeader(headerName, headerValue)
    .reply(200)

  const client = getClient()
  await client.getAccount({ account_id }, { headers: { [headerName]: headerValue } })

  t.true(scope.isDone())
})

test('Can parse JSON responses', async t => {
  const account_id = '6'
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can parse text responses', async t => {
  const account_id = '7'
  const expectedResponse = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Handle error JSON responses', async t => {
  const account_id = '8'
  const status = 404
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(status)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id }))

  t.is(error.status, status)
  t.is(error.message, 'Not Found')
  t.is(error.data, '')
  t.true(error instanceof TextHTTPError)
  t.true(error.stack !== undefined)
  t.true(scope.isDone())
})

test('Handle error text responses', async t => {
  const account_id = '9'
  const status = 404
  const expectedResponse = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(status, expectedResponse)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id }))

  t.is(error.status, status)
  t.is(error.message, 'Not Found')
  t.is(error.data, expectedResponse)
  t.true(error instanceof TextHTTPError)
  t.true(error.stack !== undefined)
  t.true(scope.isDone())
})

test('Handle network errors', async t => {
  const account_id = '10'
  const expectedResponse = 'test'
  const url = `${pathPrefix}/accounts/${account_id}`
  const scope = nock(origin)
    .get(url)
    .replyWithError(expectedResponse)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id }))

  t.true(error instanceof Error)
  t.is(error.name, 'FetchError')
  t.true(error.message.includes(expectedResponse))
  t.is(error.url, `${origin}${url}`)
  t.is(error.data.method, 'GET')
  t.true(scope.isDone())
})

test('Can get an access token from a ticket', async t => {
  const id = '1'
  const access_token = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, { authorized: true, id })
    .post(`${pathPrefix}/oauth/tickets/${id}/exchange`)
    .reply(200, { access_token })

  const client = getClient()
  const response = await client.getAccessToken({ id, poll: 1, timeout: 5e3 })

  t.is(response, access_token)
  t.is(client.accessToken, access_token)
  t.true(scope.isDone())
})

test('Can poll for access token', async t => {
  const id = '2'
  const access_token = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, {})
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, { authorized: true, id })
    .post(`${pathPrefix}/oauth/tickets/${id}/exchange`)
    .reply(200, { access_token })

  const client = getClient()
  await client.getAccessToken({ id })

  t.true(scope.isDone())
})

test('Can change access token polling', async t => {
  const id = '3'
  const access_token = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, {})
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, { authorized: true, id })
    .post(`${pathPrefix}/oauth/tickets/${id}/exchange`)
    .reply(200, { access_token })

  const client = getClient()
  await client.getAccessToken({ id }, { poll: 1 })

  t.true(scope.isDone())
})

test('Can timeout access token polling', async t => {
  const id = '4'
  const access_token = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, {})
    .get(`${pathPrefix}/oauth/tickets/${id}`)
    .reply(200, { authorized: true, id })
    .post(`${pathPrefix}/oauth/tickets/${id}/exchange`)
    .reply(200, { access_token })

  const client = getClient()
  await t.throwsAsync(client.getAccessToken({ id }, { poll: 1, timeout: 1 }), 'Promise timed out after 1 milliseconds')

  t.false(scope.isDone())
})

test('Handles API rate limiting', async t => {
  const account_id = '11'
  const retryAtMs = Date.now() + TEST_RATE_LIMIT_DELAY
  const retryAt = Math.ceil(retryAtMs / SECS_TO_MSECS)
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(429, { retryAt }, { 'X-RateLimit-Reset': retryAt })
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id })

  t.true(Date.now() >= retryAtMs)
  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Handles API rate limiting when date is in the past', async t => {
  const account_id = '12'
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(429, { retryAt: 0 }, { 'X-RateLimit-Reset': 0 })
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200, expectedResponse)

  const client = getClient()
  await client.getAccount({ account_id })

  t.true(scope.isDone())
})

test('Handles API rate limiting when X-RateLimit-Reset is missing', async t => {
  const account_id = '13'
  const expectedResponse = { test: 'test' }
  const retryAt = 'invalid'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(429, { retryAt })
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200, expectedResponse)

  const client = getClient()
  await client.getAccount({ account_id })

  t.true(scope.isDone())
})

test('Gives up retrying on API rate limiting after a timeout', async t => {
  const account_id = '14'
  const retryAt = Math.ceil(Date.now() / SECS_TO_MSECS)
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${account_id}`)
    .times(20)
    .reply(429, { retryAt }, { 'X-RateLimit-Reset': retryAt })
    .get(`${pathPrefix}/accounts/${account_id}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id }))

  t.is(error.status, 429)
  t.is(error.message, 'Too Many Requests')
  t.true(Number.isInteger(error.json.retryAt))

  t.false(scope.isDone())
})

const TEST_RATE_LIMIT_DELAY = 5e3
const SECS_TO_MSECS = 1e3
