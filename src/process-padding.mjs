import debug from 'debug'

import hasPropertyPadding from './utils/declarations/has-property-padding.mjs'
import hasPropertyPaddingTop from './utils/declarations/has-property-padding-top.mjs'
import hasPropertyPaddingRight from './utils/declarations/has-property-padding-right.mjs'
import hasPropertyPaddingBottom from './utils/declarations/has-property-padding-bottom.mjs'
import hasPropertyPaddingLeft from './utils/declarations/has-property-padding-left.mjs'

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

function hasPadding (properties) {
  return properties.includes('padding') || (
    properties.includes('padding-top') &&
    properties.includes('padding-right') &&
    properties.includes('padding-bottom') &&
    properties.includes('padding-left')
  )
}

const log = debug('@sequencemedia/css-purge/process-padding')

export default function processPadding (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const padding = declarations.filter(hasPropertyPadding)
    if (!padding.some(hasInherit)) {
      let paddingProperties = padding.map(toProperty)
      if (hasPadding(paddingProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

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
        if (declarations.some(hasPropertyPadding)) {
          const i = declarations.findIndex(hasPropertyPadding)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'padding',
            value: paddingValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noPaddingsShortened += 1
        }

        // remove originals
        if (declarations.some(hasPropertyPaddingTop)) {
          const i = declarations.findIndex(hasPropertyPaddingTop)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyPaddingRight)) {
          const i = declarations.findIndex(hasPropertyPaddingRight)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyPaddingBottom)) {
          const i = declarations.findIndex(hasPropertyPaddingBottom)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyPaddingLeft)) {
          const i = declarations.findIndex(hasPropertyPaddingLeft)
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
