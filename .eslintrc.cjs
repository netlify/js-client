const { overrides } = require('@netlify/eslint-config-node/.eslintrc_esm.cjs')

module.exports = {
  extends: '@netlify/eslint-config-node/.eslintrc_esm.cjs',
  overrides: [...overrides],
}
