import debug from 'debug'

import hasPropertyOutline from '#utils/declarations/has-property-outline'
import hasPropertyOutlineWidth from '#utils/declarations/has-property-outline-width'
import hasPropertyOutlineStyle from '#utils/declarations/has-property-outline-style'
import hasPropertyOutlineColor from '#utils/declarations/has-property-outline-color'

import hasInherit from '#utils/has-inherit'
import hasImportant from '#utils/has-important'
import toProperty from '#utils/to-property'
import toValue from '#utils/to-value'
import getValueOfTriProp from '#utils/get-value-of-tri-prop'

/**
 *  Preserve order
 */
const DEFAULT_OUTLINE_PROPERTIES = [
  'outline-width',
  'outline-style',
  'outline-color'
]

const DEFAULT_OUTLINE_VALUES = [
  '0',
  '',
  ''
]

function hasOutline (properties) {
  return properties.includes('outline') || (
    properties.includes('outline-width') ||
    properties.includes('outline-style') ||
    properties.includes('outline-color')
  )
}

const log = debug('@sequencemedia/css-purge/process-outline')

export default function processOutline (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const outline = declarations.filter(hasPropertyOutline)
    if (!outline.some(hasInherit)) {
      let outlineProperties = outline.map(toProperty)
      if (hasOutline(outlineProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

        let outlineValues = outline.map(toValue)

        const outlineWidthIndex = outlineProperties.indexOf('outline-width')
        const outlineStyleIndex = outlineProperties.indexOf('outline-style')
        const outlineColorIndex = outlineProperties.indexOf('outline-color')
        const outlineWidthValue = outlineValues[outlineWidthIndex] ?? ''
        const outlineStyleValue = outlineValues[outlineStyleIndex] ?? ''
        const outlineColorValue = outlineValues[outlineColorIndex] ?? ''

        let OUTLINE_VALUES = [
          outlineWidthValue,
          outlineStyleValue,
          outlineColorValue
        ]

        // existing outline check
        if (outlineProperties.includes('outline')) {
          const outlinePropValueIndex = outlineProperties.indexOf('outline')
          const outlinePropValue = outlineValues[outlinePropValueIndex]
          if (outlinePropValue !== 'none') {
            if (outlineWidthIndex > outlinePropValueIndex) {
              OUTLINE_VALUES[0] = outlineWidthValue
            } else {
              const propValue = getValueOfTriProp(outlinePropValue, 'width')
              if (propValue) OUTLINE_VALUES[0] = propValue
            }

            if (outlineStyleIndex > outlinePropValueIndex) {
              OUTLINE_VALUES[1] = outlineStyleValue
            } else {
              const propValue = getValueOfTriProp(outlinePropValue, 'style')
              if (propValue) OUTLINE_VALUES[1] = propValue
            }

            if (outlineColorIndex > outlinePropValueIndex) {
              OUTLINE_VALUES[2] = outlineColorValue
            } else {
              const propValue = getValueOfTriProp(outlinePropValue, 'color')
              if (propValue) OUTLINE_VALUES[2] = propValue
            }
          } else {
            OUTLINE_VALUES = [
              ...DEFAULT_OUTLINE_VALUES
            ]
          }
        }

        if (!OUTLINE_VALUES.every((v) => v === '')) {
          outlineProperties = [...DEFAULT_OUTLINE_PROPERTIES]
          outlineValues = OUTLINE_VALUES
        }

        // check for !important
        if (outlineValues.some(hasImportant)) {
          outlineValues = outlineValues.map((outline) => outline.replace(/(!important)/g, ''))
          outlineValues[outlineValues.length - 1] += ' !important'
        }

        // add declaration
        if (declarations.some(hasPropertyOutline)) {
          const i = declarations.findIndex(hasPropertyOutline)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'outline',
            value: outlineValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noOutlinesShortened += 1
        }

        if (declarations.some(hasPropertyOutlineWidth)) {
          const i = declarations.findIndex(hasPropertyOutlineWidth)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyOutlineStyle)) {
          const i = declarations.findIndex(hasPropertyOutlineStyle)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyOutlineColor)) {
          const i = declarations.findIndex(hasPropertyOutlineColor)
          declarations.splice(i, 1)
        }

        // remove existing outlines
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'outline').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('outline')
            const now = properties.indexOf('outline', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit check
    }
  }
}
