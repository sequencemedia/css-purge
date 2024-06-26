import debug from 'debug'

import hasDeclarations from '#utils/declarations/has-declarations'
import hasTypeRule from '#utils/declarations/has-type-rule'

import processBackground from './process-values/process-background.mjs'
import processBorder from './process-values/process-border.mjs'
import processBorderTopRightBottomLeft from './process-values/process-border-top-right-bottom-left.mjs'
import processBorderBottom from './process-values/process-border-bottom.mjs'
import processBorderLeft from './process-values/process-border-left.mjs'
import processBorderRadius from './process-values/process-border-radius.mjs'
import processBorderRight from './process-values/process-border-right.mjs'
import processBorderTop from './process-values/process-border-top.mjs'
import processFont from './process-values/process-font.mjs'
import processHexColor from './process-values/process-hex-color.mjs'
import processListStyle from './process-values/process-list-style.mjs'
import processMargin from './process-values/process-margin.mjs'
import processOutline from './process-values/process-outline.mjs'
import processPadding from './process-values/process-padding.mjs'
import processZero from './process-values/process-zero.mjs'

const log = debug('@sequencemedia/css-purge/process-values')
const info = debug('@sequencemedia/css-purge:info')

log('`css-purge` is awake')

export default function processValues (rules, OPTIONS, SUMMARY) {
  info('Process values')

  const {
    shorten: SHORTEN = false,
    shorten_font: SHORTEN_FONT = false,
    shorten_background: SHORTEN_BACKGROUND = false,
    shorten_list_style: SHORTEN_LIST_STYLE = false,
    shorten_outline: SHORTEN_OUTLINE = false,
    shorten_border_top: SHORTEN_BORDER_TOP = false,
    shorten_border_right: SHORTEN_BORDER_RIGHT = false,
    shorten_border_bottom: SHORTEN_BORDER_BOTTOM = false,
    shorten_border_left: SHORTEN_BORDER_LEFT = false,
    shorten_border: SHORTEN_BORDER = false,
    shorten_border_radius: SHORTEN_BORDER_RADIUS = false,
    shorten_margin: SHORTEN_MARGIN = false,
    shorten_padding: SHORTEN_PADDING = false,
    shorten_zero: SHORTEN_ZERO = false,
    shorten_hexcolor: SHORTEN_HEXCOLOR = false
  } = OPTIONS

  rules
    .filter(Boolean)
    .filter(hasDeclarations)
    .filter(hasTypeRule)
    .forEach((rule) => {
      // font
      if (SHORTEN || SHORTEN_FONT) processFont(rule, OPTIONS, SUMMARY)

      // background
      if (SHORTEN || SHORTEN_BACKGROUND) processBackground(rule, OPTIONS, SUMMARY)

      // listStyle
      if (SHORTEN || SHORTEN_LIST_STYLE) processListStyle(rule, OPTIONS, SUMMARY)

      // outline
      if (SHORTEN || SHORTEN_OUTLINE) processOutline(rule, OPTIONS, SUMMARY)

      // borderTop
      if (SHORTEN || SHORTEN_BORDER_TOP) processBorderTop(rule, OPTIONS, SUMMARY)

      // borderRight
      if (SHORTEN || SHORTEN_BORDER_RIGHT) processBorderRight(rule, OPTIONS, SUMMARY)

      // borderBottom
      if (SHORTEN || SHORTEN_BORDER_BOTTOM) processBorderBottom(rule, OPTIONS, SUMMARY)

      // borderLeft
      if (SHORTEN || SHORTEN_BORDER_LEFT) processBorderLeft(rule, OPTIONS, SUMMARY)

      // borderTopRightBottomLeft & border
      if (SHORTEN || SHORTEN_BORDER) {
        processBorderTopRightBottomLeft(rule, OPTIONS, SUMMARY)

        processBorder(rule, OPTIONS, SUMMARY)
      }

      // borderRadius
      if (SHORTEN || SHORTEN_BORDER_RADIUS) processBorderRadius(rule, OPTIONS, SUMMARY)

      // margin
      if (SHORTEN || SHORTEN_MARGIN) processMargin(rule, OPTIONS, SUMMARY)

      // padding
      if (SHORTEN || SHORTEN_PADDING) processPadding(rule, OPTIONS, SUMMARY)

      // zero
      if (SHORTEN || SHORTEN_ZERO) processZero(rule, OPTIONS, SUMMARY)

      // hex color
      if (SHORTEN || SHORTEN_HEXCOLOR) processHexColor(rule, OPTIONS, SUMMARY)
    })
} // end of processValues
