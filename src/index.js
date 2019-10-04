const set = require('lodash.set')
const get = require('lodash.get')
const dfn = require('@netlify/open-api')
const pWaitFor = require('p-wait-for')
const debug = require('debug')('netlify')

const { addMethods } = require('./methods')
const { getOperations } = require('./operations')
const deploy = require('./deploy')

class NetlifyAPI {
  constructor(accessToken, opts) {
    addMethods(this)

    // variadic arguments
    if (typeof accessToken === 'object') {
      opts = accessToken
      accessToken = null
    }
    // default opts
    opts = Object.assign(
      {
        userAgent: 'netlify/js-client',
        scheme: dfn.schemes[0],
        host: dfn.host,
        pathPrefix: dfn.basePath,
        accessToken,
        globalParams: {}
      },
      opts
    )
    debug('options: %O', opts)

    this.defaultHeaders = {
      'User-agent': opts.userAgent,
      accept: 'application/json'
    }

    this.scheme = opts.scheme
    this.host = opts.host
    this.pathPrefix = opts.pathPrefix
    this.globalParams = opts.globalParams
    this.accessToken = opts.accessToken
  }

  get accessToken() {
    return (get(this, 'defaultHeaders.Authorization') || '').replace('Bearer ', '') || null
  }

  set accessToken(token) {
    if (token) {
      set(this, 'defaultHeaders.Authorization', 'Bearer ' + token)
    } else {
      delete this.defaultHeaders.Authorization
    }
  }

  get basePath() {
    return `${this.scheme}://${this.host}${this.pathPrefix}`
  }

  async getAccessToken(ticket, opts) {
    opts = Object.assign(
      {
        poll: 1000,
        timeout: 3.6e6
      },
      opts
    )
    debug('getAccessToken options: %O', opts)

    const api = this

    const { id } = ticket

    let authorizedTicket // ticket capture
    const checkTicket = async () => {
      debug('checking ticket')
      const t = await api.showTicket({ ticketId: id })
      if (t.authorized) {
        debug('received authorized ticket')
        authorizedTicket = t
      }
      return !!t.authorized
    }

    await pWaitFor(checkTicket, {
      interval: opts.poll,
      timeout: opts.timeout,
      message: 'Timeout while waiting for ticket grant'
    })

    const accessTokenResponse = await api.exchangeTicket({ ticketId: authorizedTicket.id })
    // See https://open-api.netlify.com/#/default/exchangeTicket for shape
    this.accessToken = accessTokenResponse.access_token
    debug('access token details: %O', {
      id: accessTokenResponse.id,
      user_id: accessTokenResponse.id,
      user_email: accessTokenResponse.id,
      created_at: accessTokenResponse.id
    })

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
