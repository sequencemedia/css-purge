import cliColor from 'cli-color'

import filterForListStyle from './utils/filter-for-list-style.mjs'
import filterForListStyleType from './utils/filter-for-list-style-type.mjs'
import filterForListStylePosition from './utils/filter-for-list-style-position.mjs'
import filterForListStyleImage from './utils/filter-for-list-style-image.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_LIST_STYLE_PROPERTIES = [
  'list-style-type',
  'list-style-position',
  'list-style-image'
]

const LIST_STYLE_DEFAULT_VALUES = [
  'none',
  '',
  ''
]

const success = cliColor.greenBright

function hasListStyle (array) {
  return array.includes('list-style') || (
    array.includes('list-style-type') ||
    array.includes('list-style-position') ||
    array.includes('list-style-image')
  )
}

export default function processListStyle ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const listStyle = declarations.filter(filterForListStyle)
    if (!listStyle.some(hasInherit)) {
      let listStyleProperties = listStyle.map(toProperty)
      if (hasListStyle(listStyleProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - List-style : ' + selectors.join(', '))) }

        let listStyleValues = listStyle.map(toValue)

        const listStyleTypeIndex = listStyleProperties.indexOf('list-style-type')
        const listStylePositionIndex = listStyleProperties.indexOf('list-style-position')
        const listStyleImageIndex = listStyleProperties.indexOf('list-style-image')
        const listStyleTypeValue = listStyleValues[listStyleTypeIndex] ?? ''
        const listStylePositionValue = listStyleValues[listStylePositionIndex] ?? ''
        const listStyleImageValue = listStyleValues[listStyleImageIndex] ?? ''

        let LIST_STYLE_VALUES = [
          listStyleTypeValue,
          listStylePositionValue,
          listStyleImageValue
        ]

        // existing list style check
        if (listStyleProperties.includes('list-style')) {
          const listStylePropValueIndex = listStyleProperties.indexOf('list-style')
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
            LIST_STYLE_VALUES = [
              ...LIST_STYLE_DEFAULT_VALUES
            ]
          }
        }

        if (!LIST_STYLE_VALUES.every((v) => v === '')) {
          listStyleProperties = [...DEFAULT_LIST_STYLE_PROPERTIES]
          listStyleValues = LIST_STYLE_VALUES
        }

        // check for !important
        if (listStyleValues.some(hasImportant)) {
          listStyleValues = listStyleValues.map((listStyle) => listStyle.replace(/(!important)/g, ''))
          listStyleValues[listStyleValues.length - 1] += ' !important'
        }

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
  }
}
