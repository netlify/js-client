const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'import/extensions': [2, 'ignorePackages'],
    // TODO: enable those rules
    complexity: 0,
    'max-statements': 0,
    'fp/no-let': 0,
    'fp/no-mutation': 0,
  },
  overrides: [...overrides],
}
