import cliColor from 'cli-color'

const success = cliColor.greenBright

export default function processZero (rule, OPTIONS, SUMMARY) {
  const {
    zero_ignore_declaration: ZERO_IGNORE_DECLARATION,
    zero_units: ZERO_UNITS,
    verbose: VERBOSE
  } = OPTIONS

  if (VERBOSE) console.log('Process - Zero')

  rule.declarations
    .forEach((declaration) => {
      if (!ZERO_IGNORE_DECLARATION.includes(declaration.property)) {
        let value = declaration.value

        // leading zeros 000
        if (value.match(/[^#]\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm)) {
          value = value.replace(/\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm, '') // remove single duplicate 0

          SUMMARY.stats.summary.noZerosShortened += 1

          if (VERBOSE) { console.log(success('Process - Values - Zero : ' + rule.selectors.join(', '))) }
        }

        // 0px, 0em, etc.
        if (value.startsWith('0') && (ZERO_UNITS.includes(value.substring(1, value.length)))) {
          value = '0'

          SUMMARY.stats.summary.noZerosShortened += 1

          if (VERBOSE) { console.log(success('Process - Values - Zero : ' + rule.selectors.join(', '))) }
        }

        declaration.value = value
      }
    })
}
