const objFilterCtor = require('through2-filter').objCtor
const objWriter = require('flush-write-stream').obj
const transform = require('parallel-transform')
const hasha = require('hasha')
const map = require('through2-map').obj

const { normalizePath } = require('./util')

// a parallel transform stream segment ctor that hashes fileObj's created by folder-walker
exports.hasherCtor = ({ concurrentHash, hashAlgorithm = 'sha1' }) => {
  const hashaOpts = { algorithm: hashAlgorithm }
  if (!concurrentHash) throw new Error('Missing required opts')
  return transform(concurrentHash, { objectMode: true }, (fileObj, cb) => {
    hasha
      .fromFile(fileObj.filepath, hashaOpts)
      // insert hash and asset type to file obj
      .then(hash => cb(null, Object.assign({}, fileObj, { hash })))
      .catch(err => cb(err))
  })
}

// Inject normalized file names into normalizedPath and assetType
exports.fileNormalizerCtor = fileNormalizerCtor
function fileNormalizerCtor({ assetType = 'file' }) {
  return map(fileObj => {
    return Object.assign({}, fileObj, { assetType, normalizedPath: normalizePath(fileObj.relname) })
  })
}

// A writable stream segment ctor that normalizes file paths, and writes shaMap's
exports.manifestCollectorCtor = (filesObj, shaMap, { statusCb, assetType }) => {
  if (!statusCb || !assetType) throw new Error('Missing required options')
  return objWriter((fileObj, _, cb) => {
    filesObj[fileObj.normalizedPath] = fileObj.hash

    // We map a hash to multiple fileObj's because the same file
    // might live in two different locations

    if (Array.isArray(shaMap[fileObj.hash])) {
      shaMap[fileObj.hash].push(fileObj)
    } else {
      shaMap[fileObj.hash] = [fileObj]
    }
    statusCb({
      type: 'hashing',
      msg: `Hashing ${fileObj.relname}`,
      phase: 'progress'
    })
    cb(null)
  })
}

// transform stream ctor that filters folder-walker results for only files
exports.fileFilterCtor = objFilterCtor(fileObj => {
  return fileObj.type === 'file'
})
