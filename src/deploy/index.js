const uploadFiles = require('./upload-files')
const hashFiles = require('./hash-files')
const hashFns = require('./hash-fns')
const cleanDeep = require('clean-deep')

const { waitForDeploy, getUploadList, defaultFilter } = require('./util')

module.exports = async (api, siteId, dir, opts) => {
  // TODO Implement progress cb
  opts = Object.assign(
    {
      fnDir: null,
      tomlPath: null,
      draft: false,
      deployTimeout: 1.2e6, // local deploy timeout: 20 mins
      concurrentHash: 100, // concurrent file hash calls
      concurrentUpload: 4, // Number of concurrent uploads
      filter: defaultFilter,
      statusCb: statusObj => {
        /* default to noop */
        /* statusObj: {
            type: name-of-step
            msg: msg to print
            phase: [start, progress, stop]
        } */
      }
    },
    opts
  )

  const { fnDir, tomlPath, statusCb } = opts

  statusCb({
    type: 'hashing',
    msg: `Hashing files...`,
    phase: 'start'
  })

  const [{ files, filesShaMap }, { functions, fnShaMap }] = await Promise.all([
    hashFiles(dir, tomlPath, opts),
    hashFns(fnDir, opts)
  ])

  statusCb({
    type: 'hashing',
    msg:
      `Finished hashing ${Object.keys(files).length} files` +
      (fnDir ? ` and ${Object.keys(functions).length} functions` : ''),
    phase: 'stop'
  })

  statusCb({
    type: 'create-deploy',
    msg: 'CDN diffing files...',
    phase: 'start'
  })

  const deployBody = cleanDeep({ files, functions, draft: opts.draft })

  let deploy = await api.createSiteDeploy({ siteId, body: deployBody })
  const { id: deployId, required: requiredFiles, required_functions: requiredFns } = deploy

  statusCb({
    type: 'create-deploy',
    msg:
      `CDN requesting ${requiredFiles.length} files` +
      (Array.isArray(requiredFns) ? ` and ${requiredFns.length} functions` : ''),
    phase: 'stop'
  })

  const uploadList = getUploadList(requiredFiles, filesShaMap).concat(getUploadList(requiredFns, fnShaMap))

  await uploadFiles(api, deployId, uploadList, opts)

  statusCb({
    type: 'wait-for-deploy',
    msg: 'Waiting for deploy to go live...',
    phase: 'start'
  })
  deploy = await waitForDeploy(api, deployId, opts.deployTimeout)

  statusCb({
    type: 'wait-for-deploy',
    msg: opts.draft ? 'Draft deploy is live!' : 'Deploy is live!',
    phase: 'stop'
  })

  const deployManifest = {
    deployId,
    deploy,
    uploadList
  }
  return deployManifest
}
