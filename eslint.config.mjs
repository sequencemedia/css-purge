import merge from '@sequencemedia/eslint-config-standard/merge'
import parser from '@babel/eslint-parser'
import globals from 'globals'

export default (
  merge({
    files: [
      '**/*.{cjs,mjs}'
    ],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        fetch: 'readonly',
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-useless-escape': 'warn'
    }
  })
)
