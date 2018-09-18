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
        response = await api.uploadDeployFile({
          body: readStream,
          deployId,
          path: encodeURI(normalizedPath)
        })
        break
      }
      case 'function': {
        response = await api.uploadDeployFunction({
          body: readStream,
          deployId,
          name: encodeURI(normalizedPath),
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
