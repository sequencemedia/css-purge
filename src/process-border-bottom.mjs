import debug from 'debug'

import hasPropertyBorderBottom from '#utils/declarations/has-property-border-bottom'
import hasPropertyBorderBottomWidth from '#utils/declarations/has-property-border-bottom-width'
import hasPropertyBorderBottomStyle from '#utils/declarations/has-property-border-bottom-style'
import hasPropertyBorderBottomColor from '#utils/declarations/has-property-border-bottom-color'

import hasInherit from '#utils/has-inherit'
import hasImportant from '#utils/has-important'
import toProperty from '#utils/to-property'
import toValue from '#utils/to-value'
import getValueOfTriProp from '#utils/get-value-of-tri-prop'

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

function hasBorderBottom (properties) {
  return properties.includes('border-bottom') || (
    properties.includes('border-bottom-width') ||
    properties.includes('border-bottom-style') ||
    properties.includes('border-bottom-color')
  )
}

const log = debug('@sequencemedia/css-purge/process-border-bottom')

export default function processBorderBottom (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const borderBottom = declarations.filter(hasPropertyBorderBottom)
    if (!borderBottom.some(hasInherit)) {
      let borderBottomProperties = borderBottom.map(toProperty)
      if (hasBorderBottom(borderBottomProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

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
        if (declarations.some(hasPropertyBorderBottom)) {
          const i = declarations.findIndex(hasPropertyBorderBottom)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-bottom',
            value: borderBottomValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderBottomsShortened += 1
        }

        if (declarations.some(hasPropertyBorderBottomWidth)) {
          const i = declarations.findIndex(hasPropertyBorderBottomWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderBottomStyle)) {
          const i = declarations.findIndex(hasPropertyBorderBottomStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderBottomColor)) {
          const i = declarations.findIndex(hasPropertyBorderBottomColor)
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
