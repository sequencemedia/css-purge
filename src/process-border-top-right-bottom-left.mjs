import cliColor from 'cli-color'

import filterForBorderTopRightBottomLeft from './utils/filter-for-border-top-right-bottom-left.mjs'
import filterForBorderTop from './utils/filter-for-border-top.mjs'
import filterForBorderRight from './utils/filter-for-border-right.mjs'
import filterForBorderBottom from './utils/filter-for-border-bottom.mjs'
import filterForBorderLeft from './utils/filter-for-border-left.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_PROPERTIES = [
  'border-width',
  'border-style',
  'border-color'
]

const success = cliColor.greenBright

function hasBorderTopRightBottomLeft (array) {
  return (
    array.includes('border-top') &&
    array.includes('border-right') &&
    array.includes('border-bottom') &&
    array.includes('border-left')
  )
}

export default function processBorderTopRightBottomLeft ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const borderTopRightBottomLeft = declarations.filter(filterForBorderTopRightBottomLeft)
    if (!borderTopRightBottomLeft.some(hasInherit)) {
      let borderTopRightBottomLeftProperties = borderTopRightBottomLeft.map(toProperty)
      if (hasBorderTopRightBottomLeft(borderTopRightBottomLeftProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Border : ' + selectors.join(', '))) }

        let borderTopRightBottomLeftValues = borderTopRightBottomLeft.map(toValue)

        const borderTopRightBottomLeftWidthIndex = borderTopRightBottomLeftProperties.indexOf('border-width')
        const borderTopRightBottomLeftStyleIndex = borderTopRightBottomLeftProperties.indexOf('border-style')
        const borderTopRightBottomLeftColorIndex = borderTopRightBottomLeftProperties.indexOf('border-color')
        const borderTopRightBottomLeftWidthValue = borderTopRightBottomLeftValues[borderTopRightBottomLeftWidthIndex] ?? ''
        const borderTopRightBottomLeftStyleValue = borderTopRightBottomLeftValues[borderTopRightBottomLeftStyleIndex] ?? ''
        const borderTopRightBottomLeftColorValue = borderTopRightBottomLeftValues[borderTopRightBottomLeftColorIndex] ?? ''

        const BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES = [
          borderTopRightBottomLeftWidthValue,
          borderTopRightBottomLeftStyleValue,
          borderTopRightBottomLeftColorValue
        ]

        const [
          borderPropValue
        ] = borderTopRightBottomLeftValues
        if (
          borderPropValue === borderTopRightBottomLeftWidthValue &&
          borderPropValue === borderTopRightBottomLeftStyleValue &&
          borderPropValue === borderTopRightBottomLeftColorValue
        ) {
          if (!borderTopRightBottomLeftProperties.includes('border-width')) {
            const propValue = getValueOfTriProp(borderPropValue, 'width')
            if (propValue) BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[0] = propValue
          }

          if (!borderTopRightBottomLeftProperties.includes('border-style')) {
            const propValue = getValueOfTriProp(borderPropValue, 'style')
            if (propValue) BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[1] = propValue
          }

          if (!borderTopRightBottomLeftProperties.includes('border-color')) {
            const propValue = getValueOfTriProp(borderPropValue, 'color')
            if (propValue) BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[2] = propValue
          }

          if (!BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES.every((v) => v === '')) {
            borderTopRightBottomLeftProperties = [
              ...DEFAULT_BORDER_PROPERTIES
            ]
            borderTopRightBottomLeftValues = BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES
          }

          // check for !important
          if (borderTopRightBottomLeftValues.some(hasImportant)) {
            borderTopRightBottomLeftValues = borderTopRightBottomLeftValues.map((borderTopRightBottomLeft) => borderTopRightBottomLeft.replace(/(!important)/g, ''))
            borderTopRightBottomLeftValues[borderTopRightBottomLeftValues.length - 1] += ' !important'
          }

          // add declaration
          if (declarations.some(filterForBorderTopRightBottomLeft)) {
            const i = declarations.findIndex(filterForBorderTopRightBottomLeft)
            declarations.splice(i, 0, {
              type: 'declaration',
              property: 'border',
              value: borderTopRightBottomLeftValues.filter(Boolean).join(' ') // remove empty values
            })

            SUMMARY.stats.summary.noBorderTopRightBottomLeftsShortened += 1
          }

          if (declarations.some(filterForBorderTop)) {
            const i = declarations.findIndex(filterForBorderTop)
            declarations.splice(i, 1)
          }

          if (declarations.some(filterForBorderRight)) {
            const i = declarations.findIndex(filterForBorderRight)
            declarations.splice(i, 1)
          }

          if (declarations.some(filterForBorderBottom)) {
            const i = declarations.findIndex(filterForBorderBottom)
            declarations.splice(i, 1)
          }

          if (declarations.some(filterForBorderLeft)) {
            const i = declarations.findIndex(filterForBorderLeft)
            declarations.splice(i, 1)
          }
        }
      } // end of inherit check
    } // end of combining
  }
}
