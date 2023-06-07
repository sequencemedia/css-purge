import cliColor from 'cli-color'

import filterForOutline from './utils/filter-for-outline.mjs'
import filterForOutlineWidth from './utils/filter-for-outline-width.mjs'
import filterForOutlineStyle from './utils/filter-for-outline-style.mjs'
import filterForOutlineColor from './utils/filter-for-outline-color.mjs'

import hasInherit from './utils/has-inherit.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Retain order
 */
const DEFAULT_OUTLINE_PROPS = [
  'outline-width',
  'outline-style',
  'outline-color'
]

const success = cliColor.greenBright
const error = cliColor.red
const errorLine = cliColor.redBright

export default function processOutline (rule, OPTIONS, SUMMARY) {
  const {
    verbose: VERBOSE
  } = OPTIONS

  if (VERBOSE) console.log('Process - Outline')

  const outline = rule.declarations.filter(filterForOutline)
  let outlineProps = outline.map(toProperty)
  if ((
    outlineProps.includes('outline-width') ||
    outlineProps.includes('outline-style') ||
    outlineProps.includes('outline-color')
  ) ||
    outlineProps.includes('outline')
  ) {
    if (VERBOSE) { console.log(success('Process - Values - Outline : ' + rule.selectors.join(', '))) }

    const outlineHasInherit = outline.some(hasInherit)
    if (!outlineHasInherit) {
      let outlineValues = outline.map(toValue)

      const outlineWidthIndex = outlineProps.indexOf('outline-width')
      const outlineStyleIndex = outlineProps.indexOf('outline-style')
      const outlineColorIndex = outlineProps.indexOf('outline-color')
      const outlineWidthValue = outlineValues[outlineWidthIndex] ?? ''
      const outlineStyleValue = outlineValues[outlineStyleIndex] ?? ''
      const outlineColorValue = outlineValues[outlineColorIndex] ?? ''

      const OUTLINE_VALUES = [
        outlineWidthValue,
        outlineStyleValue,
        outlineColorValue
      ]

      // existing outline check
      if (outlineProps.includes('outline')) {
        const outlinePropValueIndex = outlineProps.indexOf('outline')
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
          OUTLINE_VALUES[0] = '0'
          OUTLINE_VALUES[1] = ''
          OUTLINE_VALUES[2] = ''
        }
      }

      if (
        OUTLINE_VALUES.every((v) => v === '')
      ) {
        // !!!
      } else {
        outlineProps = [...DEFAULT_OUTLINE_PROPS]
        outlineValues = OUTLINE_VALUES
      }

      // check for !important
      const hasImportant = outlineValues.some((outline) => /(!important)/g.test(outline))

      outlineValues = outlineValues.map((outline) => outline.replace(/(!important)/g, ''))

      if (hasImportant) {
        outlineValues[outlineValues.length - 1] += ' !important'
      }

      const declarations = rule.declarations

      // add declaration
      if (declarations.some(filterForOutline)) {
        const i = declarations.findIndex(filterForOutline)
        declarations.splice(i, 0, {
          type: 'declaration',
          property: 'outline',
          value: outlineValues.filter(Boolean).join(' ') // remove empty values
        })

        SUMMARY.stats.summary.noOutlinesShortened += 1
      }

      if (declarations.some(filterForOutlineWidth)) {
        const i = declarations.findIndex(filterForOutlineWidth)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForOutlineStyle)) {
        const i = declarations.findIndex(filterForOutlineStyle)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForOutlineColor)) {
        const i = declarations.findIndex(filterForOutlineColor)
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
