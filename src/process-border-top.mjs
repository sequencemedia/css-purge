import debug from 'debug'

import hasPropertyBorderTop from './utils/declarations/has-property-border-top.mjs'
import hasPropertyBorderTopWidth from './utils/declarations/has-property-border-top-width.mjs'
import hasPropertyBorderTopStyle from './utils/declarations/has-property-border-top-style.mjs'
import hasPropertyBorderTopColor from './utils/declarations/has-property-border-top-color.mjs'

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

function hasBorderTop (array) {
  return array.includes('border-top') || (
    array.includes('border-top-width') ||
    array.includes('border-top-style') ||
    array.includes('border-top-color')
  )
}

const log = debug('@sequencemedia/css-purge/process-border-top')

export default function processBorderTop (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const borderTop = declarations.filter(hasPropertyBorderTop)
    if (!borderTop.some(hasInherit)) {
      let borderTopProperties = borderTop.map(toProperty)
      if (hasBorderTop(borderTopProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

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
        if (declarations.some(hasPropertyBorderTop)) {
          const i = declarations.findIndex(hasPropertyBorderTop)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-top',
            value: borderTopValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderTopsShortened += 1
        }

        if (declarations.some(hasPropertyBorderTopWidth)) {
          const i = declarations.findIndex(hasPropertyBorderTopWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderTopStyle)) {
          const i = declarations.findIndex(hasPropertyBorderTopStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderTopColor)) {
          const i = declarations.findIndex(hasPropertyBorderTopColor)
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
