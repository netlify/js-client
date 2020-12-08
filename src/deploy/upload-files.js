const fs = require('fs')

const backoff = require('backoff')
const pMap = require('p-map')

module.exports = uploadFiles
async function uploadFiles(api, deployId, uploadList, { concurrentUpload, statusCb, maxRetry }) {
  if (!concurrentUpload || !statusCb || !maxRetry) throw new Error('Missing required option concurrentUpload')
  statusCb({
    type: 'upload',
    msg: `Uploading ${uploadList.length} files`,
    phase: 'start',
  })

  const uploadFile = async (fileObj, index) => {
    const { normalizedPath, assetType, runtime } = fileObj
    const readStreamCtor = () => fs.createReadStream(fileObj.filepath)

    statusCb({
      type: 'upload',
      msg: `(${index}/${uploadList.length}) Uploading ${normalizedPath}...`,
      phase: 'progress',
    })
    let response
    switch (assetType) {
      case 'file': {
        response = await retryUpload(
          () =>
            api.uploadDeployFile({
              body: readStreamCtor,
              deployId,
              path: encodeURI(normalizedPath),
            }),
          maxRetry,
        )
        break
      }
      case 'function': {
        response = await await retryUpload(
          () =>
            api.uploadDeployFunction({
              body: readStreamCtor,
              deployId,
              name: encodeURI(normalizedPath),
              runtime,
            }),
          maxRetry,
        )
        break
      }
      default: {
        const e = new Error('File Object missing assetType property')
        e.fileObj = fileObj
        throw e
      }
    }

    return response
  }

  const results = await pMap(uploadList, uploadFile, { concurrency: concurrentUpload })
  statusCb({
    type: 'upload',
    msg: `Finished uploading ${uploadList.length} assets`,
    phase: 'stop',
  })
  return results
}

function retryUpload(uploadFn, maxRetry) {
  return new Promise((resolve, reject) => {
    let lastError
    const fibonacciBackoff = backoff.fibonacci({
      randomisationFactor: 0.5,
      initialDelay: 5000,
      maxDelay: 90000,
    })
    fibonacciBackoff.failAfter(maxRetry)

    fibonacciBackoff.on('backoff', () => {
      // Do something when backoff starts, e.g. show to the
      // user the delay before next reconnection attempt.
    })

    fibonacciBackoff.on('ready', tryUpload)

    fibonacciBackoff.on('fail', () => {
      reject(lastError)
    })

    function tryUpload() {
      uploadFn()
        .then((results) => resolve(results))
        .catch((error) => {
          lastError = error
          switch (true) {
            case error.status >= 400: // observed errors: 408, 401 (4** swallowed), 502
            case error.name === 'FetchError': {
              return fibonacciBackoff.backoff()
            }
            default: {
              return reject(error)
            }
          }
        })
    }

    tryUpload(0, 0)
  })
}
