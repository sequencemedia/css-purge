import cliColor from 'cli-color'

import filterForFont from './utils/filter-for-font.mjs'
import filterForFontFace from './utils/filter-for-font-face.mjs'
import filterForFontFamily from './utils/filter-for-font-family.mjs'
import filterForFontSize from './utils/filter-for-font-size.mjs'
import filterForFontStretch from './utils/filter-for-font-stretch.mjs'
import filterForFontStyle from './utils/filter-for-font-style.mjs'
import filterForFontVariant from './utils/filter-for-font-variant.mjs'
import filterForFontWeight from './utils/filter-for-font-weight.mjs'
import filterForLineHeight from './utils/filter-for-line-height.mjs'

import hasInherit from './utils/has-inherit.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import toPosition from './utils/to-position.mjs'
import getValueOfFontProp from './utils/get-value-of-font-prop.mjs'
import formatFontFamily from './utils/format-font-family.mjs'

/**
 *  Retain order
 */
const DEFAULT_FONT_PROPS = [
  'font-style',
  'font-variant',
  'font-weight',
  'font-stretch',
  'font-size',
  'line-height',
  'font-family'
]

function getTransformFontSize (px) {
  return function transformFontSize (declaration) {
    let value = declaration.value.toLowerCase()

    if (value.endsWith('px')) {
      value = (Number(value.substring(0, value.length - 2)) / px) + 'rem'
      declaration.value = value
    }
  }
}

function transformFontWeight (declaration) {
  let value = declaration.value

  switch (value.toLowerCase()) {
    case 'thin':
    case 'hairline':
      value = '100'
      break
    case 'extra light':
    case 'ultra light':
      value = '200'
      break
    case 'light':
      value = '300'
      break
    case 'normal':
      value = '400'
      break
    case 'medium':
      value = '500'
      break
    case 'semi bold':
    case 'demi bold':
      value = '600'
      break
    case 'bold':
      value = '700'
      break
    case 'extra bold':
    case 'ultra bold':
      value = '800'
      break
    case 'black':
    case 'heavy':
      value = '900'
      break
  }

  declaration.value = value
}

function transformFontFamily (declaration) {
  declaration.value = formatFontFamily(declaration.value)
}

const success = cliColor.greenBright
const error = cliColor.red
const errorLine = cliColor.redBright

export default function processFont (rule, OPTIONS, SUMMARY) {
  const {
    verbose: VERBOSE,
    special_convert_rem: SPECIAL_CONVERT_REM,
    special_convert_rem_font_size: SPECIAL_CONVERT_REM_FONT_SIZE,
    format_font_family: FORMAT_FONT_FAMILY,
    format: FORMAT
  } = OPTIONS

  if (VERBOSE) console.log('Process - Font')

  // font
  const font = rule.declarations.filter(filterForFont)

  // font-weight shortening
  font
    .filter(filterForFontWeight)
    .forEach(transformFontWeight)

  // special - convert rem
  if (SPECIAL_CONVERT_REM && SPECIAL_CONVERT_REM_FONT_SIZE) {
    // for singular declaration

    const {
      special_convert_rem_px: SPECIAL_CONVERT_REM_PX
    } = OPTIONS

    font
      .filter(filterForFontSize)
      .forEach(getTransformFontSize(SPECIAL_CONVERT_REM_PX))
  }

  let fontProps = font.map(toProperty)

  if (FORMAT_FONT_FAMILY || FORMAT) {
    // make sure multi-worded families have quotes

    font
      .filter(filterForFontFamily)
      .forEach(transformFontFamily)
  }

  // reduce to font
  if ((
    fontProps.includes('font-size') &&
    fontProps.includes('font-family')
  ) ||
    fontProps.includes('font')
  ) {
    if (VERBOSE) { console.log(success('Process - Values - Font : ' + (rule.selectors.join(', ')))) }

    const fontHasInherit = font.some(hasInherit)
    if (!fontHasInherit) {
      let fontValues = font.map(toValue)
      const fontPositions = font.map(toPosition)

      const fontStyleIndex = fontProps.indexOf('font-style')
      const fontVariantIndex = fontProps.indexOf('font-variant')
      const fontWeightIndex = fontProps.indexOf('font-weight')
      const fontStretchIndex = fontProps.indexOf('font-stretch')
      const fontSizeIndex = fontProps.indexOf('font-size')
      const lineHeightIndex = fontProps.indexOf('line-height')
      const fontFamilyIndex = fontProps.indexOf('font-family')
      const fontStyleValue = fontValues[fontStyleIndex] ?? ''
      const fontVariantValue = fontValues[fontVariantIndex] ?? ''
      const fontWeightValue = fontValues[fontWeightIndex] ?? ''
      const fontStretchValue = fontValues[fontStretchIndex] ?? ''
      const fontSizeValue = fontValues[fontSizeIndex] ?? ''
      const lineHeightValue = fontValues[lineHeightIndex] ?? ''
      const fontFamilyValue = fontValues[fontFamilyIndex] ?? ''

      const FONT_VALUES = [
        fontStyleValue,
        fontVariantValue,
        fontWeightValue,
        fontStretchValue,
        fontSizeValue,
        lineHeightValue,
        fontFamilyValue
      ]

      // existing font check
      if (fontProps.includes('font')) {
        const fontPropValueIndex = fontProps.indexOf('font')
        let fontPropValue = fontValues[fontPropValueIndex]

        if (fontSizeIndex > fontPropValueIndex) {
          FONT_VALUES[4] = fontSizeValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'size', propPosition)
          if (propValue === 'check family') {
            if (fontFamilyValue) {
              FONT_VALUES[4] = fontPropValue
              fontPropValue = fontPropValue + ' ' + fontFamilyValue
            } else {
              // report error and exit
              console.log(error('Error parsing font declaration'))
              console.log(errorLine('Source: ' + propPosition.source))
              console.log(errorLine('Line: ' + propPosition.start.line + ', column: ' + propPosition.start.column))
              console.log('Required: font-family')
              process.exit(1)
            }
          } else {
            if (propValue === 'check size') {
              if (fontSizeValue) {
                FONT_VALUES[4] = fontPropValue
                fontPropValue = fontSizeValue + ' ' + fontPropValue
              } else {
                if (fontPropValue === 'inherit') {
                  FONT_VALUES[4] = fontPropValue
                } else {
                  // report error and exit
                  console.log(error('Error parsing font declaration'))
                  console.log(errorLine('Source: ' + propPosition.source))
                  console.log(errorLine('Line: ' + propPosition.start.line + ', column: ' + propPosition.start.column))
                  console.log('Required: font-size')
                  process.exit(1)
                }
              }
            }
          }
        }

        if (fontFamilyIndex > fontPropValueIndex) {
          FONT_VALUES[6] = fontFamilyValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'family', propPosition)
          if (propValue === 'check size') {
            if (fontSizeValue) {
              FONT_VALUES[6] = fontPropValue
              fontPropValue = fontSizeValue + ' ' + fontPropValue
            } else {
              if (fontPropValue === 'inherit') {
                if (FONT_VALUES[4] === 'inherit') {
                  FONT_VALUES[6] = ''
                }
              } else {
                // report error and exit
                console.log(error('Error parsing font declaration'))
                console.log(errorLine('Source: ' + propPosition.source))
                console.log(errorLine('Line: ' + propPosition.start.line + ', column: ' + propPosition.start.column))
                console.log('Required: font-size')
                process.exit(1)
              }
            }
          } else {
            if (propValue === 'check family') {
              if (fontFamilyValue) {
                FONT_VALUES[6] = fontPropValue
                fontPropValue = fontPropValue + ' ' + fontFamilyValue
              } else {
                // report error and exit
                console.log(error('Error parsing font declaration'))
                console.log(errorLine('Source: ' + propPosition.source))
                console.log(errorLine('Line: ' + propPosition.start.line + ', column: ' + propPosition.start.column))
                console.log('Required: font-family')
                process.exit(1)
              }
            } else {
              // make sure multi-worded families have quotes
              if (FORMAT_FONT_FAMILY || FORMAT) {
                FONT_VALUES[6] = formatFontFamily(FONT_VALUES[6])
              } // end of format
            } // end of font-family checks
          }
        } // end of font-family

        if (fontStyleIndex > fontPropValueIndex) {
          FONT_VALUES[0] = fontStyleValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'style', propPosition)
          FONT_VALUES[0] = (
            propValue === 'check size' ||
            propValue === 'check family'
              ? ''
              : propValue
          )
        }

        if (fontVariantIndex > fontPropValueIndex) {
          FONT_VALUES[1] = fontVariantValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'variant', propPosition)
          FONT_VALUES[1] = (
            propValue === 'check size' ||
            propValue === 'check family'
              ? ''
              : propValue
          )
        }

        if (fontWeightIndex > fontPropValueIndex) {
          FONT_VALUES[2] = fontWeightValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'weight', propPosition)
          FONT_VALUES[2] = (
            propValue === 'check size' ||
            propValue === 'check family'
              ? ''
              : propValue
          )
        }

        if (fontStretchIndex > fontPropValueIndex) {
          FONT_VALUES[3] = fontStretchValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'stretch', propPosition)
          FONT_VALUES[3] = (
            propValue === 'check size' ||
            propValue === 'check family'
              ? ''
              : propValue
          )
        }

        if (lineHeightIndex > fontPropValueIndex) {
          FONT_VALUES[5] = lineHeightValue
        } else {
          const propPosition = fontPositions[fontPropValueIndex]
          const propValue = getValueOfFontProp(fontPropValue, 'lineHeight', propPosition)
          FONT_VALUES[5] = (
            propValue === 'check size' ||
            propValue === 'check family'
              ? ''
              : propValue
          )
        }
      }

      if (
        FONT_VALUES[0] === '' &&
        FONT_VALUES[1] === '' &&
        FONT_VALUES[2] === '' &&
        FONT_VALUES[3] === '' &&
        FONT_VALUES[4] === '' &&
        FONT_VALUES[5] === ''
      ) {
        // !!!
      } else {
        fontProps = [...DEFAULT_FONT_PROPS]
        fontValues = FONT_VALUES
      }

      // check for !important
      const hasImportant = fontValues.some((font) => /(!important)/g.test(font))

      fontValues = fontValues.map((font) => font.replace(/(!important)/g, ''))

      if (hasImportant) {
        fontValues[fontValues.length - 1] += ' !important'
      }

      if (fontProps.includes('line-height')) {
        // merge line-height with font-size
        const lineHeightIndex = fontProps.indexOf('line-height')
        const lineHeightValue = fontValues[lineHeightIndex]
        if (lineHeightValue !== '') {
          const fontSizeIndex = fontProps.indexOf('font-size')
          const fontSizeValue = fontValues[fontSizeIndex]
          fontValues[fontSizeIndex]
          fontValues[fontSizeIndex] = fontSizeValue + '/' + lineHeightValue
          fontValues.splice(lineHeightIndex, 1)
        }
      }

      const declarations = rule.declarations

      // add declaration
      if (declarations.some(filterForFont)) {
        const i = declarations.findIndex(filterForFont)
        declarations.splice(i, 0, {
          type: 'declaration',
          property: 'font',
          value: fontValues.filter(Boolean).join(' ') // remove empty values
        })

        SUMMARY.stats.summary.noFontsShortened += 1
      }

      // remove existing originals
      if (declarations.some(filterForFontFace)) {
        const i = declarations.findIndex(filterForFontFace)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForFontFamily)) {
        const i = declarations.findIndex(filterForFontFamily)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForFontSize)) {
        const i = declarations.findIndex(filterForFontSize)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForFontStretch)) {
        const i = declarations.findIndex(filterForFontStretch)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForFontStyle)) {
        const i = declarations.findIndex(filterForFontStyle)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForFontVariant)) {
        const i = declarations.findIndex(filterForFontVariant)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForFontWeight)) {
        const i = declarations.findIndex(filterForFontWeight)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForLineHeight)) {
        const i = declarations.findIndex(filterForLineHeight)
        declarations.splice(i, 1)
      }

      // remove existing fonts
      const properties = declarations.filter(toProperty).map(toProperty)
      const j = properties.filter((property) => property === 'font').length

      if (j > 1) {
        for (let i = 1; i < j; ++i) {
          const was = properties.indexOf('font')
          const now = properties.indexOf('font', (was + 1))
          declarations.splice(now, 1)
        }
      }
    } // end of inherit check
  } // end of font
}
