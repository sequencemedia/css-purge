import cliColor from 'cli-color'

import filterForBorderTop from './utils/filter-for-border-top.mjs'
import filterForBorderTopWidth from './utils/filter-for-border-top-width.mjs'
import filterForBorderTopStyle from './utils/filter-for-border-top-style.mjs'
import filterForBorderTopColor from './utils/filter-for-border-top-color.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_TOP_PROPERTIES = [
  'border-top-width',
  'border-top-style',
  'border-top-color'
]

// https://www.w3.org/TR/CSS21/box.html#border-shorthand-properties
const DEFAULT_BORDER_TOP_VALUES = [
  '0',
  '',
  ''
]

const success = cliColor.greenBright

function hasBorderTop (array) {
  return array.includes('border-top') || (
    array.includes('border-top-width') ||
    array.includes('border-top-style') ||
    array.includes('border-top-color')
  )
}

export default function processBorderTop ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const borderTop = declarations.filter(filterForBorderTop)
    if (!borderTop.some(hasInherit)) {
      let borderTopProperties = borderTop.map(toProperty)
      if (hasBorderTop(borderTopProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Border Top : ' + selectors.join(', '))) }

        let borderTopValues = borderTop.map(toValue)

        const borderTopWidthIndex = borderTopProperties.indexOf('border-top-width')
        const borderTopStyleIndex = borderTopProperties.indexOf('border-top-style')
        const borderTopColorIndex = borderTopProperties.indexOf('border-top-color')
        const borderTopWidthValue = borderTopValues[borderTopWidthIndex] ?? ''
        const borderTopStyleValue = borderTopValues[borderTopStyleIndex] ?? ''
        const borderTopColorValue = borderTopValues[borderTopColorIndex] ?? ''

        let BORDER_TOP_VALUES = [
          borderTopWidthValue,
          borderTopStyleValue,
          borderTopColorValue
        ]

        // existing border top check
        if (borderTopProperties.includes('border-top')) {
          const borderTopPropValueIndex = borderTopProperties.indexOf('border-top')
          const borderTopPropValue = borderTopValues[borderTopPropValueIndex]

          if (borderTopPropValue !== 'none') {
            if (borderTopWidthIndex > borderTopPropValueIndex) {
              BORDER_TOP_VALUES[0] = borderTopWidthValue
            } else {
              const propValue = getValueOfTriProp(borderTopPropValue, 'width')
              if (propValue) BORDER_TOP_VALUES[0] = propValue
            }

            if (borderTopStyleIndex > borderTopPropValueIndex) {
              BORDER_TOP_VALUES[1] = borderTopStyleValue
            } else {
              const propValue = getValueOfTriProp(borderTopPropValue, 'style')
              if (propValue) BORDER_TOP_VALUES[1] = propValue
            }

            if (borderTopColorIndex > borderTopPropValueIndex) {
              BORDER_TOP_VALUES[2] = borderTopColorValue
            } else {
              const propValue = getValueOfTriProp(borderTopPropValue, 'color')
              if (propValue) BORDER_TOP_VALUES[2] = propValue
            }
          } else {
            BORDER_TOP_VALUES = [
              ...DEFAULT_BORDER_TOP_VALUES
            ]
          }
        }

        if (!BORDER_TOP_VALUES.every((v) => v === '')) {
          borderTopProperties = [
            ...DEFAULT_BORDER_TOP_PROPERTIES
          ]
          borderTopValues = BORDER_TOP_VALUES
        }

        // check for !important
        if (borderTopValues.some(hasImportant)) {
          borderTopValues = borderTopValues.map((borderTop) => borderTop.replace(/(!important)/g, ''))
          borderTopValues[borderTopValues.length - 1] += ' !important'
        }

        // add declaration
        if (declarations.some(filterForBorderTop)) {
          const i = declarations.findIndex(filterForBorderTop)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-top',
            value: borderTopValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderTopsShortened += 1
        }

        if (declarations.some(filterForBorderTopWidth)) {
          const i = declarations.findIndex(filterForBorderTopWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderTopStyle)) {
          const i = declarations.findIndex(filterForBorderTopStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderTopColor)) {
          const i = declarations.findIndex(filterForBorderTopColor)
          declarations.splice(i, 1)
        }

        // remove existing borderTops
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'border-top').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('border-top')
            const now = properties.indexOf('border-top', (was + 1))
            declarations.splice(now, 1)
          }
        }
      }
    } // end of inherit
  }
}
