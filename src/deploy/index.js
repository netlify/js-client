const { promisify } = require('util')

const cleanDeep = require('clean-deep')
const rimraf = promisify(require('rimraf'))
const tempy = require('tempy')

const hashFiles = require('./hash-files')
const hashFns = require('./hash-fns')
const uploadFiles = require('./upload-files')
const { waitForDiff } = require('./util')
const { waitForDeploy, getUploadList, defaultFilter } = require('./util')

module.exports = async (api, siteId, dir, opts) => {
  opts = Object.assign(
    {
      fnDir: null,
      configPath: null,
      draft: false,
      message: undefined, // API calls this the 'title'
      tmpDir: tempy.directory(),
      deployTimeout: 1.2e6, // local deploy timeout: 20 mins
      concurrentHash: 100, // concurrent file hash calls
      concurrentUpload: 15, // Number of concurrent uploads
      filter: defaultFilter,
      syncFileLimit: 7000, // number of files
      maxRetry: 5, // number of times to retry an upload
      statusCb: () => {
        /* default to noop */
        /* statusObj: {
            type: name-of-step
            msg: msg to print
            phase: [start, progress, stop],
            spinner: a spinner from cli-spinners package
        } */
      }
    },
    opts
  )

  const { fnDir, configPath, statusCb, message: title } = opts

  statusCb({
    type: 'hashing',
    msg: `Hashing files...`,
    phase: 'start'
  })

  const [{ files, filesShaMap }, { functions, fnShaMap }] = await Promise.all([
    hashFiles(dir, configPath, opts),
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

  const deployParams = cleanDeep({
    siteId,
    title,
    body: {
      files,
      functions,
      async: Object.keys(files).length > opts.syncFileLimit,
      branch: opts.branch,
      draft: opts.draft
    }
  })

  let deploy = await api.createSiteDeploy(deployParams)
  if (deployParams.body.async) deploy = await waitForDiff(api, deploy.id, siteId, opts.deployTimeout)

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
  deploy = await waitForDeploy(api, deployId, siteId, opts.deployTimeout)

  statusCb({
    type: 'wait-for-deploy',
    msg: opts.draft ? 'Draft deploy is live!' : 'Deploy is live!',
    phase: 'stop'
  })

  await rimraf(opts.tmpDir)

  const deployManifest = {
    deployId,
    deploy,
    uploadList
  }
  return deployManifest
}
