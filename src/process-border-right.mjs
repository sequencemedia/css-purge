import cliColor from 'cli-color'

import filterForBorderRight from './utils/filter-for-border-right.mjs'
import filterForBorderRightWidth from './utils/filter-for-border-right-width.mjs'
import filterForBorderRightStyle from './utils/filter-for-border-right-style.mjs'
import filterForBorderRightColor from './utils/filter-for-border-right-color.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_RIGHT_PROPERTIES = [
  'border-right-width',
  'border-right-style',
  'border-right-color'
]

// https://www.w3.org/TR/CSS21/box.html#border-shorthand-properties
const DEFAULT_BORDER_RIGHT_VALUES = [
  '0',
  '',
  ''
]

const success = cliColor.greenBright

function hasBorderRight (array) {
  return array.includes('border-right') || (
    array.includes('border-right-width') ||
    array.includes('border-right-style') ||
    array.includes('border-right-color')
  )
}

export default function processBorderRight ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const borderRight = declarations.filter(filterForBorderRight)
    if (!borderRight.some(hasInherit)) {
      let borderRightProperties = borderRight.map(toProperty)
      if (hasBorderRight(borderRightProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Border Right : ' + selectors.join(', '))) }

        let borderRightValues = borderRight.map(toValue)

        const borderRightWidthIndex = borderRightProperties.indexOf('border-right-width')
        const borderRightStyleIndex = borderRightProperties.indexOf('border-right-style')
        const borderRightColorIndex = borderRightProperties.indexOf('border-right-color')
        const borderRightWidthValue = borderRightValues[borderRightWidthIndex] ?? ''
        const borderRightStyleValue = borderRightValues[borderRightStyleIndex] ?? ''
        const borderRightColorValue = borderRightValues[borderRightColorIndex] ?? ''

        let BORDER_RIGHT_VALUES = [
          borderRightWidthValue,
          borderRightStyleValue,
          borderRightColorValue
        ]

        // existing border right check
        if (borderRightProperties.includes('border-right')) {
          const borderRightPropValueIndex = borderRightProperties.indexOf('border-right')
          const borderRightPropValue = borderRightValues[borderRightPropValueIndex]

          if (borderRightPropValue !== 'none') {
            if (borderRightWidthIndex > borderRightPropValueIndex) {
              BORDER_RIGHT_VALUES[0] = borderRightWidthValue
            } else {
              const propValue = getValueOfTriProp(borderRightPropValue, 'width')
              if (propValue) BORDER_RIGHT_VALUES[0] = propValue
            }
            if (borderRightStyleIndex > borderRightPropValueIndex) {
              BORDER_RIGHT_VALUES[1] = borderRightStyleValue
            } else {
              const propValue = getValueOfTriProp(borderRightPropValue, 'style')
              if (propValue) BORDER_RIGHT_VALUES[1] = propValue
            }
            if (borderRightColorIndex > borderRightPropValueIndex) {
              BORDER_RIGHT_VALUES[2] = borderRightColorValue
            } else {
              const propValue = getValueOfTriProp(borderRightPropValue, 'color')
              if (propValue) BORDER_RIGHT_VALUES[2] = propValue
            }
          } else {
            BORDER_RIGHT_VALUES = [
              ...DEFAULT_BORDER_RIGHT_VALUES
            ]
          }
        }

        if (!BORDER_RIGHT_VALUES.every((v) => v === '')) {
          borderRightProperties = [
            ...DEFAULT_BORDER_RIGHT_PROPERTIES
          ]
          borderRightValues = BORDER_RIGHT_VALUES
        }

        // check for !important
        if (borderRightValues.some(hasImportant)) {
          borderRightValues = borderRightValues.map((borderRight) => borderRight.replace(/(!important)/g, ''))
          borderRightValues[borderRightValues.length - 1] += ' !important'
        }

        // add declaration
        if (declarations.some(filterForBorderRight)) {
          const i = declarations.findIndex(filterForBorderRight)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-right',
            value: borderRightValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderRightsShortened += 1
        }

        if (declarations.some(filterForBorderRightWidth)) {
          const i = declarations.findIndex(filterForBorderRightWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderRightStyle)) {
          const i = declarations.findIndex(filterForBorderRightStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderRightColor)) {
          const i = declarations.findIndex(filterForBorderRightColor)
          declarations.splice(i, 1)
        }

        // remove existing borderRights
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'border-right').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('border-right')
            const now = properties.indexOf('border-right', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit
    }
  }
}