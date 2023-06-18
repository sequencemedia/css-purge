import parseCssFont from 'parse-css-font'

import {
  handleCssParseFontError
} from '#utils/errors'

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
