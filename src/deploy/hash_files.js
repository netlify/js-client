const { promisify } = require('util')

const walker = require('folder-walker')
const pump = promisify(require('pump'))

const { hasherCtor, manifestCollectorCtor, fileFilterCtor, fileNormalizerCtor } = require('./hasher_segments')

const hashFiles = async (dir, configPath, opts) => {
  opts = {
    concurrentHash: 100,
    assetType: 'file',
    statusCb: () => {},
    ...opts,
  }

  if (!opts.filter) throw new Error('Missing filter function option')
  const fileStream = walker([configPath, dir], { filter: opts.filter })
  const filter = fileFilterCtor()
  const hasher = hasherCtor(opts)
  const fileNormalizer = fileNormalizerCtor(opts)

  // Written to by manifestCollector
  // normalizedPath: hash (wanted by deploy API)
  const files = {}
  // hash: [fileObj, fileObj, fileObj]
  const filesShaMap = {}
  const manifestCollector = manifestCollectorCtor(files, filesShaMap, opts)

  await pump(fileStream, filter, hasher, fileNormalizer, manifestCollector)

  return { files, filesShaMap }
}

module.exports = hashFiles
