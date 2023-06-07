import cliColor from 'cli-color'

import filterForBackground from './utils/filter-for-background.mjs'
import filterForBackgroundColor from './utils/filter-for-background-color.mjs'
import filterForBackgroundImage from './utils/filter-for-background-image.mjs'
import filterForBackgroundRepeat from './utils/filter-for-background-repeat.mjs'
import filterForBackgroundAttachment from './utils/filter-for-background-attachment.mjs'
import filterForBackgroundPosition from './utils/filter-for-background-position.mjs'

import hasInherit from './utils/has-inherit.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getBackgroundProp from './utils/get-background-prop.mjs'

/**
 *  Retain order
 */
const DEFAULT_BACKGROUND_PROPS = [
  'background-color',
  'background-image',
  'background-repeat',
  'background-attachment',
  'background-position'
]

const success = cliColor.greenBright
const error = cliColor.red
const errorLine = cliColor.redBright

export default function processBackground (rule, OPTIONS, SUMMARY) {
  const {
    shorten_background_min: SHORTEN_BACKGROUND_MIN,
    verbose: VERBOSE
  } = OPTIONS

  if (VERBOSE) console.log('Process - Background')

  const background = rule.declarations.filter(filterForBackground)
  if (background.length >= SHORTEN_BACKGROUND_MIN) {
    if (VERBOSE) { console.log(success('Process - Values - Background : ' + rule.selectors.join(', '))) }

    let backgroundProps = background.map(toProperty)

    const backgroundHasInherit = background.some(hasInherit)
    if (!backgroundHasInherit) {
      let backgroundValues = background.map(toValue)

      const backgroundColorIndex = backgroundProps.indexOf('background-color')
      const backgroundImageIndex = backgroundProps.indexOf('background-image')
      const backgroundRepeatIndex = backgroundProps.indexOf('background-repeat')
      const backgroundAttachmentIndex = backgroundProps.indexOf('background-attachment')
      const backgoundPositionIndex = backgroundProps.indexOf('background-position')
      const backgroundColorValue = backgroundValues[backgroundColorIndex] ?? ''
      const backgroundImageValue = backgroundValues[backgroundImageIndex] ?? ''
      const backgroundRepeatValue = backgroundValues[backgroundRepeatIndex] ?? ''
      const backgroundAttachmentValue = backgroundValues[backgroundAttachmentIndex] ?? ''
      const backgoundPositionValue = backgroundValues[backgoundPositionIndex] ?? ''

      let BACKGROUND_VALUES = [
        backgroundColorValue,
        backgroundImageValue,
        backgroundRepeatValue,
        backgroundAttachmentValue,
        backgoundPositionValue
      ]

      // existing background check
      backgroundProps
        .forEach((backgroundProp, i) => {
          if (backgroundProp === 'background') {
            const backgroundPropValue = backgroundValues[i]

            if (backgroundPropValue.includes('gradient')) {
              if (backgroundColorIndex > i) {
                BACKGROUND_VALUES[0] = backgroundColorValue
              } else {
                const propValue = getBackgroundProp(backgroundPropValue, 'color')
                if (propValue) BACKGROUND_VALUES[0] = propValue
              }

              if (backgroundImageIndex > i) {
                BACKGROUND_VALUES[1] = backgroundImageValue
              } else {
                const propValue = getBackgroundProp(backgroundPropValue, 'image')
                if (propValue) BACKGROUND_VALUES[1] = propValue
              }

              if (backgroundRepeatIndex > i) {
                BACKGROUND_VALUES[2] = backgroundRepeatValue
              } else {
                const propValue = getBackgroundProp(backgroundPropValue, 'repeat')
                if (propValue) BACKGROUND_VALUES[2] = propValue
              }

              if (backgroundAttachmentIndex > i) {
                BACKGROUND_VALUES[3] = backgroundAttachmentValue
              } else {
                const propValue = getBackgroundProp(backgroundPropValue, 'attachment')
                if (propValue) BACKGROUND_VALUES[3] = propValue
              }

              if (backgoundPositionIndex > i) {
                BACKGROUND_VALUES[4] = backgoundPositionValue
              } else {
                const propValue = getBackgroundProp(backgroundPropValue, 'position')
                if (propValue) BACKGROUND_VALUES[4] = propValue
              }
            }
          }
        })

      const hasMultipleBackgrounds = backgroundValues.some((background) => background.match(/([^0-9]),([^0-9])/g))

      const hasGradient = backgroundValues.some((background) => background.includes('gradient'))

      if (hasMultipleBackgrounds && !hasGradient) {
        let backgroundPropValue = ''

        BACKGROUND_VALUES = BACKGROUND_VALUES
          .reduce((accumulator, backgroundValue) => {
            const [one, two] = backgroundValue.split(',')
            backgroundPropValue += (one) ? one.trim() + ' ' : ''
            backgroundPropValue += (two) ? two.trim() + ' ' : ''
            return accumulator.concat('')
          }, [])

        backgroundPropValue = backgroundPropValue.trim()
        backgroundPropValue += ', ' + backgroundPropValue.trim()
        BACKGROUND_VALUES[0] = backgroundPropValue
      }

      if (!hasGradient) {
        if (
          BACKGROUND_VALUES.every((v) => v === '')
        ) {
          // !!!
        } else {
          backgroundProps = [...DEFAULT_BACKGROUND_PROPS]
          backgroundValues = BACKGROUND_VALUES
        }

        // check for !important
        const hasImportant = backgroundValues.some((background) => /(!important)/g.test(background))

        backgroundValues = backgroundValues.map((background) => background.replace(/(!important)/g, ''))

        if (hasImportant) {
          backgroundValues[backgroundValues.length - 1] += ' !important'
        }

        const declarations = rule.declarations

        // add declaration
        if (declarations.some(filterForBackground)) {
          const i = declarations.findIndex(filterForBackground)
          declarations.splice(i, 0, {
            type: 'declaration',
            property: 'background',
            value: backgroundValues.filter(Boolean).join(' ') // remove from empty values
          })

          SUMMARY.stats.summary.noBackgroundsShortened += 1
        }

        // remove originals
        if (declarations.some(filterForBackgroundColor)) {
          const i = declarations.findIndex(filterForBackgroundColor)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBackgroundImage)) {
          const i = declarations.findIndex(filterForBackgroundImage)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBackgroundRepeat)) {
          const i = declarations.findIndex(filterForBackgroundRepeat)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBackgroundAttachment)) {
          const i = declarations.findIndex(filterForBackgroundAttachment)
          declarations.splice(i, 1)
        }

        if (declarations.some(filterForBackgroundPosition)) {
          const i = declarations.findIndex(filterForBackgroundPosition)
          declarations.splice(i, 1)
        }

        // remove existing backgrounds
        const properties = declarations.filter(toProperty).map(toProperty)
        const j = properties.filter((property) => property === 'background').length
        if (j > 1) {
          for (let i = 1; i < j; ++i) {
            const was = properties.indexOf('background')
            const now = properties.indexOf('background', (was + 1))
            declarations.splice(now, 1)
          }
        }
      }
    } // end of inherit check
  }
}
