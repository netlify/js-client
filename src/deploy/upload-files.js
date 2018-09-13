const pMap = require('p-map')
const fs = require('fs')

module.exports = uploadFiles
async function uploadFiles(api, deployId, uploadList, { concurrentUpload, statusCb }) {
  if (!concurrentUpload || !statusCb) throw new Error('Missing required option concurrentUpload')
  statusCb({
    type: 'upload',
    msg: `Uploading ${uploadList.length} files`,
    phase: 'start'
  })
  const uploadFile = async fileObj => {
    const { normalizedPath, assetType, runtime } = fileObj
    const readStream = fs.createReadStream(fileObj.filepath)

    statusCb({
      type: 'upload',
      msg: `Uploading ${normalizedPath}...`,
      phase: 'progress'
    })
    let response
    switch (assetType) {
      case 'file': {
        response = await api.uploadDeployFile({
          body: readStream,
          deployId,
          path: normalizedPath
        })
        break
      }
      case 'function': {
        response = await api.uploadDeployFunction({
          body: readStream,
          deployId,
          name: normalizedPath,
          runtime
        })
        break
      }
      default: {
        const e = new Error('File Object missing assetType property')
        e.fileObj = fileObj
        throw e
      }
    }

    statusCb({
      type: 'upload',
      msg: `Finished uploading ${normalizedPath}`,
      phase: 'progress'
    })
    return response
  }

  const results = await pMap(uploadList, uploadFile, { concurrency: concurrentUpload })
  statusCb({
    type: 'upload',
    msg: `Finished uploading ${uploadList.length} files`,
    phase: 'stop'
  })
  return results
}
