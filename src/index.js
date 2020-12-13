const dfn = require('@netlify/open-api')
const pWaitFor = require('p-wait-for')

const deploy = require('./deploy')
const { addMethods } = require('./methods')
const { getOperations } = require('./operations')

class NetlifyAPI {
  constructor(accessToken, opts) {
    addMethods(this)

    // variadic arguments
    if (typeof accessToken === 'object') {
      opts = accessToken
      accessToken = null
    }
    // default opts
    opts = {
      userAgent: 'netlify/js-client',
      scheme: dfn.schemes[0],
      host: dfn.host,
      pathPrefix: dfn.basePath,
      accessToken,
      globalParams: {},
      ...opts,
    }

    this.defaultHeaders = {
      'User-agent': opts.userAgent,
      accept: 'application/json',
    }

    this.scheme = opts.scheme
    this.host = opts.host
    this.pathPrefix = opts.pathPrefix
    this.globalParams = opts.globalParams
    this.accessToken = opts.accessToken
    this.agent = opts.agent
  }

  get accessToken() {
    const {
      defaultHeaders: { Authorization },
    } = this
    if (typeof Authorization !== 'string' || !Authorization.startsWith('Bearer ')) {
      return null
    }

    return Authorization.replace('Bearer ', '')
  }

  set accessToken(token) {
    if (!token) {
      // eslint-disable-next-line fp/no-delete
      delete this.defaultHeaders.Authorization
      return
    }

    this.defaultHeaders.Authorization = `Bearer ${token}`
  }

  get basePath() {
    return `${this.scheme}://${this.host}${this.pathPrefix}`
  }

  async getAccessToken(ticket, opts) {
    opts = { poll: 1000, timeout: 3.6e6, ...opts }

    const { id } = ticket

    // ticket capture
    let authorizedTicket
    const checkTicket = async () => {
      const t = await this.showTicket({ ticketId: id })
      if (t.authorized) {
        authorizedTicket = t
      }
      return Boolean(t.authorized)
    }

    await pWaitFor(checkTicket, {
      interval: opts.poll,
      timeout: opts.timeout,
      message: 'Timeout while waiting for ticket grant',
    })

    const accessTokenResponse = await this.exchangeTicket({ ticketId: authorizedTicket.id })
    // See https://open-api.netlify.com/#/default/exchangeTicket for shape
    this.accessToken = accessTokenResponse.access_token
    return accessTokenResponse.access_token
  }

  async deploy(siteId, buildDir, opts) {
    if (!this.accessToken) throw new Error('Missing access token')
    // the deploy function is swapped in the package.json browser field for different environments
    // See https://github.com/defunctzombie/package-browser-field-spec
    return await deploy(this, siteId, buildDir, opts)
  }
}

module.exports = NetlifyAPI

module.exports.methods = getOperations()
