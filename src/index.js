const NetlifyApiBase = require('./base')
const { methods } = require('./load-swagger')
const request = require('request')

class NetlifyApi extends NetlifyApiBase {
  // Override to support streaming file reading
  async uploadDeployFile(deployId, path, readStream) {
    const reqOpts = {
      url: methods.uploadDeployFile.path.replace('{deploy_id}', deployId).replace('{path}', path),
      headers: Object.assign({}, this.defaultHeaders, {
        'Content-Type': 'application/octet-stream'
      }),
      body: readStream
    }

    return new Promise((resolve, reject) => {
      request.put(reqOpts, (err, res, body) => {
        if (err) return reject(err)

        if (res.statusCode >= 400) {
          const apiError = new Error('There was an error with one of the file uploads')
          apiError.response = res
          return reject(apiError)
        }

        try {
          body = JSON.parse(body)
        } catch (_) {
          // Ignore if body can't parse
        }

        resolve({ res, body })
      })
    })
  }
}

module.exports = NetlifyApi
