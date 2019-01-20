# netlify/js-client
[![npm version][npm-img]][npm] [![build status][travis-img]][travis] [![windows build status][av-img]][av]
[![coverage][coverage-img]][coverage] [![dependencies][david-img]][david] [![downloads][dl-img]][dl]

A Netlify [open-api](https://github.com/netlify/open-api) client that works in the browser and Node.js.

## Usage

```js
const NetlifyAPI = require('netlify')
const client = new NetlifyAPI('1234myAccessToken')
const sites = await client.listSites()
```

## API

### `client = new NetlifyAPI([accessToken], [opts])`

Create a new instance of the Netlify API client with the provided `accessToken`.

`accessToken` is optional.  Without it, you can't make authorized requests.

`opts` includes:

```js
{
  userAgent: 'netlify/js-client',
  scheme: 'https',
  host: 'api.netlify.com',
  pathPrefix: '/api/v1',
  globalParams: {} // parameters you want available for every request.
  // Global params are only sent of the open-api spec specifies the provided params.
}
```

### `client.accessToken`

A setter/getter that returns the `accessToken` that the client is configured to use. You can set this after the class is instantiated, and all subsequent calls will use the newly set `accessToken`.

### `client.basePath`

A getter that returns the formatted base URL of the endpoint the client is configured to use.

### Open API Client methods

The client is dynamically generated from the [open-api](https://github.com/netlify/open-api) definition file. Each method is is named after the `operationId` name of each endpoint action. **To see list of available operations see the [open-api website](https://open-api.netlify.com/)**.

Every open-api method has the following signature:

#### `promise(response) = client.operationId([params], [opts])`

Perform a call to the given endpoint corresponding with the `operationId`. Returns promise that will resolve with the body of the response, or reject with an error with details about the request attached. Rejects if the `status` > 400. Successful response objects have `status` and `statusText` properties on their prototype.

- `params` is an object that includes any of the required or optional endpoint parameters.
- `params.body` should be an object which gets serialized to JSON automatically.
- If the endpoint accepts `binary`, `params.body` can be a Node.js readable stream or stream ctor (e.g. `() => fs.createReadStream('./foo')`).  A Stream ctor function is required to support rate limit retry.

```js
// example params
{
  any_param_needed,
  paramsCanAlsoBeCamelCase,
  body: {
    an: 'arbitrary js object'
  }
}
```

Optional `opts` can include any property you want passed to `node-fetch`. The `headers` property is merged with some `defaultHeaders`.

```js
// example opts
{
  headers: { // Default headers
    'User-agent': 'netlify-js-client',
    accept: 'application/json'
  }
  // any other properties for node-fetch
}
```

All methods are conveniently consumed with async/await:

```js
async function getSomeData () {
  // Calls may fail!
  try {
    return await client.getSiteDeploy({
      siteId: '1234abcd',
      deploy_id: '4567'
    })
  } catch (e) {
    // handle error
  }
}
```

If the request response includes `json` in the `contentType` header, fetch will deserialize the JSON body. Otherwise the `text` of the response is returned.

### API Flow Methods

Some methods have been added in addition to the open API methods that make certain actions simpler to perform.

#### `promise(accessToken) = client.getAccessToken(ticket, [opts])`

Pass in a [`ticket`](https://open-api.netlify.com/#model-ticket) and get back an `accessToken`. Call this with the response from a `client.createTicket({ client_id })` call. Automatically sets the `accessToken` to `this.accessToken` and returns `accessToken` for the consumer to save for later.

Optional `opts` include:

```js
{
  poll: 1000, // number of ms to wait between polling
  timeout: 3.6e6 // number of ms to wait before timing out
}
```

See the [authenticating](https://www.netlify.com/docs/api/#authenticating) docs for more context.

```js
// example:
async function login () {
  const ticket = await api.createTicket({
    clientId: CLIENT_ID
  })
  // Open browser for authentication
  await openBrowser(`https://app.netlify.com/authorize?response_type=ticket&ticket=${ticket.id}`)
  const accessToken = await api.getAccessToken(ticket)
  // API is also set up to use the returned access token as a side effect
  return accessToken // Save this for later so you can quickly set up an authenticated client
}
```

#### `promise(deploy) = client.deploy(siteId, buildDir, [opts])`

**Node.js Only**: Pass in a `siteId`, a `buildDir` (the folder you want to deploy) and an options object to deploy the contents of that folder.
Sometimes this method needs to write to a `tmpDir`.  By default `tmpDir` is a folder in the system temporary directory.

The following paths can be passed in the options:

- `configPath` (path to a `netlify.toml` file that includes redirect rules for the deploy, etc.)
- `functionsDir` (a folder with lambda functions to deploy)

Optional `opts` include:

```js
{
  functionsDir: null, // path to a folder of functions to deploy
  configPath: null, // path to a netlify.toml file to include in the deploy (e.g. redirect support for manual deploys)
  draft: false, // draft deploy or production deploy
  message: undefined, // a short message to associate with the deploy
  deployTimeout: 1.2e6, // 20 mins
  parallelHash: 100, // number of parallel hashing calls
  parallelUpload: 15, // number of files to upload in parallel
  maxRetry: 5, // number of times to try on failed file uploads
  filter: filepath => { /* return false to filter a file  from the deploy */ },
  tmpDir: tempy.directory(), // a temporary directory to zip functions into
  statusCb: statusObj => {
    // a callback function to receive status events
    /* statusObj: {
            type: name-of-step
            msg: msg to print
            phase: [start, progress, stop]
        } */
    // See https://github.com/netlify/cli/blob/v2.0.0-beta.3/src/commands/deploy.js#L161-L195
    // for an example of how this can be used.
  }
 }
```

## UMD Builds

A UMD build is provided for your convenience, however browser support is still experimental.  Contributions to improve browser support are welcome.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for more info on how to make contributions to this project.

## License

MIT. See [LICENSE](LICENSE) for more details.

[npm-img]: https://img.shields.io/npm/v/netlify.svg
[npm]: https://npmjs.org/package/netlify
[travis-img]: https://img.shields.io/travis/netlify/js-client/master.svg
[travis]: https://travis-ci.org/netlify/js-client
[av-img]: https://ci.appveyor.com/api/projects/status/6lw5yqvl4plm1utb/branch/master?svg=true
[av]: https://ci.appveyor.com/project/netlify/js-client
[dl-img]: https://img.shields.io/npm/dm/netlify.svg
[dl]: https://npmjs.org/package/netlify
[coverage-img]: https://img.shields.io/coveralls/netlify/js-client/master.svg
[coverage]: https://coveralls.io/github/netlify/js-client
[david-img]: https://david-dm.org/netlify/js-client/status.svg
[david]: https://david-dm.org/netlify/js-client
