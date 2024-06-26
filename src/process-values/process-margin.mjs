import debug from 'debug'

import hasPropertyMargin from '#utils/declarations/has-property-margin'
import hasPropertyMarginTop from '#utils/declarations/has-property-margin-top'
import hasPropertyMarginRight from '#utils/declarations/has-property-margin-right'
import hasPropertyMarginBottom from '#utils/declarations/has-property-margin-bottom'
import hasPropertyMarginLeft from '#utils/declarations/has-property-margin-left'

import hasInherit from '#utils/has-inherit'
import hasImportant from '#utils/has-important'
import toProperty from '#utils/to-property'
import toValue from '#utils/to-value'
import getValueOfSquareProp from '#utils/get-value-of-square-prop'

/**
 *  Preserve order
 */
const DEFAULT_MARGIN_PROPERTIES = [
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left'
]

function hasMargin (properties) {
  return properties.includes('margin') || (
    properties.includes('margin-top') &&
    properties.includes('margin-right') &&
    properties.includes('margin-bottom') &&
    properties.includes('margin-left')
  )
}

const log = debug('@sequencemedia/css-purge/process-margin')

export default function processMargin (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const margin = declarations.filter(hasPropertyMargin)
    if (!margin.some(hasInherit)) {
      let marginProperties = margin.map(toProperty)
      if (hasMargin(marginProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

        let marginValues = margin.map(toValue)

        const marginTopIndex = marginProperties.indexOf('margin-top')
        const marginRightIndex = marginProperties.indexOf('margin-right')
        const marginBottomIndex = marginProperties.indexOf('margin-bottom')
        const marginLeftIndex = marginProperties.indexOf('margin-left')
        const marginTopValue = marginValues[marginTopIndex] ?? ''
        const marginRightValue = marginValues[marginRightIndex] ?? ''
        const marginBottomValue = marginValues[marginBottomIndex] ?? ''
        const marginLeftValue = marginValues[marginLeftIndex] ?? ''

        const MARGIN_VALUES = [
          marginTopValue,
          marginRightValue,
          marginBottomValue,
          marginLeftValue
        ]

        // existing margin check
        if (marginProperties.includes('margin')) {
          const marginPropValueIndex = marginProperties.indexOf('margin')
          const marginPropValue = marginValues[marginPropValueIndex]

          // fill missing attribute with existing margin
          if (marginTopIndex > marginPropValueIndex) {
            MARGIN_VALUES[0] = marginTopValue
          } else {
            const propValue = getValueOfSquareProp(marginPropValue, 'top')
            if (propValue) MARGIN_VALUES[0] = propValue
          }

          if (marginRightIndex > marginPropValueIndex) {
            MARGIN_VALUES[1] = marginRightValue
          } else {
            const propValue = getValueOfSquareProp(marginPropValue, 'right')
            if (propValue) MARGIN_VALUES[1] = propValue
          }

          if (marginBottomIndex > marginPropValueIndex) {
            MARGIN_VALUES[2] = marginBottomValue
          } else {
            const propValue = getValueOfSquareProp(marginPropValue, 'bottom')
            if (propValue) MARGIN_VALUES[2] = propValue
          }

          if (marginLeftIndex > marginPropValueIndex) {
            MARGIN_VALUES[3] = marginLeftValue
          } else {
            const propValue = getValueOfSquareProp(marginPropValue, 'left')
            if (propValue) MARGIN_VALUES[3] = propValue
          }
        }

        if (!MARGIN_VALUES.every((v) => v === '')) {
          marginProperties = [...DEFAULT_MARGIN_PROPERTIES]
          marginValues = MARGIN_VALUES
        }

        // check for !important
        if (marginValues.some(hasImportant)) {
          marginValues = marginValues.map((margin) => margin.replace(/(!important)/g, ''))
          marginValues[marginValues.length - 1] += ' !important'
        }

        // check for requirements
        if (
          marginProperties.includes('margin-top') &&
          marginProperties.includes('margin-right') &&
          marginProperties.includes('margin-bottom') &&
          marginProperties.includes('margin-left')
        ) {
          const marginTopIndex = marginProperties.indexOf('margin-top')
          const marginRightIndex = marginProperties.indexOf('margin-right')
          const marginBottomIndex = marginProperties.indexOf('margin-bottom')
          const marginLeftIndex = marginProperties.indexOf('margin-left')
          const marginTopValue = marginValues[marginTopIndex] ?? ''
          const marginRightValue = marginValues[marginRightIndex] ?? ''
          const marginBottomValue = marginValues[marginBottomIndex] ?? ''
          const marginLeftValue = marginValues[marginLeftIndex] ?? ''

          // 1 value
          if (
            marginTopValue === marginBottomValue &&
            marginTopValue === marginRightValue &&
            marginTopValue === marginLeftValue
          ) {
            marginProperties = ['margin']
            marginValues = [marginTopValue]
          } else {
            // 2 values
            if (
              marginTopValue === marginBottomValue &&
              marginRightValue === marginLeftValue
            ) {
              // remove Top + Bottom values
              marginValues.splice(marginTopIndex, 1)
              marginValues.splice(marginBottomIndex - 1, 1)
              // use Top as TopBottom
              marginValues.splice(0, 0, marginTopValue)

              // remove Top + Bottom properties
              marginProperties.splice(marginTopIndex, 1)
              marginProperties.splice(marginBottomIndex - 1, 1)
              // add TopBottom property - for alignment sake
              marginProperties.splice(0, 0, 'marginTopBottom')

              // remove Right + Left values
              marginValues.splice(marginRightIndex, 1)
              marginValues.splice(marginLeftIndex - 2, 1)
              // use Right as RightLeft value
              marginValues.splice(1, 0, marginRightValue)

              // remove Right + Left properties
              marginProperties.splice(marginRightIndex, 1)
              marginProperties.splice(marginLeftIndex - 2, 1)
              // add RightLeft property - for alignment sake
              marginProperties.splice(1, 0, 'marginRightLeft')
            } else {
              // 3 values
              if (
                marginRightValue === marginLeftValue
              ) {
                // remove Right + Left values
                marginValues.splice(marginRightIndex, 1)
                marginValues.splice(marginLeftIndex - 1, 1)
                // use Right as RightLeft value
                marginValues.splice(1, 0, marginRightValue)

                // remove Right + Left properties
                marginProperties.splice(marginRightIndex, 1)
                marginProperties.splice(marginLeftIndex - 1, 1)
                // add LeftRight property - for alignment sake
                marginProperties.splice(1, 0, 'marginLeftRight')
              }
            }
          }
        }

        // add declaration
        if (declarations.some(hasPropertyMargin)) {
          const i = declarations.findIndex(hasPropertyMargin)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'margin',
            value: marginValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noMarginsShortened += 1
        }

        // remove originals
        if (declarations.some(hasPropertyMarginTop)) {
          const i = declarations.findIndex(hasPropertyMarginTop)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyMarginRight)) {
          const i = declarations.findIndex(hasPropertyMarginRight)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyMarginBottom)) {
          const i = declarations.findIndex(hasPropertyMarginBottom)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyMarginLeft)) {
          const i = declarations.findIndex(hasPropertyMarginLeft)
          declarations.splice(i, 1)
        }

        // remove existing margins
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'margin').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('margin')
            const now = properties.indexOf('margin', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit check
    }
  }
}
