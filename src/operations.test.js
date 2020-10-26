const test = require('ava')

const { getOperations } = require('./operations')

test('Exported methods', (t) => {
  t.snapshot(getOperations())
})
