const path = require('path')

const flatten = require('lodash.flatten')
const pWaitFor = require('p-wait-for')

// Default filter when scanning for files
const defaultFilter = (filename) => {
  if (filename == null) return false
  const n = path.basename(filename)
  switch (true) {
    case n === 'node_modules':
    case n.startsWith('.') && n !== '.well-known':
    case n.match(/(\/__MACOSX|\/\.)/):
      return false
    default:
      return true
  }
}

// normalize windows paths to unix paths
const normalizePath = (relname) => {
  if (relname.includes('#') || relname.includes('?')) {
    throw new Error(`Invalid filename ${relname}. Deployed filenames cannot contain # or ? characters`)
  }
  return (
    relname
      .split(path.sep)
      // .map(segment => encodeURI(segment)) // TODO I'm fairly certain we shouldn't encodeURI here, thats only for the file upload step
      .join('/')
  )
}

// poll an async deployId until its done diffing
const waitForDiff = async (api, deployId, siteId, timeout) => {
  let deploy // capture ready deploy during poll

  const loadDeploy = async () => {
    const d = await api.getSiteDeploy({ siteId, deployId })

    switch (d.state) {
      // https://github.com/netlify/bitballoon/blob/master/app/models/deploy.rb#L21-L33
      case 'error': {
        const deployError = new Error(`Deploy ${deployId} had an error`)
        deployError.deploy = d
        throw deployError
      }
      case 'prepared':
      case 'uploading':
      case 'uploaded':
      case 'ready': {
        deploy = d
        return true
      }
      case 'preparing':
      default: {
        return false
      }
    }
  }

  await pWaitFor(loadDeploy, {
    interval: 1000,
    timeout,
    message: 'Timeout while waiting for deploy',
  })

  return deploy
}

// Poll a deployId until its ready
const waitForDeploy = async (api, deployId, siteId, timeout) => {
  let deploy // capture ready deploy during poll

  const loadDeploy = async () => {
    const d = await api.getSiteDeploy({ siteId, deployId })
    switch (d.state) {
      // https://github.com/netlify/bitballoon/blob/master/app/models/deploy.rb#L21-L33
      case 'error': {
        const deployError = new Error(`Deploy ${deployId} had an error`)
        deployError.deploy = d
        throw deployError
      }
      case 'ready': {
        deploy = d
        return true
      }
      case 'preparing':
      case 'prepared':
      case 'uploaded':
      case 'uploading':
      default: {
        return false
      }
    }
  }

  await pWaitFor(loadDeploy, {
    interval: 1000,
    timeout,
    message: 'Timeout while waiting for deploy',
  })

  return deploy
}

// Transform the fileShaMap and fnShaMap into a generic shaMap that file-uploader.js can use
const getUploadList = (required, shaMap) => {
  if (!required || !shaMap) return []
  return flatten(required.map((sha) => shaMap[sha]))
}

module.exports = {
  defaultFilter,
  normalizePath,
  waitForDiff,
  waitForDeploy,
  getUploadList,
}
