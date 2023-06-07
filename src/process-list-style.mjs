import cliColor from 'cli-color'

import filterForListStyle from './utils/filter-for-list-style.mjs'
import filterForListStyleType from './utils/filter-for-list-style-type.mjs'
import filterForListStylePosition from './utils/filter-for-list-style-position.mjs'
import filterForListStyleImage from './utils/filter-for-list-style-image.mjs'

import hasInherit from './utils/has-inherit.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Retain order
 */
const DEFAULT_LIST_STYLE_PROPS = [
  'list-style-type',
  'list-style-position',
  'list-style-image'
]

const success = cliColor.greenBright
const error = cliColor.red
const errorLine = cliColor.redBright

export default function processListStyle (rule, OPTIONS, SUMMARY) {
  const {
    verbose: VERBOSE
  } = OPTIONS

  if (VERBOSE) console.log('Process - List Style')

  // listStyle

  const listStyle = rule.declarations.filter(filterForListStyle)
  let listStyleProps = listStyle.map(toProperty)
  if ((
    listStyleProps.includes('list-style-type') ||
    listStyleProps.includes('list-style-position') ||
    listStyleProps.includes('list-style-image')
  ) ||
    listStyleProps.includes('list-style')
  ) {
    if (VERBOSE) { console.log(success('Process - Values - List-style : ' + rule.selectors.join(', '))) }

    const listStyleHasInherit = listStyle.some(hasInherit)
    if (!listStyleHasInherit) {
      let listStyleValues = listStyle.map(toValue)

      const listStyleTypeIndex = listStyleProps.indexOf('list-style-type')
      const listStylePositionIndex = listStyleProps.indexOf('list-style-position')
      const listStyleImageIndex = listStyleProps.indexOf('list-style-image')
      const listStyleTypeValue = listStyleValues[listStyleTypeIndex] ?? ''
      const listStylePositionValue = listStyleValues[listStylePositionIndex] ?? ''
      const listStyleImageValue = listStyleValues[listStyleImageIndex] ?? ''

      const LIST_STYLE_VALUES = [
        listStyleTypeValue,
        listStylePositionValue,
        listStyleImageValue
      ]

      // existing listStyle check

      if (listStyleProps.includes('list-style')) {
        const listStylePropValueIndex = listStyleProps.indexOf('list-style')
        const listStylePropValue = listStyleValues[listStylePropValueIndex]

        if (listStylePropValue !== 'none') {
          if (listStyleTypeIndex > listStylePropValueIndex) {
            LIST_STYLE_VALUES[0] = listStyleTypeValue
          } else {
            const propValue = getValueOfTriProp(listStylePropValue, 'type')
            if (propValue) LIST_STYLE_VALUES[0] = propValue
          }

          if (listStylePositionIndex > listStylePropValueIndex) {
            LIST_STYLE_VALUES[1] = listStylePositionValue
          } else {
            const propValue = getValueOfTriProp(listStylePropValue, 'position')
            if (propValue) LIST_STYLE_VALUES[1] = propValue
          }

          if (listStyleImageIndex > listStylePropValueIndex) {
            LIST_STYLE_VALUES[2] = listStyleImageValue
          } else {
            const propValue = getValueOfTriProp(listStylePropValue, 'image')
            if (propValue) LIST_STYLE_VALUES[2] = propValue
          }
        } else {
          LIST_STYLE_VALUES[0] = listStylePropValue
          LIST_STYLE_VALUES[1] = ''
          LIST_STYLE_VALUES[2] = ''
        }
      }

      if (
        LIST_STYLE_VALUES.every((v) => v === '')
      ) {
        // !!!
      } else {
        listStyleProps = [...DEFAULT_LIST_STYLE_PROPS]
        listStyleValues = LIST_STYLE_VALUES
      }

      // check for !important
      const hasImportant = listStyleValues.some((listStyle) => /(!important)/g.test(listStyle))

      listStyleValues = listStyleValues.map((listStyle) => listStyle.replace(/(!important)/g, ''))

      if (hasImportant) {
        listStyleValues[listStyleValues.length - 1] += ' !important'
      }

      const declarations = rule.declarations

      // add declaration
      if (declarations.some(filterForListStyle)) {
        const i = declarations.findIndex(filterForListStyle)
        declarations.splice(i, 0, {
          type: 'declaration',
          property: 'list-style',
          value: listStyleValues.filter(Boolean).join(' ') // remove empty values
        })

        SUMMARY.stats.summary.noListStylesShortened += 1
      }

      if (declarations.some(filterForListStyleType)) {
        const i = declarations.findIndex(filterForListStyleType)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForListStylePosition)) {
        const i = declarations.findIndex(filterForListStylePosition)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForListStyleImage)) {
        const i = declarations.findIndex(filterForListStyleImage)
        declarations.splice(i, 1)
      }

      // remove existing listStyles
      const properties = declarations.filter(toProperty).map(toProperty)
      const j = properties.filter((property) => property === 'list-style').length
      if (j > 1) {
        for (let i = 1; i < j; ++i) {
          const was = properties.indexOf('list-style')
          const now = properties.indexOf('list-style', (was + 1))
          declarations.splice(now, 1)
        }
      }
    } // end of inherit check
  }
  // end of listStyle
}
