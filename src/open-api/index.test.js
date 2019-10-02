const test = require('ava')

const { methods } = require('./index')

test('Exported methods', t => {
  t.snapshot(methods)
})
