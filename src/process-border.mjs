import debug from 'debug'

import hasPropertyBorder from './utils/declarations/has-property-border.mjs'
import hasPropertyBorderWidth from './utils/declarations/has-property-border-width.mjs'
import hasPropertyBorderStyle from './utils/declarations/has-property-border-style.mjs'
import hasPropertyBorderColor from './utils/declarations/has-property-border-color.mjs'

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

// https://www.w3.org/TR/CSS21/box.html#border-shorthand-properties
const DEFAULT_BORDER_VALUES = [
  '0',
  '',
  ''
]

function hasBorder (properties) {
  return properties.includes('border') || (
    properties.includes('border-width') &&
    properties.includes('border-style') &&
    properties.includes('border-color')
  )
}

const log = debug('@sequencemedia/css-purge/process-border')

export default function processBorder (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const border = declarations.filter(hasPropertyBorder)
    if (!border.some(hasInherit)) {
      let borderProperties = border.map(toProperty)
      if (hasBorder(borderProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

        let borderValues = border.map(toValue)

        const borderWidthIndex = borderProperties.indexOf('border-width')
        const borderStyleIndex = borderProperties.indexOf('border-style')
        const borderColorIndex = borderProperties.indexOf('border-color')
        const borderWidthValue = borderValues[borderWidthIndex] ?? ''
        const borderStyleValue = borderValues[borderStyleIndex] ?? ''
        const borderColorValue = borderValues[borderColorIndex] ?? ''

        if (
          borderWidthValue.split(' ').length === 1 && // multi-width values not allowed
          borderColorValue.split(' ').length === 1 // multi-color (border around squares, etc.) check - only do if single
        ) {
          let BORDER_VALUES = [
            borderWidthValue,
            borderStyleValue,
            borderColorValue
          ]

          // existing border check
          if (borderProperties.includes('border')) {
            const borderPropValueIndex = borderProperties.indexOf('border')
            const borderPropValue = borderValues[borderPropValueIndex]

            if (borderPropValue !== 'none') {
              if (borderWidthIndex > borderPropValueIndex) {
                BORDER_VALUES[0] = borderWidthValue
              } else {
                const propValue = getValueOfTriProp(borderPropValue, 'width')
                if (propValue) BORDER_VALUES[0] = propValue
              }

              if (borderProperties.indexOf('border-style') > borderPropValueIndex) {
                BORDER_VALUES[1] = borderStyleValue
              } else {
                const propValue = getValueOfTriProp(borderPropValue, 'style')
                if (propValue) BORDER_VALUES[1] = propValue
              }

              if (borderColorIndex > borderPropValueIndex) {
                BORDER_VALUES[2] = borderColorValue
              } else {
                const propValue = getValueOfTriProp(borderPropValue, 'color')
                if (propValue) BORDER_VALUES[2] = propValue
              }
            } else {
              BORDER_VALUES = [
                ...DEFAULT_BORDER_VALUES
              ]
            }
          }

          if (!BORDER_VALUES.every((v) => v === '')) {
            borderProperties = [
              ...DEFAULT_BORDER_PROPERTIES
            ]
            borderValues = BORDER_VALUES
          }

          // check for !important
          if (borderValues.some(hasImportant)) {
            borderValues = borderValues.map((border) => border.replace(/(!important)/g, ''))
            borderValues[borderValues.length - 1] += ' !important'
          }

          // add declaration
          if (declarations.some(hasPropertyBorder)) {
            const i = declarations.findIndex(hasPropertyBorder)
            declarations.splice(i, 0, {
              type: 'declaration',
              property: 'border',
              value: borderValues.filter(Boolean).join(' ') // remove empty values
            })

            SUMMARY.stats.summary.noBordersShortened += 1
          }

          if (declarations.some(hasPropertyBorderWidth)) {
            const i = declarations.findIndex(hasPropertyBorderWidth)
            declarations.splice(i, 1)
          }

          if (declarations.some(hasPropertyBorderStyle)) {
            const i = declarations.findIndex(hasPropertyBorderStyle)
            declarations.splice(i, 1)
          }

          if (declarations.some(hasPropertyBorderColor)) {
            const i = declarations.findIndex(hasPropertyBorderColor)
            declarations.splice(i, 1)
          }

          // remove existing borders
          const properties = declarations.filter(toProperty).map(toProperty)
          const j = properties.filter((property) => property === 'border').length
          if (j > 1) {
            for (let i = 1; i < j; ++i) {
              const was = properties.indexOf('border')
              const now = properties.indexOf('border', (was + 1))
              declarations.splice(now, 1)
            }
          }
        } // end of inherit check
      }
    }
  }
}
