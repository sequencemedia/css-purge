import cliColor from 'cli-color'
import parseCssFont from 'parse-css-font'

const error = cliColor.red
const errorLine = cliColor.redBright

export default function getValueOfFontProp (font, prop, position) {
  if (font !== '') {
    try {
      const value = parseCssFont(font)[prop]
      return (
        value === 'normal'
          ? ''
          : value
      )
    } catch (e) {
      if (e.message.includes('Missing required font-size.')) {
        return 'check size'
      } else {
        if (e.message.includes('Missing required font-family.')) {
          return 'check family'
        } else {
          console.log(error('Error parsing font declaration'))
          console.log(errorLine('Source: ' + position.source))
          console.log(errorLine('Line: ' + position.start.line + ', column: ' + position.start.column))
          console.log(e)
          process.exit(1)
        }
      }
    }
  }

  return ''
}
