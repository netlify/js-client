const { promisify } = require('util')

const cleanDeep = require('clean-deep')
const rimraf = promisify(require('rimraf'))
const tempy = require('tempy')

const {
  DEFAULT_DEPLOY_TIMEOUT,
  DEFAULT_CONCURRENT_HASH,
  DEFAULT_CONCURRENT_UPLOAD,
  DEFAULT_SYNC_LIMIT,
  DEFAULT_MAX_RETRY,
} = require('./constants')
const hashFiles = require('./hash_files')
const hashFns = require('./hash_fns')
const uploadFiles = require('./upload_files')
const { waitForDiff, waitForDeploy, getUploadList, defaultFilter } = require('./util')

const deploySite = async (
  api,
  siteId,
  dir,
  {
    fnDir = null,
    configPath = null,
    draft = false,
    // API calls this the 'title'
    message: title,
    tmpDir = tempy.directory(),
    deployTimeout = DEFAULT_DEPLOY_TIMEOUT,
    concurrentHash = DEFAULT_CONCURRENT_HASH,
    concurrentUpload = DEFAULT_CONCURRENT_UPLOAD,
    filter = defaultFilter,
    syncFileLimit = DEFAULT_SYNC_LIMIT,
    maxRetry = DEFAULT_MAX_RETRY,
    statusCb = () => {
      /* default to noop */
      // statusObj: {
      //     type: name-of-step
      //     msg: msg to print
      //     phase: [start, progress, stop],
      //     spinner: a spinner from cli-spinners package
      // }
    },
    deployId: deployIdOpt = null,
    hashAlgorithm,
    assetType,
    branch,
  } = {},
) => {
  statusCb({
    type: 'hashing',
    msg: `Hashing files...`,
    phase: 'start',
  })

  const [{ files, filesShaMap }, { functions, fnShaMap }] = await Promise.all([
    hashFiles(dir, configPath, { concurrentHash, hashAlgorithm, assetType, statusCb, filter }),
    hashFns(fnDir, { tmpDir, concurrentHash, hashAlgorithm, statusCb, assetType }),
  ])

  const filesCount = Object.keys(files).length
  const functionsCount = Object.keys(functions).length

  statusCb({
    type: 'hashing',
    msg: `Finished hashing ${filesCount} files${fnDir ? ` and ${functionsCount} functions` : ''}`,
    phase: 'stop',
  })

  if (filesCount === 0 && functionsCount === 0) {
    throw new Error('No files or functions to deploy')
  }

  statusCb({
    type: 'create-deploy',
    msg: 'CDN diffing files...',
    phase: 'start',
  })

  let deploy
  let deployParams = cleanDeep({
    siteId,
    body: {
      files,
      functions,
      async: Object.keys(files).length > syncFileLimit,
      branch,
      draft,
    },
  })
  if (deployIdOpt === null) {
    if (title) {
      deployParams = { ...deployParams, title }
    }
    deploy = await api.createSiteDeploy(deployParams)
  } else {
    deployParams = { ...deployParams, deploy_id: deployIdOpt }
    deploy = await api.updateSiteDeploy(deployParams)
  }

  if (deployParams.body.async) deploy = await waitForDiff(api, deploy.id, siteId, deployTimeout)

  const { id: deployId, required: requiredFiles, required_functions: requiredFns } = deploy

  statusCb({
    type: 'create-deploy',
    msg: `CDN requesting ${requiredFiles.length} files${
      Array.isArray(requiredFns) ? ` and ${requiredFns.length} functions` : ''
    }`,
    phase: 'stop',
  })

  const uploadList = getUploadList(requiredFiles, filesShaMap).concat(getUploadList(requiredFns, fnShaMap))

  await uploadFiles(api, deployId, uploadList, { concurrentUpload, statusCb, maxRetry })

  statusCb({
    type: 'wait-for-deploy',
    msg: 'Waiting for deploy to go live...',
    phase: 'start',
  })
  deploy = await waitForDeploy(api, deployId, siteId, deployTimeout)

  statusCb({
    type: 'wait-for-deploy',
    msg: draft ? 'Draft deploy is live!' : 'Deploy is live!',
    phase: 'stop',
  })

  await rimraf(tmpDir)

  const deployManifest = {
    deployId,
    deploy,
    uploadList,
  }
  return deployManifest
}

module.exports = deploySite
