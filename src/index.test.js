const test = require('tape')
const http = require('http')
const promisify = require('util').promisify
const NetlifyAPI = require('./index')

const createServer = handler => {
  const server = http.createServer(handler)
  server._close = server.close
  server.close = promisify(cb => server._close(cb))
  server._listen = server.listen
  server.listen = promisify((port, cb) => server._listen(port, cb))
  return server
}

const port = 1123

const client = new NetlifyAPI('1234', {
  scheme: 'http',
  host: `localhost:${port}`,
  pathPrefix: '/v1',
  clientId: '1234'
})

test('can make basic requests', async t => {
  const server = createServer((req, res) => {
    t.equal(req.url, '/v1/oauth/tickets?client_id=1234', 'url')
    t.equal(req.headers.authorization, 'Bearer 1234')
    console.log(req.headers)
    res.end('{"foo":"bar"}')
  })

  await server.listen(port)

  const response = await client.createTicket()
  const json = await response.json
  t.end()
})
