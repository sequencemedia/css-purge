import cliColor from 'cli-color'

import filterForBorderRadius from './utils/filter-for-border-radius.mjs'
import filterForBorderTopLeftRadius from './utils/filter-for-border-top-left-radius.mjs'
import filterForBorderTopRightRadius from './utils/filter-for-border-top-right-radius.mjs'
import filterForBorderBottomLeftRadius from './utils/filter-for-border-bottom-left-radius.mjs'
import filterForBorderBottomRightRadius from './utils/filter-for-border-bottom-right-radius.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getValueOfSquareProp from './utils/get-value-of-square-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_RADIUS_PROPERTIES = [
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius'
]

const success = cliColor.greenBright

function hasBorderRadius (array) {
  return array.includes('border-radius') || (
    array.includes('border-top-left-radius') &&
    array.includes('border-top-right-radius') &&
    array.includes('border-bottom-left-radius') &&
    array.includes('border-bottom-right-radius')
  )
}

export default function processBorderRadius ({ declarations = [], selectors = [] }, OPTIONS, SUMMARY) {
  if (declarations.length) {
    const borderRadius = declarations.filter(filterForBorderRadius)
    let borderRadiusProperties = borderRadius.map(toProperty)
    if (hasBorderRadius(borderRadiusProperties)) {
      const {
        verbose: VERBOSE
      } = OPTIONS

      if (VERBOSE) { console.log(success('Process - Values - Border Radius : ' + selectors.join(', '))) }

      if (!borderRadius.some(hasInherit)) {
        let borderRadiusValues = borderRadius.map(toValue)

        const borderTopLeftRadiusIndex = borderRadiusProperties.indexOf('border-top-left-radius')
        const borderTopRightRadiusIndex = borderRadiusProperties.indexOf('border-top-right-radius')
        const borderBottomLeftRadiusIndex = borderRadiusProperties.indexOf('border-bottom-left-radius')
        const borderBottomRightRadiusIndex = borderRadiusProperties.indexOf('border-bottom-right-radius')
        const borderTopLeftRadiusValue = borderRadiusValues[borderTopLeftRadiusIndex] ?? ''
        const borderTopRightRadiusValue = borderRadiusValues[borderTopRightRadiusIndex] ?? ''
        const borderBottomLeftRadiusValue = borderRadiusValues[borderBottomLeftRadiusIndex] ?? ''
        const borderBottomRightRadiusValue = borderRadiusValues[borderBottomRightRadiusIndex] ?? ''

        const BORDER_RADIUS_VALUES = [
          borderTopLeftRadiusValue,
          borderTopRightRadiusValue,
          borderBottomLeftRadiusValue,
          borderBottomRightRadiusValue
        ]

        // existing border radius check
        if (borderRadiusProperties.includes('border-radius')) {
          const borderRadiusPropValueIndex = borderRadiusProperties.indexOf('border-radius')
          const borderRadiusPropValue = borderRadiusValues[borderRadiusPropValueIndex]

          if (borderTopLeftRadiusIndex > borderRadiusPropValueIndex) {
            BORDER_RADIUS_VALUES[0] = borderTopLeftRadiusValue
          } else {
            const propValue = getValueOfSquareProp(borderRadiusPropValue, 'top')
            if (propValue) BORDER_RADIUS_VALUES[0] = propValue
          }

          if (borderRadiusProperties.indexOf('border-top-right-radius') > borderRadiusPropValueIndex) {
            BORDER_RADIUS_VALUES[1] = borderTopRightRadiusValue
          } else {
            const propValue = getValueOfSquareProp(borderRadiusPropValue, 'right')
            if (propValue) BORDER_RADIUS_VALUES[1] = propValue
          }

          if (borderBottomLeftRadiusIndex > borderRadiusPropValueIndex) {
            BORDER_RADIUS_VALUES[2] = borderBottomLeftRadiusValue
          } else {
            const propValue = getValueOfSquareProp(borderRadiusPropValue, 'bottom')
            if (propValue) BORDER_RADIUS_VALUES[2] = propValue
          }

          if (borderBottomRightRadiusIndex > borderRadiusPropValueIndex) {
            BORDER_RADIUS_VALUES[3] = borderBottomRightRadiusValue
          } else {
            const propValue = getValueOfSquareProp(borderRadiusPropValue, 'left')
            if (propValue) BORDER_RADIUS_VALUES[3] = propValue
          }
        }

        borderRadiusProperties = [...DEFAULT_BORDER_RADIUS_PROPERTIES]
        borderRadiusValues = BORDER_RADIUS_VALUES

        // check for requirements
        if (
          borderRadiusProperties.includes('border-top-left-radius') &&
          borderRadiusProperties.includes('border-top-right-radius') &&
          borderRadiusProperties.includes('border-bottom-left-radius') &&
          borderRadiusProperties.includes('border-bottom-right-radius')
        ) {
          const borderTopLeftRadiusIndex = borderRadiusProperties.indexOf('border-top-left-radius')
          const borderTopRightRadiusIndex = borderRadiusProperties.indexOf('border-top-right-radius')
          const borderBottomLeftRadiusIndex = borderRadiusProperties.indexOf('border-bottom-left-radius')
          const borderBottomRightRadiusIndex = borderRadiusProperties.indexOf('border-bottom-right-radius')
          const borderTopLeftRadiusValue = borderRadiusValues[borderTopLeftRadiusIndex] ?? ''
          const borderTopRightRadiusValue = borderRadiusValues[borderTopRightRadiusIndex] ?? ''
          const borderBottomLeftRadiusValue = borderRadiusValues[borderBottomLeftRadiusIndex] ?? ''
          const borderBottomRightRadiusValue = borderRadiusValues[borderBottomRightRadiusIndex] ?? ''

          // 1 value
          if (
            borderTopLeftRadiusValue === borderBottomLeftRadiusValue &&
            borderTopLeftRadiusValue === borderTopRightRadiusValue &&
            borderTopLeftRadiusValue === borderBottomRightRadiusValue
          ) {
            borderRadiusProperties = ['border-radius']
            borderRadiusValues = [borderTopLeftRadiusValue]
          } else {
            // 2 values
            if (
              borderTopLeftRadiusValue === borderBottomLeftRadiusValue &&
              borderBottomRightRadiusValue === borderTopRightRadiusValue
            ) {
              // remove Top Left + Bottom Left values
              borderRadiusValues.splice(borderTopLeftRadiusIndex, 1)
              borderRadiusValues.splice(borderBottomLeftRadiusIndex - 1, 1)
              // use Top Left as Top Bottom value
              borderRadiusValues.splice(0, 0, borderTopLeftRadiusValue)

              // remove Top Left + Bottom Left properties
              borderRadiusProperties.splice(borderTopLeftRadiusIndex, 1)
              borderRadiusProperties.splice(borderBottomLeftRadiusIndex - 1, 1)
              // add TopBottom property - for alignment sake
              borderRadiusProperties.splice(0, 0, 'border-radius-top-bottom')

              // remove Top Right + Bottom Right values
              borderRadiusValues.splice(borderTopRightRadiusIndex, 1)
              borderRadiusValues.splice(borderBottomRightRadiusIndex - 2, 1)
              // use Top Right as Right Left value
              borderRadiusValues.splice(1, 0, borderTopRightRadiusValue)

              // remove Top Right + Bottom Right properties
              borderRadiusProperties.splice(borderTopRightRadiusIndex, 1)
              borderRadiusProperties.splice(borderBottomRightRadiusIndex - 2, 1)
              // add RightLeft property - for alignment sake
              borderRadiusProperties.splice(1, 0, 'border-radius-right-left')
            } else {
              // 3 values
              if (
                borderBottomRightRadiusValue === borderTopRightRadiusValue
              ) {
                // remove Top Right + Bottom Right values
                borderRadiusValues.splice(borderTopRightRadiusIndex, 1)
                borderRadiusValues.splice(borderBottomRightRadiusIndex - 1, 1)
                // use TopRight as TopBottom value
                borderRadiusValues.splice(1, 0, borderTopRightRadiusValue)

                // remove Top Right + Bottom Right properties
                borderRadiusProperties.splice(borderTopRightRadiusIndex, 1)
                borderRadiusProperties.splice(borderBottomRightRadiusIndex - 1, 1)
                // add LeftRight property - for alignment sake
                borderRadiusProperties.splice(1, 0, 'border-radius-left-right')
              }
            }
          }
        }

        // check for !important
        if (borderRadiusValues.some(hasImportant)) {
          borderRadiusValues = borderRadiusValues.map((borderRadius) => borderRadius.replace(/(!important)/g, ''))
          borderRadiusValues[borderRadiusValues.length - 1] += ' !important'
        }

        // add declaration
        if (declarations.some(filterForBorderRadius)) {
          const i = declarations.findIndex(filterForBorderRadius)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-radius',
            value: borderRadiusValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderRadiusShortened += 1
        }

        // remove originals
        if (declarations.some(filterForBorderTopLeftRadius)) {
          const i = declarations.findIndex(filterForBorderTopLeftRadius)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderTopRightRadius)) {
          const i = declarations.findIndex(filterForBorderTopRightRadius)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderBottomLeftRadius)) {
          const i = declarations.findIndex(filterForBorderBottomLeftRadius)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBorderBottomRightRadius)) {
          const i = declarations.findIndex(filterForBorderBottomRightRadius)
          declarations.splice(i, 1)
        }

        // remove existing borderRadiuss
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'border-radius').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('border-radius')
            const now = properties.indexOf('border-radius', (was + 1))
            declarations.splice(now, 1)
          }
        }
      } // end of inherit check
    }
  }
}
