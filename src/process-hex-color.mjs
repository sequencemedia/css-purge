import processColor from './process-color.mjs'

export default function processHexColor (rule, OPTIONS, summary) {
  const { verbose: VERBOSE } = OPTIONS

  if (VERBOSE) console.log('Process - Hex Color')

  rule.declarations
    .forEach((declarations) => {
      const property = declarations.property
      if (
        property == 'color' ||
        property == 'font' ||
        property == 'font-color' ||
        property == 'background' ||
        property == 'background-color' ||
        property == 'outline-color' ||
        property == 'box-shadow' ||
        property == 'text-shadow' ||
        property == 'border-color' ||
        property == 'border-top-color' ||
        property == 'border-right-color' ||
        property == 'border-bottom-color' ||
        property == 'border-left-color' ||
        property == 'border' ||
        property == 'border-top' ||
        property == 'border-right' ||
        property == 'border-bottom' ||
        property == 'border-left'
      ) {
        const value = declarations.value
        if (value && !value.includes('Microsoft')) {
          declarations.value = processColor(value, rule.selectors, OPTIONS, summary)
        }
      }
    })
}
