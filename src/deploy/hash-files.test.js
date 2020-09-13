const path = require('path')

const test = require('ava')

const hashFiles = require('./hash-files')
const { defaultFilter } = require('./util')

test('hashes files in a folder', async t => {
  const { files, filesShaMap } = await hashFiles(__dirname, path.resolve(__dirname, '../../fixtures/netlify.toml'), {
    filter: filePath => defaultFilter(filePath)
  })
  t.truthy(files['netlify.toml'], 'includes the netlify.toml file')
  Object.keys(files).forEach(path => t.truthy(path, 'each file has a path'))
  t.truthy(filesShaMap, 'filesShaMap is returned')
  Object.values(filesShaMap).forEach(fileObjArray =>
    fileObjArray.forEach(fileObj => t.truthy(fileObj.normalizedPath, 'fileObj have a normalizedPath field'))
  )
})
