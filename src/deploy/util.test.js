const { join } = require('path')

const test = require('ava')

const { normalizePath, defaultFilter } = require('./util')

test('normalizes relative file paths', (t) => {
  const input = join('foo', 'bar', 'baz.js')
  t.is(normalizePath(input), 'foo/bar/baz.js')
})

test('normalizePath should throw the error if name is invalid', (t) => {
  t.throws(() => normalizePath('invalid name#'))
  t.throws(() => normalizePath('invalid name?'))
  t.throws(() => normalizePath('??'))
  t.throws(() => normalizePath('#'))
})

test('pass empty name to defaultFilter', (t) => {
  const cases = [
    {
      input: null,
      expect: false,
    },
    {
      input: undefined,
      expect: false,
    },
    {
      input: 'foo/bar/baz.js',
      expect: true,
    },
    {
      input: 'directory/node_modules',
      expect: false,
    },
    {
      input: 'directory/.gitignore',
      expect: false,
    },
    {
      input: 'directory/.well-known',
      expect: true,
    },
    {
      input: '__MACOSX',
      expect: true,
    },
  ]
  cases.forEach(({ input, expect }) => {
    t.is(defaultFilter(input), expect)
  })
})
