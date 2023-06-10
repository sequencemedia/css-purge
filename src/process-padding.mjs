import cliColor from 'cli-color'

import filterForPadding from './utils/filter-for-padding.mjs'
import filterForPaddingTop from './utils/filter-for-padding-top.mjs'
import filterForPaddingRight from './utils/filter-for-padding-right.mjs'
import filterForPaddingBottom from './utils/filter-for-padding-bottom.mjs'
import filterForPaddingLeft from './utils/filter-for-padding-left.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfSquareProp from './utils/get-value-of-square-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_PADDING_PROPERTIES = [
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left'
]

// const DEFAULT_PADDING_VALUES = []

const success = cliColor.greenBright

function hasPadding (array) {
  return array.includes('padding') || (
    array.includes('padding-top') &&
    array.includes('padding-right') &&
    array.includes('padding-bottom') &&
    array.includes('padding-left')
  )
}

export default function processPadding ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const padding = declarations.filter(filterForPadding)
    if (!padding.some(hasInherit)) {
      let paddingProperties = padding.map(toProperty)
      if (hasPadding(paddingProperties)) {
        const {
          verbose: VERBOSE
        } = OPTIONS

        if (VERBOSE) { console.log(success('Process - Values - Padding : ' + selectors.join(', '))) }

        let paddingValues = padding.map(toValue)

        const paddingTopIndex = paddingProperties.indexOf('padding-top')
        const paddingRightIndex = paddingProperties.indexOf('padding-right')
        const paddingBottomIndex = paddingProperties.indexOf('padding-bottom')
        const paddingLeftIndex = paddingProperties.indexOf('padding-left')
        const paddingTopValue = paddingValues[paddingTopIndex] ?? ''
        const paddingRightValue = paddingValues[paddingRightIndex] ?? ''
        const paddingBottomValue = paddingValues[paddingBottomIndex] ?? ''
        const paddingLeftValue = paddingValues[paddingLeftIndex] ?? ''

        const PADDING_VALUES = [
          paddingTopValue,
          paddingRightValue,
          paddingBottomValue,
          paddingLeftValue
        ]

        // existing padding check
        if (paddingProperties.includes('padding')) {
          const paddingPropValueIndex = paddingProperties.indexOf('padding')
          const paddingPropValue = paddingValues[paddingPropValueIndex]

          if (paddingTopIndex > paddingPropValueIndex) {
            PADDING_VALUES[0] = paddingTopValue
          } else {
            const propValue = getValueOfSquareProp(paddingPropValue, 'top')
            if (propValue) PADDING_VALUES[0] = propValue
          }

          if (paddingRightIndex > paddingPropValueIndex) {
            PADDING_VALUES[1] = paddingRightValue
          } else {
            const propValue = getValueOfSquareProp(paddingPropValue, 'right')
            if (propValue) PADDING_VALUES[1] = propValue
          }

          if (paddingBottomIndex > paddingPropValueIndex) {
            PADDING_VALUES[2] = paddingBottomValue
          } else {
            const propValue = getValueOfSquareProp(paddingPropValue, 'bottom')
            if (propValue) PADDING_VALUES[2] = propValue
          }

          if (paddingLeftIndex > paddingPropValueIndex) {
            PADDING_VALUES[3] = paddingLeftValue
          } else {
            const propValue = getValueOfSquareProp(paddingPropValue, 'left')
            if (propValue) PADDING_VALUES[3] = propValue
          }
        }

        if (!PADDING_VALUES.every((v) => v === '')) {
          paddingProperties = [...DEFAULT_PADDING_PROPERTIES]
          paddingValues = PADDING_VALUES
        }

        // check for !important
        if (paddingValues.some(hasImportant)) {
          paddingValues = paddingValues.map((padding) => padding.replace(/(!important)/g, ''))
          paddingValues[paddingValues.length - 1] += ' !important'
        }

        // check for requirements
        if (
          paddingProperties.includes('padding-top') &&
          paddingProperties.includes('padding-right') &&
          paddingProperties.includes('padding-bottom') &&
          paddingProperties.includes('padding-left')
        ) {
          const paddingTopIndex = paddingProperties.indexOf('padding-top')
          const paddingRightIndex = paddingProperties.indexOf('padding-right')
          const paddingBottomIndex = paddingProperties.indexOf('padding-bottom')
          const paddingLeftIndex = paddingProperties.indexOf('padding-left')
          const paddingTopValue = paddingValues[paddingTopIndex] ?? ''
          const paddingRightValue = paddingValues[paddingRightIndex] ?? ''
          const paddingBottomValue = paddingValues[paddingBottomIndex] ?? ''
          const paddingLeftValue = paddingValues[paddingLeftIndex] ?? ''

          // 1 value
          if (
            paddingTopValue === paddingBottomValue &&
            paddingTopValue === paddingRightValue &&
            paddingTopValue === paddingLeftValue
          ) {
            paddingProperties = ['padding']
            paddingValues = [paddingTopValue]
          } else {
            // 2 values
            if (
              paddingTopValue === paddingBottomValue &&
              paddingRightValue === paddingLeftValue
            ) {
              // remove Top + Bottom values
              paddingValues.splice(paddingTopIndex, 1)
              paddingValues.splice(paddingBottomIndex - 1, 1)
              // use Top as TopBottom value
              paddingValues.splice(0, 0, paddingTopValue)

              // remove Top + Bottom properties
              paddingProperties.splice(paddingTopIndex, 1)
              paddingProperties.splice(paddingBottomIndex - 1, 1)
              // add TopBottom property - for alignment sake
              paddingProperties.splice(0, 0, 'paddingTopBottom')

              // remove Right + Left values
              paddingValues.splice(paddingRightIndex, 1)
              paddingValues.splice(paddingLeftIndex - 2, 1)
              // use Right as RightLeft value
              paddingValues.splice(1, 0, paddingRightValue)

              // remove Right + Left properties
              paddingProperties.splice(paddingRightIndex, 1)
              paddingProperties.splice(paddingLeftIndex - 2, 1)
              // add RightLeft property - for alignment sake
              paddingProperties.splice(1, 0, 'paddingRightLeft')
            } else {
              // 3 values
              if (
                paddingRightValue === paddingLeftValue
              ) {
                // remove Right + Left values
                paddingValues.splice(paddingRightIndex, 1)
                paddingValues.splice(paddingLeftIndex - 1, 1)
                // use Right as RightLeft value
                paddingValues.splice(1, 0, paddingRightValue)

                // remove Right + Left properties
                paddingProperties.splice(paddingRightIndex, 1)
                paddingProperties.splice(paddingLeftIndex - 1, 1)
                // add LeftRight property - for alignment sake
                paddingProperties.splice(1, 0, 'paddingLeftRight')
              }
            }
          }
        }

        // add declaration
        if (declarations.some(filterForPadding)) {
          const i = declarations.findIndex(filterForPadding)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'padding',
            value: paddingValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noPaddingsShortened += 1
        }

        // remove originals
        if (declarations.some(filterForPaddingTop)) {
          const i = declarations.findIndex(filterForPaddingTop)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForPaddingRight)) {
          const i = declarations.findIndex(filterForPaddingRight)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForPaddingBottom)) {
          const i = declarations.findIndex(filterForPaddingBottom)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForPaddingLeft)) {
          const i = declarations.findIndex(filterForPaddingLeft)
          declarations.splice(i, 1)
        }

        // remove existing paddings
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'padding').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('padding')
            const now = properties.indexOf('padding', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit check
    }
  }
}