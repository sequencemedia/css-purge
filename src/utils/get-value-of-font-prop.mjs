import cliColor from 'cli-color'
import parseCssFont from 'parse-css-font'

const error = cliColor.red

function handleCssParseFontError (e, position) {
  console.log(error('Error parsing CSS font'))
  console.log('Source: ' + position.source)
  console.log('Line: ' + position.start.line)
  console.log('Column: ' + position.start.column)
  console.log(e)
  process.exit(1)
}

export default function getValueOfFontProp (font, property, position) {
  if (font) {
    try {
      const properties = parseCssFont(font)
      const value = properties[property]
      return (
        value === 'normal'
          ? ''
          : value
      )
    } catch (e) {
      const {
        message
      } = e

      const m = message.toLowerCase()

      if (m.includes('missing required font-size')) {
        return 'check size'
      } else {
        if (m.includes('missing required font-family')) {
          return 'check family'
        } else {
          handleCssParseFontError(e, position)
        }
      }
    }
  }

  return ''
}
