import debug from 'debug'

const log = debug('@sequencemedia/css-purge/process-zero')

function getUnit (value) {
  return value.substring(1)
}

export default function processZero (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  const {
    zero_ignore_declaration: ZERO_IGNORE_DECLARATION,
    zero_units: ZERO_UNITS
  } = OPTIONS

  declarations
    .forEach((declaration) => {
      if (!ZERO_IGNORE_DECLARATION.includes(declaration.property)) {
        let value = declaration.value

        // leading zeros 000
        if (value.match(/[^#]\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm)) {
          value = value.replace(/\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm, '') // remove single duplicate 0

          SUMMARY.stats.summary.noZerosShortened += 1

          const {
            selectors = []
          } = rule

          log(selectors) // .join(', ').trim())
        }

        // 0px, 0em, etc.
        if (value.startsWith('0') && ZERO_UNITS.includes(getUnit(value))) {
          value = '0'

          SUMMARY.stats.summary.noZerosShortened += 1

          const {
            selectors = []
          } = rule

          log(selectors) // .join(', ').trim())
        }

        declaration.value = value
      }
    })
}
