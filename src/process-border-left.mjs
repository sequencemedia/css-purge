import cliColor from 'cli-color'

import hasPropertyBorderLeft from './utils/declarations/has-property-border-left.mjs'
import hasPropertyBorderLeftWidth from './utils/declarations/has-property-border-left-width.mjs'
import hasPropertyBorderLeftStyle from './utils/declarations/has-property-border-left-style.mjs'
import hasPropertyBorderLeftColor from './utils/declarations/has-property-border-left-color.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_LEFT_PROPERTIES = [
  'border-left-width',
  'border-left-style',
  'border-left-color'
]

// https://www.w3.org/TR/CSS21/box.html#border-shorthand-properties
const DEFAULT_BORDER_LEFT_VALUES = [
  'none',
  '',
  ''
]

const success = cliColor.greenBright

function hasBorderLeft (array) {
  return array.includes('border-left') || (
    array.includes('border-left-width') ||
    array.includes('border-left-style') ||
    array.includes('border-left-color')
  )
}

export default function processBorderLeft ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const borderLeft = declarations.filter(hasPropertyBorderLeft)
    if (!borderLeft.some(hasInherit)) {
      let borderLeftProperties = borderLeft.map(toProperty)
      if (hasBorderLeft(borderLeftProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Border Left : ' + selectors.join(', '))) }

        let borderLeftValues = borderLeft.map(toValue)

        const borderLeftWidthIndex = borderLeftProperties.indexOf('border-left-width')
        const borderLeftStyleIndex = borderLeftProperties.indexOf('border-left-style')
        const borderLeftColorIndex = borderLeftProperties.indexOf('border-left-color')
        const borderLeftWidthValue = borderLeftValues[borderLeftWidthIndex] ?? ''
        const borderLeftStyleValue = borderLeftValues[borderLeftStyleIndex] ?? ''
        const borderLeftColorValue = borderLeftValues[borderLeftColorIndex] ?? ''

        let BORDER_LEFT_VALUES = [
          borderLeftWidthValue,
          borderLeftStyleValue,
          borderLeftColorValue
        ]

        // existing border left check
        if (borderLeftProperties.includes('border-left')) {
          const borderLeftPropValueIndex = borderLeftProperties.indexOf('border-left')
          const borderLeftPropValue = borderLeftValues[borderLeftPropValueIndex]

          if (borderLeftPropValue !== 'none') {
            if (borderLeftWidthIndex > borderLeftPropValueIndex) {
              BORDER_LEFT_VALUES[0] = borderLeftWidthValue
            } else {
              const propValue = getValueOfTriProp(borderLeftPropValue, 'width')
              if (propValue) BORDER_LEFT_VALUES[0] = propValue
            }

            if (borderLeftStyleIndex > borderLeftPropValueIndex) {
              BORDER_LEFT_VALUES[1] = borderLeftStyleValue
            } else {
              const propValue = getValueOfTriProp(borderLeftPropValue, 'style')
              if (propValue) BORDER_LEFT_VALUES[1] = propValue
            }

            if (borderLeftColorIndex > borderLeftPropValueIndex) {
              BORDER_LEFT_VALUES[2] = borderLeftColorValue
            } else {
              const propValue = getValueOfTriProp(borderLeftPropValue, 'color')
              if (propValue) BORDER_LEFT_VALUES[2] = propValue
            }
          } else {
            BORDER_LEFT_VALUES = [
              ...DEFAULT_BORDER_LEFT_VALUES
            ]
          }
        }

        if (!BORDER_LEFT_VALUES.every((v) => v !== '')) {
          borderLeftProperties = [
            ...DEFAULT_BORDER_LEFT_PROPERTIES
          ]
          borderLeftValues = BORDER_LEFT_VALUES
        }

        // check for !important
        if (borderLeftValues.some(hasImportant)) {
          borderLeftValues = borderLeftValues.map((borderLeft) => borderLeft.replace(/(!important)/g, ''))
          borderLeftValues[borderLeftValues.length - 1] += ' !important'
        }

        // add declaration
        if (declarations.some(hasPropertyBorderLeft)) {
          const i = declarations.findIndex(hasPropertyBorderLeft)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-left',
            value: borderLeftValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderLeftsShortened += 1
        }

        if (declarations.some(hasPropertyBorderLeftWidth)) {
          const i = declarations.findIndex(hasPropertyBorderLeftWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderLeftStyle)) {
          const i = declarations.findIndex(hasPropertyBorderLeftStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderLeftColor)) {
          const i = declarations.findIndex(hasPropertyBorderLeftColor)
          declarations.splice(i, 1)
        }

        // remove existing borderLefts
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'border-left').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('border-left')
            const now = properties.indexOf('border-left', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit check
    }
  }
}
