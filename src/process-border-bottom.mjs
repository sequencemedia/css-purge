import cliColor from 'cli-color'

import filterForBorderBottom from './utils/filter-for-border-bottom.mjs'
import filterForBorderBottomWidth from './utils/filter-for-border-bottom-width.mjs'
import filterForBorderBottomStyle from './utils/filter-for-border-bottom-style.mjs'
import filterForBorderBottomColor from './utils/filter-for-border-bottom-color.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_BOTTOM_PROPERTIES = [
  'border-bottom-width',
  'border-bottom-style',
  'border-bottom-color'
]

// https://www.w3.org/TR/CSS21/box.html#border-shorthand-properties
const DEFAULT_BORDER_BOTTOM_VALUES = [
  'none',
  '',
  ''
]

const success = cliColor.greenBright

function hasBorderBottom (array) {
  return array.includes('border-bottom') || (
    array.includes('border-bottom-width') ||
    array.includes('border-bottom-style') ||
    array.includes('border-bottom-color')
  )
}

export default function processBorderBottom ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const borderBottom = declarations.filter(filterForBorderBottom)
    if (!borderBottom.some(hasInherit)) {
      let borderBottomProperties = borderBottom.map(toProperty)
      if (hasBorderBottom(borderBottomProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Border Bottom : ' + selectors.join(', '))) }

        let borderBottomValues = borderBottom.map(toValue)

        const borderBottomWidthIndex = borderBottomProperties.indexOf('border-bottom-width')
        const borderBottomStyleIndex = borderBottomProperties.indexOf('border-bottom-style')
        const borderBottomColorIndex = borderBottomProperties.indexOf('border-bottom-color')
        const borderBottomWidthValue = borderBottomValues[borderBottomWidthIndex] ?? ''
        const borderBottomStyleValue = borderBottomValues[borderBottomStyleIndex] ?? ''
        const borderBottomColorValue = borderBottomValues[borderBottomColorIndex] ?? ''

        let BORDER_BOTTOM_VALUES = [
          borderBottomWidthValue,
          borderBottomStyleValue,
          borderBottomColorValue
        ]

        // existing border bottom check
        if (borderBottomProperties.includes('border-bottom')) {
          const borderBottomPropValueIndex = borderBottomProperties.indexOf('border-bottom')
          const borderBottomPropValue = borderBottomValues[borderBottomPropValueIndex]
          if (borderBottomPropValue !== 'none') {
            if (borderBottomWidthIndex > borderBottomPropValueIndex) {
              BORDER_BOTTOM_VALUES[0] = borderBottomWidthValue
            } else {
              const propValue = getValueOfTriProp(borderBottomPropValue, 'width')
              if (propValue) BORDER_BOTTOM_VALUES[0] = propValue
            }

            if (borderBottomStyleIndex > borderBottomPropValueIndex) {
              BORDER_BOTTOM_VALUES[1] = borderBottomStyleValue
            } else {
              const propValue = getValueOfTriProp(borderBottomPropValue, 'style')
              if (propValue) BORDER_BOTTOM_VALUES[1] = propValue
            }

            if (borderBottomColorIndex > borderBottomPropValueIndex) {
              BORDER_BOTTOM_VALUES[2] = borderBottomColorValue
            } else {
              const propValue = getValueOfTriProp(borderBottomPropValue, 'color')
              if (propValue) BORDER_BOTTOM_VALUES[2] = propValue
            }
          } else {
            BORDER_BOTTOM_VALUES = [
              ...DEFAULT_BORDER_BOTTOM_VALUES
            ]
          }
        }

        if (!BORDER_BOTTOM_VALUES.every((v) => v === '')) {
          borderBottomProperties = [
            ...DEFAULT_BORDER_BOTTOM_PROPERTIES
          ]
          borderBottomValues = BORDER_BOTTOM_VALUES
        }

        // check for !important
        if (borderBottomValues.some(hasImportant)) {
          borderBottomValues = borderBottomValues.map((borderBottom) => borderBottom.replace(/(!important)/g, ''))
          borderBottomValues[borderBottomValues.length - 1] += ' !important'
        }

        // add declaration
        if (declarations.some(filterForBorderBottom)) {
          const i = declarations.findIndex(filterForBorderBottom)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-bottom',
            value: borderBottomValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderBottomsShortened += 1
        }

        if (declarations.some(filterForBorderBottomWidth)) {
          const i = declarations.findIndex(filterForBorderBottomWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderBottomStyle)) {
          const i = declarations.findIndex(filterForBorderBottomStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderBottomColor)) {
          const i = declarations.findIndex(filterForBorderBottomColor)
          declarations.splice(i, 1)
        }

        // remove existing borderBottoms
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'border-bottom').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('border-bottom')
            const now = properties.indexOf('border-bottom', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit
    }
  }
}
