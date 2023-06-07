import cliColor from 'cli-color'

import colors from './colors.mjs'
import extendedColors from './extended-colors.mjs'

import hslToRgb from './utils/hsl-to-rgb.mjs'
import componentFromString from './utils/component-from-string.mjs'

const success = cliColor.greenBright

function getReduceColor (declaration, rule, OPTIONS, SUMMARY) {
  const {
    value: VALUE
  } = declaration

  const {
    shorten_hexcolor_uppercase: SHORTEN_HEXCOLOR_UPPERCASE,
    verbose: VERBOSE
  } = OPTIONS

  const {
    stats: {
      summary: collector
    }
  } = SUMMARY

  return function reduceColor ({ value, hasChanged }, [key, colorValue]) {
    let colorIndex = value.toLowerCase().indexOf(key)

    while (colorIndex > -1) {
      const regExp = new RegExp(key + "(?![\"\'.a-zA-Z0-9_-])", 'g') // global for multiple colors e.g. gradient

      const was = value
      const now = was.replace(regExp, (capture) => {
        capture = capture.trim()
        return (
          (capture.startsWith('(') ? '(' : '') +
          (SHORTEN_HEXCOLOR_UPPERCASE ? colorValue.toUpperCase() : colorValue) +
          (capture.endsWith(',') ? ',' : capture.endsWith(')') ? ')' : '')
        )
      }).trim()
      value = now

      colorIndex = value.toLowerCase().indexOf(regExp, colorIndex)

      if (was !== now) {
        collector.noNamedColorsShortened += 1

        if (VERBOSE) { console.log(success('Process - Values - Named Color : ' + (rule.selectors.join(', ')))) }
      }
    }

    return {
      hasChanged: hasChanged || value !== VALUE,
      value
    }
  }
}

function processRgbColor (value, declaration, rule, OPTIONS, SUMMARY) {
  // rgb to hex
  const rgb = /(rgb)[(]\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*(?:,\s*([\d.]+)\s*)?[)]/g.exec(value)
  if (rgb) {
    const {
      shorten_hexcolor_uppercase: SHORTEN_HEXCOLOR_UPPERCASE,
      verbose: VERBOSE
    } = OPTIONS

    const {
      stats: {
        summary: collector = {}
      }
    } = SUMMARY

    const cr = componentFromString(rgb[2], 255)
    const cg = componentFromString(rgb[3], 255)
    const cb = componentFromString(rgb[4], 255)

    value = '#' + ((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)
    collector.noRGBColorsShortened += 1

    if (SHORTEN_HEXCOLOR_UPPERCASE) value = value.toUpperCase()

    if (VERBOSE) { console.log(success('Process - Values - RGB Color : ' + (rule.selectors.join(', ')))) }
  }

  return value
}

function processHslColor (value, declaration, rule, OPTIONS, SUMMARY) {
  // hsl to hex
  const hsl = /(hsl)[(]\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*,\s*([\d.]+\s*%?)\s*(?:,\s*([\d.]+)\s*)?[)]$/.exec(value)
  if (hsl) {
    const {
      shorten_hexcolor_uppercase: SHORTEN_HEXCOLOR_UPPERCASE,
      verbose: VERBOSE
    } = OPTIONS

    const {
      stats: {
        summary: collector = {}
      }
    } = SUMMARY

    const ch = componentFromString(hsl[2], 360)
    const cs = componentFromString(hsl[3], 100)
    const cl = componentFromString(hsl[4], 100)

    const [
      cr,
      cg,
      cb
    ] = hslToRgb(ch / 360, cs / 100, cl / 100)

    value = '#' + ((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)
    collector.noHSLColorsShortened += 1

    if (SHORTEN_HEXCOLOR_UPPERCASE) value = value.toUpperCase()

    if (VERBOSE) { console.log(success('Process - Values - HSL Color : ' + (rule.selectors.join(', ')))) }
  }

  return value
}

function processHexColor (value, declaration, rule, OPTIONS, SUMMARY) {
  // hex
  const hex = /#(.)\1\1\1\1\1/.exec(value)
  if (hex) { // #aaaaaa
    const {
      shorten_hexcolor_uppercase: SHORTEN_HEXCOLOR_UPPERCASE,
      verbose: VERBOSE
    } = OPTIONS

    const {
      stats: {
        summary: collector = {}
      }
    } = SUMMARY

    value = value.replace(hex[0], hex[0].substring(0, 4)) // #aaa
    collector.noHexColorsShortened += 1

    if (SHORTEN_HEXCOLOR_UPPERCASE) value = value.toUpperCase()

    if (VERBOSE) { console.log(success('Process - Values - Hex Color : ' + (rule.selectors.join(', ')))) }
  }

  return value
}

function processHexColorPairs (value, declaration, rule, OPTIONS, SUMMARY) {
  // hex pairs
  const hexPairs = /(#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2}))/.exec(value)
  if (hexPairs) {
    if (
      hexPairs[2][0] === hexPairs[2][1] &&
      hexPairs[3][0] === hexPairs[3][1] &&
      hexPairs[4][0] === hexPairs[4][1]
    ) {
      const {
        shorten_hexcolor_uppercase: SHORTEN_HEXCOLOR_UPPERCASE,
        verbose: VERBOSE
      } = OPTIONS

      const {
        stats: {
          summary: collector = {}
        }
      } = SUMMARY

      value = value.replace(hexPairs[0], '#' + hexPairs[2][0] + hexPairs[3][0] + hexPairs[4][0]) // #aaa
      collector.noHexColorsShortened += 1

      if (SHORTEN_HEXCOLOR_UPPERCASE) value = value.toUpperCase()

      if (VERBOSE) { console.log(success('Process - Values - Hex Color : ' + (rule.selectors.join(', ')))) }
    }
  }

  return value
}

export default function processColor (value, declaration, rule, OPTIONS, SUMMARY) {
  const { verbose: VERBOSE } = OPTIONS

  if (VERBOSE) console.log('Process - Color')

  if (value) {
    let hasChanged = false

    if (OPTIONS.shorten_hexcolor_extended || OPTIONS.shorten) {
      ({
        hasChanged,
        value
      } = Object
        .entries(extendedColors)
        .reduce(getReduceColor(declaration, rule, OPTIONS, SUMMARY), {
          hasChanged,
          value
        }))
    }

    if (OPTIONS.shorten_hexcolor || OPTIONS.shorten) {
      ({
        hasChanged,
        value
      } = Object
        .entries(colors)
        .reduce(getReduceColor(declaration, rule, OPTIONS, SUMMARY), {
          value,
          hasChanged
        }))
    }

    if (!hasChanged) {
      value = processRgbColor(value, declaration, rule, OPTIONS, SUMMARY)

      value = processHslColor(value, declaration, rule, OPTIONS, SUMMARY)

      value = processHexColor(value, declaration, rule, OPTIONS, SUMMARY)

      value = processHexColorPairs(value, declaration, rule, OPTIONS, SUMMARY)
    }
  }

  return value
}
