const path = require('path')
const { promisify } = require('util')

const zipIt = require('@netlify/zip-it-and-ship-it')
const fromArray = require('from2-array')
const pump = promisify(require('pump'))

const { hasherCtor, manifestCollectorCtor } = require('./hasher-segments')

module.exports = hashFns
async function hashFns(dir, opts) {
  opts = Object.assign(
    {
      concurrentHash: 100,
      assetType: 'function',
      hashAlgorithm: 'sha256',
      // tmpDir,
      statusCb: () => {}
    },
    opts
  )
  // early out if the functions dir is omitted
  if (!dir) return { functions: {}, shaMap: {} }
  if (!opts.tmpDir) throw new Error('Missing tmpDir directory for zipping files')

  const functionZips = await zipIt.zipFunctions(dir, opts.tmpDir)

  const fileObjs = functionZips.map(({ path: functionPath, runtime }) => ({
    filepath: functionPath,
    root: opts.tmpDir,
    relname: path.relative(opts.tmpDir, functionPath),
    basename: path.basename(functionPath),
    extname: path.extname(functionPath),
    type: 'file',
    assetType: 'function',
    normalizedPath: path.basename(functionPath, path.extname(functionPath)),
    runtime
  }))

  const functionStream = fromArray.obj(fileObjs)

  const hasher = hasherCtor(opts)

  // Written to by manifestCollector
  const functions = {} // normalizedPath: hash (wanted by deploy API)
  const fnShaMap = {} //hash: [fileObj, fileObj, fileObj]
  const manifestCollector = manifestCollectorCtor(functions, fnShaMap, opts)

  await pump(functionStream, hasher, manifestCollector)

  return { functions, fnShaMap }
}
