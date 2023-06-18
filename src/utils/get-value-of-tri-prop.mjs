import extendedColors from '#default-options/extended-colors' assert { type: 'json' }
import colors from '#default-options/colors' assert { type: 'json' }

export default function getValueOfTriProp (valueIn, prop) {
  switch (prop) {
    case 'type':
    {
      const value = valueIn.match(/\bnone\b|\bcircle\b|\bdisc\b|\bsquare\b|\barmenian\b|\bcjk-ideographic\b|\bdecimal\b|\bdecimal-leading-zero\b|\bgeorgian\b|\bhebrew\b|\bhiragana\b|\bhiragana-iroha\b|\bkatakana\b|\bkatakana-iroha\b|\blower-alpha\b|\blower-greek\b|\blower-latin\b|\blower-roman\b|\bupper-alpha\b|\bupper-greek\b|\bupper-latin\b|\bupper-roman\b/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'position':
    {
      const value = valueIn.match(/\binside\b|\boutside\b/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'image':
    {
      const value = valueIn.match(/(url\()(.*)(\))|\bnone\b/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'style':
    {
      const value = valueIn.match(/\bnone\b|\bhidden\b|\bdotted\b|\bdashed\b|\bsolid\b|\bdouble\b|\bgroove\b|\bridge\b|\binset\b|\boutset\b/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    case 'color':
    {
      // check for hex, rgb, hsl
      const value = valueIn.match(/\btransparent\b|(#(?:[0-9a-f]{2}){2,4}|(#[0-9a-f]{3})|(rgb|hsl)a?\((-?\d+%?[,\s]+){2,3}\s*[\d\.]+%?\))/i)
      if (Array.isArray(value)) {
        return value.shift()
      }

      // check extended colors
      for (const color in extendedColors) {
        const regExp = new RegExp(`(^|[^\"\'\.a-z0-9_-])${color}([^\"\'.a-z0-9_-]|$)`)
        if (valueIn.match(regExp)) {
          return color
        }
      }

      // check normal colors
      for (const color in colors) {
        const regExp = new RegExp(`(^|[^\"\'\.a-z0-9_-])${color}([^\"\'.a-z0-9_-]|$)`)
        if (valueIn.match(regExp)) {
          return color
        }
      }

      return ''
    }
    case 'width':
    {
      const value = valueIn.match(/\bmedium\b|\bthin\b|\bthick\b|\b0\b|(([0-9][.]?|[.][0-9]?)+(pt|pc|px|in|cm|mm|q|cap|em|ex|rem|ic|lh|rlh|vh|vw|vi|vb|vmin|vmax))/g)
      if (Array.isArray(value)) {
        return value.shift()
      }

      return ''
    }

    default:
      return ''
  }
}
