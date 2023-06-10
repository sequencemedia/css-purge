import debug from 'debug'

import processColor from './process-color.mjs'

const PROPERTIES = new Set([
  'color',
  'font',
  'font-color',
  'background',
  'background-color',
  'outline',
  'outline-color',
  'border',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'box-shadow',
  'text-shadow'
])

const log = debug('@sequencemedia/css-purge/process-hex-color')

export default function processHexColor (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  declarations
    .forEach((declaration) => {
      const property = declaration.property
      if (PROPERTIES.has(property)) {
        const value = declaration.value
        if (value && !value.toLowerCase().includes('microsoft')) {
          declaration.value = processColor(value, declaration, rule, OPTIONS, SUMMARY)

          const {
            selectors = []
          } = rule

          log(selectors) // .join(', ').trim())
        }
      }
    })
}
