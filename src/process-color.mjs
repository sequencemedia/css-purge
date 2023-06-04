import cliColor from 'cli-color'

import colors from './colors.mjs'
import extendedColors from './extended-colors.mjs'

import hslToRgb from './utils/hsl-to-rgb.mjs'
import componentFromString from './utils/component-from-string.mjs'

const success = cliColor.greenBright

export default function processColor (valueIn, selectors = [], options, summary) {
  if (valueIn) {
    let hasChanged = false
    let colorIndex = 0

    // named
    if (options.shorten_hexcolor_extended_names || options.shorten) {
      for (const key in extendedColors) {
        colorIndex = valueIn.toLowerCase().indexOf(key, colorIndex)

        while (colorIndex > -1) {
          const regExp = new RegExp(key + "(?![\"\'.a-zA-Z0-9_-])", 'g') // global for multiple colors e.g. gradient

          const valueInBefore = valueIn
          valueIn = valueIn.replace(regExp, (capture) => {
            capture = capture.trim()
            return (
              (capture.charAt(0) === '(' ? '(' : '') +
              ((options.shorten_hexcolor_UPPERCASE) ? extendedColors[key].toUpperCase() : extendedColors[key]) +
              (capture.substring(capture.length - 1, capture.length) === ',' ? ',' : '') +
              (capture.substring(capture.length - 1, capture.length) === ')' ? ')' : '')
            )
          }).trim()

          colorIndex = valueIn.toLowerCase().indexOf(regExp, colorIndex)

          if (valueInBefore !== valueIn) {
            hasChanged = true

            summary.stats.summary.noNamedColorsShortened += 1

            if (options.verbose) { console.log(success('Process - Values - Named Color : ' + (selectors ? selectors.join(', ') : ''))) }
          }
        }

        colorIndex = 0
      }
    }

    for (const key in colors) {
      colorIndex = valueIn.toLowerCase().indexOf(key, colorIndex)

      while (colorIndex > -1) {
        const regExp = new RegExp(key + "(?![\"\'.a-zA-Z0-9_-])", 'g') // global for multiple colors e.g. gradient

        const valueInBefore = valueIn
        valueIn = valueIn.replace(regExp, (capture) => {
          capture = capture.trim()
          return (
            (capture.charAt(0) === '(' ? '(' : '') +
            ((options.shorten_hexcolor_UPPERCASE) ? colors[key].toUpperCase() : colors[key]) +
            (capture.substring(capture.length - 1, capture.length) === ',' ? ',' : '') +
            (capture.substring(capture.length - 1, capture.length) === ')' ? ')' : '')
          )
        }).trim()

        colorIndex = valueIn.toLowerCase().indexOf(regExp, colorIndex)

        if (valueInBefore !== valueIn) {
          hasChanged = true

          summary.stats.summary.noNamedColorsShortened += 1

          if (options.verbose) { console.log(success('Process - Values - Named Color : ' + (selectors ? selectors.join(', ') : ''))) }
        }
      }

      colorIndex = 0
    }

    if (!hasChanged) {
      // rgb to hex
      const rgb = /(rgb)[(]\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*(?:,\s*([\d.]+)\s*)?[)]/g.exec(valueIn)
      if (rgb) {
        const cr = componentFromString(rgb[2], 255)
        const cg = componentFromString(rgb[3], 255)
        const cb = componentFromString(rgb[4], 255)

        valueIn = '#' + ((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)
        summary.stats.summary.noRGBColorsShortened += 1

        if (options.shorten_hexcolor_UPPERCASE) {
          valueIn = valueIn.toUpperCase()
        }
        if (options.verbose) { console.log(success('Process - Values - RGB Color : ' + (selectors ? selectors.join(', ') : ''))) }
      }

      // hsl to hex
      const hsl = /(hsl)[(]\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*(?:,\s*([\d.]+)\s*)?[)]$/.exec(valueIn)
      if (hsl) {
        const ch = componentFromString(hsl[2], 360)
        const cs = componentFromString(hsl[3], 100)
        const cl = componentFromString(hsl[4], 100)

        const [
          cr,
          cg,
          cb
        ] = hslToRgb(ch / 360, cs / 100, cl / 100)

        valueIn = '#' + ((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)
        summary.stats.summary.noHSLColorsShortened += 1

        if (options.shorten_hexcolor_UPPERCASE) {
          valueIn = valueIn.toUpperCase()
        }

        if (options.verbose) { console.log(success('Process - Values - HSL Color : ' + (selectors ? selectors.join(', ') : ''))) }
      }

      // hex
      const hex = /#(.)\1\1\1\1\1/.exec(valueIn)
      if (hex) { // #aaaaaa
        valueIn = valueIn.replace(hex[0], hex[0].substring(0, 4)) // #aaa
        summary.stats.summary.noHexColorsShortened += 1

        if (options.shorten_hexcolor_UPPERCASE) {
          valueIn = valueIn.toUpperCase()
        }

        if (options.verbose) { console.log(success('Process - Values - Hex Color : ' + (selectors ? selectors.join(', ') : ''))) }
      }

      // hex pairs
      const hexPairs = /(#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2}))/.exec(valueIn)
      if (hexPairs) {
        if (
          hexPairs[2][0] === hexPairs[2][1] &&
          hexPairs[3][0] === hexPairs[3][1] &&
          hexPairs[4][0] === hexPairs[4][1]
        ) {
          valueIn = valueIn.replace(hexPairs[0], '#' + hexPairs[2][0] + hexPairs[3][0] + hexPairs[4][0]) // #aaa
          summary.stats.summary.noHexColorsShortened += 1

          if (options.shorten_hexcolor_UPPERCASE) {
            valueIn = valueIn.toUpperCase()
          }

          if (options.verbose) { console.log(success('Process - Values - Hex Color : ' + (selectors ? selectors.join(', ') : ''))) }
        }
      }
    }
  }

  return valueIn
}
