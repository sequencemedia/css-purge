import processColor from './process-color.mjs'

export default function processHexColor (rule, OPTIONS, SUMMARY) {
  const { verbose: VERBOSE } = OPTIONS

  if (VERBOSE) console.log('Process - Hex Color')

  rule.declarations
    .forEach((declaration) => {
      const property = declaration.property
      if (
        property === 'color' ||
        property === 'font' ||
        property === 'font-color' ||
        property === 'background' ||
        property === 'background-color' ||
        property === 'outline' ||
        property === 'outline-color' ||
        property === 'border' ||
        property === 'border-color' ||
        property === 'border-top-color' ||
        property === 'border-right-color' ||
        property === 'border-bottom-color' ||
        property === 'border-left-color' ||
        property === 'border-top' ||
        property === 'border-right' ||
        property === 'border-bottom' ||
        property === 'border-left' ||
        property === 'box-shadow' ||
        property === 'text-shadow'
      ) {
        const value = declaration.value
        if (value && !value.includes('Microsoft')) {
          declaration.value = processColor(value, declaration, rule, OPTIONS, SUMMARY)
        }
      }
    })
}
