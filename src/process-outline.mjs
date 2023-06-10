import cliColor from 'cli-color'

import hasPropertyOutline from './utils/declarations/has-property-outline.mjs'
import hasPropertyOutlineWidth from './utils/declarations/has-property-outline-width.mjs'
import hasPropertyOutlineStyle from './utils/declarations/has-property-outline-style.mjs'
import hasPropertyOutlineColor from './utils/declarations/has-property-outline-color.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

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

const success = cliColor.greenBright

function hasOutline (array) {
  return array.includes('outline') || (
    array.includes('outline-width') ||
    array.includes('outline-style') ||
    array.includes('outline-color')
  )
}

export default function processOutline ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const outline = declarations.filter(hasPropertyOutline)
    if (!outline.some(hasInherit)) {
      let outlineProperties = outline.map(toProperty)
      if (hasOutline(outlineProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Outline : ' + selectors.join(', '))) }

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
