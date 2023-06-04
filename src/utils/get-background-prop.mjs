import extendedColors from '../extended-colors.mjs'
import colors from '../colors.mjs'

export default function getBackgroundProp (background, prop) {
  console.log({ prop })

  switch (prop) {
    case 'image':
    {
      const value = background.match(/(url\()(.*)(\))|\bnone\b/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'repeat':
    {
      const value = background.match(/\brepeat-x\b|\brepeat-y\b|(\brepeat|\bspace\b|\bround\b|\bno-repeat\b){1,2}/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'attachment':
    {
      const value = background.match(/\bscroll\b|\bfixed\b|\blocal\b/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'position':
    {
      let value1 = null
      let value2 = ''

      if (background.includes('#')) {
        value1 = background.match(/(\bleft\b|\bcenter\b|\bright\b|\btop\b|\bbottom\b|\b0\b|((([0-9][.]?)+(pt|pc|px|in|cm|mm|q|cap|em|ex|rem|ic|lh|rlh|vh|vw|vi|vb|vmin|vmax))|(([0-9][.]?)+%)))|((\bleft\b|\bcenter\b|\bright\b|\b0\b|((([0-9][.]?)+(pt|pc|px|in|cm|mm|q|cap|em|ex|rem|ic|lh|rlh|vh|vw|vi|vb|vmin|vmax))|(([0-9][.]?)+%))) (\btop\b|\bcenter\b|\bbottom\b|\b0\b|((([0-9][.]?)+(pt|pc|px|in|cm|mm|q|cap|em|ex|rem|ic|lh|rlh|vh|vw|vi|vb|vmin|vmax))|(([0-9][.]?)+%))))|(\bcenter\b|(\bleft\b|\bright\b \b0\b|((([0-9][.]?)+(pt|pc|px|in|cm|mm|q|cap|em|ex|rem|ic|lh|rlh|vh|vw|vi|vb|vmin|vmax))|(([0-9][.]?)+%))))(\bcenter\b|(\btop\b|\bbottom\b \b0\b|((([0-9][.]?)+(pt|pc|px|in|cm|mm|q|cap|em|ex|rem|ic|lh|rlh|vh|vw|vi|vb|vmin|vmax))|(([0-9][.]?)+%))))/g)
      }

      console.log({ value1 })

      if (value1 !== null) { // Array.isArray(value1) ?
        for (const key in value1) {
          if (value1[key] === '0') {
            value2 += value1[key] + ' '
          }
        }

        if (value2 !== '') {
          return value2.trim()
        }

        return value1.shift()
      }

      return ''
    }
    case 'color':
    {
      // check for hex, rgb, hsl
      const value = background.match(/\btransparent\b|(#(?:[0-9a-f]{2}){2,4}|(#[0-9a-f]{3})|(rgb|hsl)a?\((-?\d+%?[,\s]+){2,3}\s*[\d\.]+%?\))/i)
      if (Array.isArray(value)) {
        return value.shift()
      }

      // check extended colors
      for (const color in extendedColors) {
        const regExp = new RegExp(`(^|[^\"\'.a-z0-9_-])${color}([^\"\'.a-z0-9_-]|$)`)
        if (background.match(regExp)) {
          return color
        }
      }

      // check normal colors
      for (const color in colors) {
        const regExp = new RegExp(`(^|[^\"\'.a-z0-9_-])${color}([^\"\'.a-z0-9_-]|$)`)
        if (background.match(regExp)) {
          return color
        }
      }

      return ''
    }
    default:
      return ''
  }
}
