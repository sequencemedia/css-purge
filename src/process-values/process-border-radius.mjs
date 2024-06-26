import debug from 'debug'

import hasPropertyBorderRadius from '#utils/declarations/has-property-border-radius'
import hasPropertyBorderTopLeftRadius from '#utils/declarations/has-property-border-top-left-radius'
import hasPropertyBorderTopRightRadius from '#utils/declarations/has-property-border-top-right-radius'
import hasPropertyBorderBottomLeftRadius from '#utils/declarations/has-property-border-bottom-left-radius'
import hasPropertyBorderBottomRightRadius from '#utils/declarations/has-property-border-bottom-right-radius'

import hasInherit from '#utils/has-inherit'
import hasImportant from '#utils/has-important'
import toProperty from '#utils/to-property'
import toValue from '#utils/to-value'
import getValueOfSquareProp from '#utils/get-value-of-square-prop'

/**
 *  Preserve order
 */
const DEFAULT_BORDER_RADIUS_PROPERTIES = [
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius'
]

function hasBorderRadius (properties) {
  return properties.includes('border-radius') || (
    properties.includes('border-top-left-radius') &&
    properties.includes('border-top-right-radius') &&
    properties.includes('border-bottom-left-radius') &&
    properties.includes('border-bottom-right-radius')
  )
}

const log = debug('@sequencemedia/css-purge/process-border-radius')

export default function processBorderRadius (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const borderRadius = declarations.filter(hasPropertyBorderRadius)
    if (!borderRadius.some(hasInherit)) {
      let borderRadiusProperties = borderRadius.map(toProperty)
      if (hasBorderRadius(borderRadiusProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

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
        if (declarations.some(hasPropertyBorderRadius)) {
          const i = declarations.findIndex(hasPropertyBorderRadius)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'border-radius',
            value: borderRadiusValues.filter(Boolean).join(' ') // remove empty values
          })

          SUMMARY.stats.summary.noBorderRadiusShortened += 1
        }

        // remove originals
        if (declarations.some(hasPropertyBorderTopLeftRadius)) {
          const i = declarations.findIndex(hasPropertyBorderTopLeftRadius)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderTopRightRadius)) {
          const i = declarations.findIndex(hasPropertyBorderTopRightRadius)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderBottomLeftRadius)) {
          const i = declarations.findIndex(hasPropertyBorderBottomLeftRadius)
          declarations.splice(i, 1)
        }

        if (declarations.some(hasPropertyBorderBottomRightRadius)) {
          const i = declarations.findIndex(hasPropertyBorderBottomRightRadius)
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
