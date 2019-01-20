const set = require('lodash.set')

exports.sortParams = (parameters = []) => {
  const paramSet = {
    // minimum param set
    path: {},
    query: {},
    body: {}
  }

  parameters.forEach(param => {
    set(paramSet, `${param.in}.${param.name}`, param)
  })

  return paramSet
}

exports.mergeParams = (...params) => {
  const merged = {}

  params.forEach(paramSet => {
    Object.entries(paramSet).forEach(([type, params]) => {
      if (!merged[type]) merged[type] = {} // preserve empty objects
      Object.values(params).forEach((param, index) => {
        set(merged, `${param.in}.${param.name}`, Object.assign(param, { index }))
      })
    })
  })

  return merged
}

exports.existy = val => val != null

// Async sleep.  A whole new WORLD!
exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

exports.unixNow = () => Math.floor(new Date() / 1000)
