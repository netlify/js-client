const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  rules: {
    // TODO: enable those rules
    complexity: 0,
    'max-statements': 0,
    'fp/no-let': 0,
    'fp/no-loops': 0,
    'fp/no-mutation': 0,
    'promise/no-callback-in-promise': 0,
    'promise/prefer-await-to-callbacks': 0,
  },
  overrides: [...overrides],
}
