const test = require('ava')
const { normalizePath, defaultFilter } = require('./util')

test('normalizes relative file paths', t => {
  const cases = [
    {
      input: 'foo/bar/baz.js',
      expect: 'foo/bar/baz.js',
      msg: 'relative paths are normalized',
      skip: process.platform === 'win32'
    },
    {
      input: 'beep\\impl\\bbb',
      expect: 'beep/impl/bbb',
      msg: 'relative windows paths are normalized',
      skip: process.platform !== 'win32'
    }
  ]

  cases.forEach(c => {
    if (c.skip) return
    t.is(normalizePath(c.input), c.expect, c.msg)
  })
})

test('normalizePath should throw the error if name is invalid', t => {
  t.throws(() => normalizePath('invalid name#'))
  t.throws(() => normalizePath('invalid name?'))
  t.throws(() => normalizePath('??'))
  t.throws(() => normalizePath('#'))
})

test('pass empty name to defaultFilter', t => {
  const cases = [
    {
      input: null,
      expect: false
    },
    {
      input: undefined,
      expect: false
    },
    {
      input: 'foo/bar/baz.js',
      expect: true
    },
    {
      input: 'directory/node_modules',
      expect: false
    },
    {
      input: 'directory/.gitignore',
      expect: false
    },
    {
      input: 'directory/.well-known',
      expect: true
    },
    {
      input: '__MACOSX',
      expect: true
    }
  ]
  cases.forEach(c => t.is(defaultFilter(c.input), c.expect))
})
