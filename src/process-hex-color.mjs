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

export default function processHexColor (rule, OPTIONS, SUMMARY) {
  const {
    verbose: VERBOSE
  } = OPTIONS

  if (VERBOSE) console.log('Process - Hex Color')

  rule.declarations
    .forEach((declaration) => {
      const property = declaration.property
      if (PROPERTIES.has(property)) {
        const value = declaration.value
        if (value && !value.toLowerCase().includes('microsoft')) {
          declaration.value = processColor(value, declaration, rule, OPTIONS, SUMMARY)
        }
      }
    })
}
