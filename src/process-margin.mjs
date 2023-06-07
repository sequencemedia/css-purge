import cliColor from 'cli-color'

import filterForMargin from './utils/filter-for-margin.mjs'
import filterForMarginTop from './utils/filter-for-margin-top.mjs'
import filterForMarginRight from './utils/filter-for-margin-right.mjs'
import filterForMarginBottom from './utils/filter-for-margin-bottom.mjs'
import filterForMarginLeft from './utils/filter-for-margin-left.mjs'

import hasInherit from './utils/has-inherit.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfSquareProp from './utils/get-value-of-square-prop.mjs'

/**
 *  Retain order
 */
const DEFAULT_MARGIN_PROPS = [
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left'
]

const success = cliColor.greenBright
const error = cliColor.red
const errorLine = cliColor.redBright

export default function processMargin (rule, OPTIONS, SUMMARY) {
  const {
    verbose: VERBOSE
  } = OPTIONS

  if (VERBOSE) console.log('Process - Margin')

  const margin = rule.declarations.filter(filterForMargin)
  let marginProps = margin.map(toProperty)
  if ((
    marginProps.includes('margin-top') &&
    marginProps.includes('margin-right') &&
    marginProps.includes('margin-bottom') &&
    marginProps.includes('margin-left')
  ) ||
    marginProps.includes('margin')
  ) {
    if (VERBOSE) { console.log(success('Process - Values - Margin : ' + rule.selectors.join(', '))) }

    const marginHasInherit = margin.some(hasInherit)
    if (!marginHasInherit) {
      let marginValues = margin.map(toValue)

      const marginTopIndex = marginProps.indexOf('margin-top')
      const marginRightIndex = marginProps.indexOf('margin-right')
      const marginBottomIndex = marginProps.indexOf('margin-bottom')
      const marginLeftIndex = marginProps.indexOf('margin-left')
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
      if (marginProps.includes('margin')) {
        const marginPropValueIndex = marginProps.indexOf('margin')
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

      if (
        MARGIN_VALUES.every((v) => v === '')
      ) {
        //
      } else {
        marginProps = [...DEFAULT_MARGIN_PROPS]
        marginValues = MARGIN_VALUES
      }

      // check for !important
      const hasImportant = marginValues.some((margin) => /(!important)/g.test(margin))

      marginValues = marginValues.map((margin) => margin.replace(/(!important)/g, ''))

      if (hasImportant) {
        marginValues[marginValues.length - 1] += ' !important'
      }

      // check for requirements
      if (
        marginProps.includes('margin-top') &&
        marginProps.includes('margin-right') &&
        marginProps.includes('margin-bottom') &&
        marginProps.includes('margin-left')
      ) {
        const marginTopIndex = marginProps.indexOf('margin-top')
        const marginRightIndex = marginProps.indexOf('margin-right')
        const marginBottomIndex = marginProps.indexOf('margin-bottom')
        const marginLeftIndex = marginProps.indexOf('margin-left')
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
          marginProps = ['margin']
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
            marginProps.splice(marginTopIndex, 1)
            marginProps.splice(marginBottomIndex - 1, 1)
            // add TopBottom property - for alignment sake
            marginProps.splice(0, 0, 'marginTopBottom')

            // remove Right + Left values
            marginValues.splice(marginRightIndex, 1)
            marginValues.splice(marginLeftIndex - 2, 1)
            // use Right as RightLeft value
            marginValues.splice(1, 0, marginRightValue)

            // remove Right + Left properties
            marginProps.splice(marginRightIndex, 1)
            marginProps.splice(marginLeftIndex - 2, 1)
            // add RightLeft property - for alignment sake
            marginProps.splice(1, 0, 'marginRightLeft')
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
              marginProps.splice(marginRightIndex, 1)
              marginProps.splice(marginLeftIndex - 1, 1)
              // add LeftRight property - for alignment sake
              marginProps.splice(1, 0, 'marginLeftRight')
            }
          }
        }
      }

      const declarations = rule.declarations

      // add declaration
      if (declarations.some(filterForMargin)) {
        const i = declarations.findIndex(filterForMargin)
        declarations.splice(i, 0, {
          type: 'declaration',
          property: 'margin',
          value: marginValues.filter(Boolean).join(' ') // remove empty values
        })

        SUMMARY.stats.summary.noMarginsShortened += 1
      }

      // remove originals
      if (declarations.some(filterForMarginTop)) {
        const i = declarations.findIndex(filterForMarginTop)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForMarginRight)) {
        const i = declarations.findIndex(filterForMarginRight)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForMarginBottom)) {
        const i = declarations.findIndex(filterForMarginBottom)
        declarations.splice(i, 1)
      }

      if (declarations.some(filterForMarginLeft)) {
        const i = declarations.findIndex(filterForMarginLeft)
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
