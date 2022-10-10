import { process } from 'process'

import { version } from '../package.json'

const isNode = function () {
  return typeof process === 'object'
}

const getBrowserName = function () {
  const { userAgent } = navigator
  let browserName = 'Unkown Browser'

  if (/chrome|chromium|crios/i.test(userAgent)) browserName = 'chrome'
  if (/firefox|fxios/i.test(userAgent)) browserName = 'firefox'
  if (/safari/i.test(userAgent)) browserName = 'safari'
  if (/opr/i.test(userAgent)) browserName = 'opera'
  if (/edg/i.test(userAgent)) browserName = 'edge'

  return browserName
}

const getBrowserPlatormData = function () {
  const browserName = getBrowserName()
  const { appVersion } = navigator

  let OSName = 'Unknown OS'

  if (appVersion.includes('Win')) OSName = 'Windows'
  if (appVersion.includes('Mac')) OSName = 'MacOS'
  if (appVersion.includes('X11')) OSName = 'UNIX'
  if (appVersion.includes('Linux')) OSName = 'Linux'

  return { os: OSName, runtime: browserName, runtimeVersion: appVersion }
}

const getNodePlatformData = function () {
  const { platform } = process
  const {
    versions: { node: runtimeVersion },
  } = process

  let OSName = platform

  if (platform === 'darwin') OSName = 'MacOS'
  if (platform.includes('win')) OSName = 'Windows'

  return { os: OSName, runtime: 'nodeJS', runtimeVersion }
}

export const getUserAgent = function () {
  const packageVersion = version
  const platformData = isNode() ? getNodePlatformData() : getBrowserPlatormData()
  const { os, runtime, runtimeVersion } = platformData

  return `netlify/js-client ${packageVersion}; ${runtime} version ${runtimeVersion}; OS: ${os}`
}
