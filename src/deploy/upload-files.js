const pMap = require('p-map')
const fs = require('fs')
const backoff = require('backoff')

module.exports = uploadFiles
async function uploadFiles(api, deployId, uploadList, { concurrentUpload, statusCb, maxRetry }) {
  if (!concurrentUpload || !statusCb || !maxRetry) throw new Error('Missing required option concurrentUpload')
  statusCb({
    type: 'upload',
    msg: `Uploading ${uploadList.length} files`,
    phase: 'start'
  })

  const uploadFile = async (fileObj, index) => {
    const { normalizedPath, assetType, runtime } = fileObj
    const readStream = fs.createReadStream(fileObj.filepath)

    statusCb({
      type: 'upload',
      msg: `(${index}/${uploadList.length}) Uploading ${normalizedPath}...`,
      phase: 'progress'
    })
    let response
    switch (assetType) {
      case 'file': {
        response = await retryUpload(
          () =>
            api.uploadDeployFile({
              body: readStream,
              deployId,
              path: encodeURI(normalizedPath)
            }),
          maxRetry
        )
        break
      }
      case 'function': {
        response = await await retryUpload(
          () =>
            api.uploadDeployFunction({
              body: readStream,
              deployId,
              name: encodeURI(normalizedPath),
              runtime
            }),
          maxRetry
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
    phase: 'stop'
  })
  return results
}

function retryUpload(uploadFn, maxRetry) {
  return new Promise((resolve, reject) => {
    let lastError
    const fibonacciBackoff = backoff.fibonacci({
      randomisationFactor: 0.5,
      initialDelay: 100,
      maxDelay: 10000
    })
    fibonacciBackoff.failAfter(maxRetry)

    fibonacciBackoff.on('backoff', (number, delay) => {
      // Do something when backoff starts, e.g. show to the
      // user the delay before next reconnection attempt.
    })

    fibonacciBackoff.on('ready', tryUpload)

    fibonacciBackoff.on('fail', () => {
      reject(lastError)
    })

    function tryUpload(number, delay) {
      uploadFn()
        .then(results => resolve(results))
        .catch(e => {
          lastError = e
          switch (true) {
            case e.status === 408: // request timeout
            case e.name === 'FetchError': {
              return fibonacciBackoff.backoff()
            }
            default: {
              return reject(e)
            }
          }
        })
    }

    tryUpload(0, 0)
  })
}
