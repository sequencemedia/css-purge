import debug from 'debug'

import hasPropertyBackground from './utils/declarations/has-property-background.mjs'
import hasPropertyBackgroundColor from './utils/declarations/has-property-background-color.mjs'
import hasPropertyBackgroundImage from './utils/declarations/has-property-background-image.mjs'
import hasPropertyBackgroundRepeat from './utils/declarations/has-property-background-repeat.mjs'
import hasPropertyBackgroundAttachment from './utils/declarations/has-property-background-attachment.mjs'
import hasPropertyBackgroundPosition from './utils/declarations/has-property-background-position.mjs'

import hasInherit from './utils/has-inherit.mjs'
import hasImportant from './utils/has-important.mjs'
import toProperty from './utils/to-property.mjs'
import toValue from './utils/to-value.mjs'
import getBackgroundProperty from './utils/get-background-prop.mjs'

/**
 *  Preserve order
 */
const DEFAULT_BACKGROUND_PROPERTIES = [
  'background-color',
  'background-image',
  'background-repeat',
  'background-attachment',
  'background-position'
]

const log = debug('@sequencemedia/css-purge/process-background')

function hasBackground (properties) {
  return properties.includes('background') || (
    properties.includes('background-color') ||
    properties.includes('background-image') ||
    properties.includes('background-repeat') ||
    properties.includes('background-attachment') ||
    properties.includes('background-position')
  )
}

export default function processBackground (rule, OPTIONS, SUMMARY) {
  const {
    declarations = []
  } = rule

  if (declarations.length) {
    const background = declarations.filter(hasPropertyBackground)
    if (!background.some(hasInherit)) {
      let backgroundProperties = background.map(toProperty)
      if (hasBackground(backgroundProperties)) {
        const {
          selectors = []
        } = rule

        log(selectors) // .join(', ').trim())

        let backgroundValues = background.map(toValue)

        const backgroundColorIndex = backgroundProperties.indexOf('background-color')
        const backgroundImageIndex = backgroundProperties.indexOf('background-image')
        const backgroundRepeatIndex = backgroundProperties.indexOf('background-repeat')
        const backgroundAttachmentIndex = backgroundProperties.indexOf('background-attachment')
        const backgoundPositionIndex = backgroundProperties.indexOf('background-position')
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
        backgroundProperties
          .forEach((backgroundProperty, i) => {
            if (backgroundProperty === 'background') {
              const backgroundValue = backgroundValues[i]

              if (backgroundValue.includes('gradient')) {
                if (backgroundColorIndex > i) {
                  BACKGROUND_VALUES[0] = backgroundColorValue
                } else {
                  const propValue = getBackgroundProperty(backgroundValue, 'color')
                  if (propValue) BACKGROUND_VALUES[0] = propValue
                }

                if (backgroundImageIndex > i) {
                  BACKGROUND_VALUES[1] = backgroundImageValue
                } else {
                  const propValue = getBackgroundProperty(backgroundValue, 'image')
                  if (propValue) BACKGROUND_VALUES[1] = propValue
                }

                if (backgroundRepeatIndex > i) {
                  BACKGROUND_VALUES[2] = backgroundRepeatValue
                } else {
                  const propValue = getBackgroundProperty(backgroundValue, 'repeat')
                  if (propValue) BACKGROUND_VALUES[2] = propValue
                }

                if (backgroundAttachmentIndex > i) {
                  BACKGROUND_VALUES[3] = backgroundAttachmentValue
                } else {
                  const propValue = getBackgroundProperty(backgroundValue, 'attachment')
                  if (propValue) BACKGROUND_VALUES[3] = propValue
                }

                if (backgoundPositionIndex > i) {
                  BACKGROUND_VALUES[4] = backgoundPositionValue
                } else {
                  const propValue = getBackgroundProperty(backgroundValue, 'position')
                  if (propValue) BACKGROUND_VALUES[4] = propValue
                }
              }
            }
          })

        const hasMultipleBackgrounds = backgroundValues.some((background) => background.match(/([^0-9]),([^0-9])/g))

        const hasGradient = backgroundValues.some((background) => background.includes('gradient'))

        if (hasMultipleBackgrounds && !hasGradient) {
          let backgroundPropertyValue = ''

          BACKGROUND_VALUES = BACKGROUND_VALUES
            .reduce((accumulator, backgroundValue) => {
              const [one, two] = backgroundValue.split(',')
              backgroundPropertyValue += one ? one.trim() + ' ' : ''
              backgroundPropertyValue += two ? two.trim() + ' ' : ''
              return accumulator.concat('')
            }, [])

          backgroundPropertyValue = backgroundPropertyValue.trim()
          if (backgroundPropertyValue) backgroundPropertyValue += ', ' + backgroundPropertyValue
          BACKGROUND_VALUES[0] = backgroundPropertyValue
        }

        if (!hasGradient) {
          if (!BACKGROUND_VALUES.every((v) => v === '')) {
            backgroundProperties = [...DEFAULT_BACKGROUND_PROPERTIES]
            backgroundValues = BACKGROUND_VALUES
          }

          // check for !important
          if (backgroundValues.some(hasImportant)) {
            backgroundValues = backgroundValues.map((background) => background.replace(/(!important)/g, ''))
            backgroundValues[backgroundValues.length - 1] += ' !important'
          }

          // add declaration
          if (declarations.some(hasPropertyBackground)) {
            const i = declarations.findIndex(hasPropertyBackground)
            declarations.splice(i, 0, {
              type: 'declaration',
              property: 'background',
              value: backgroundValues.filter(Boolean).join(' ') // remove from empty values
            })

            SUMMARY.stats.summary.noBackgroundsShortened += 1
          }

          // remove originals
          if (declarations.some(hasPropertyBackgroundColor)) {
            const i = declarations.findIndex(hasPropertyBackgroundColor)
            declarations.splice(i, 1)
          }

          if (declarations.some(hasPropertyBackgroundImage)) {
            const i = declarations.findIndex(hasPropertyBackgroundImage)
            declarations.splice(i, 1)
          }

          if (declarations.some(hasPropertyBackgroundRepeat)) {
            const i = declarations.findIndex(hasPropertyBackgroundRepeat)
            declarations.splice(i, 1)
          }

          if (declarations.some(hasPropertyBackgroundAttachment)) {
            const i = declarations.findIndex(hasPropertyBackgroundAttachment)
            declarations.splice(i, 1)
          }

          if (declarations.some(hasPropertyBackgroundPosition)) {
            const i = declarations.findIndex(hasPropertyBackgroundPosition)
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
      }
    } // end of inherit check
  }
}
