import path from 'node:path'
import {
  writeFileSync,
  createReadStream,
  existsSync,
  statSync
} from 'node:fs'
import EventEmitter from 'node:events'
import crypto from 'node:crypto'

import clc from 'cli-color'
import cssTools from '@adobe/css-tools'

import validUrl from 'valid-url'
import request from 'request'

import jsdom from 'jsdom'

import processColor from './process-color.mjs'

import DEFAULT_DECLARATION_NAMES from './default-declaration-names.mjs'

import toPosition from './utils/to-position.mjs'
import toValue from './utils/to-value.mjs'
import toProperty from './utils/to-property.mjs'

import processBackground from './process-background.mjs'
import processBorder from './process-border.mjs'
import processBorderBottom from './process-border-bottom.mjs'
import processBorderLeft from './process-border-left.mjs'
import processBorderRadius from './process-border-radius.mjs'
import processBorderRight from './process-border-right.mjs'
import processBorderTop from './process-border-top.mjs'
import processFont from './process-font.mjs'
import processHexColor from './process-hex-color.mjs'
import processListStyle from './process-list-style.mjs'
import processMargin from './process-margin.mjs'
import processOutline from './process-outline.mjs'
import processPadding from './process-padding.mjs'
import processZero from './process-zero.mjs'

import filterForDeclarations from './utils/filter-for-declarations.mjs'
import filterForRule from './utils/filter-for-rule.mjs'

import filterForBackground from './utils/filter-for-background.mjs'
import filterForBorder from './utils/filter-for-border.mjs'
import filterForBorderBottom from './utils/filter-for-border-bottom.mjs'
import filterForBorderLeft from './utils/filter-for-border-left.mjs'
import filterForBorderRadius from './utils/filter-for-border-radius.mjs'
import filterForBorderRight from './utils/filter-for-border-right.mjs'
import filterForBorderTop from './utils/filter-for-border-top.mjs'
import filterForBorderTopRightBottomLeft from './utils/filter-for-border-top-right-bottom-left.mjs'
import filterForFont from './utils/filter-for-font.mjs'
import filterForListStyle from './utils/filter-for-list-style.mjs'
import filterForMargin from './utils/filter-for-margin.mjs'
import filterForOutline from './utils/filter-for-outline.mjs'
import filterForPadding from './utils/filter-for-padding.mjs'

import getValueOfFontProp from './utils/get-value-of-font-prop.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'
import getValueOfSquareProp from './utils/get-value-of-square-prop.mjs'
import getBackgroundProp from './utils/get-background-prop.mjs'
import getFilePath from './utils/get-file-path.mjs'
import getFileSizeInKB from './utils/get-file-size-in-kilo-bytes.mjs'
import getSizeInKB from './utils/get-size-in-kilo-bytes.mjs'
import roundTo from './utils/round-to.mjs'
import escape from './utils/escape.mjs'

const hasInherit = ({ value }) => value.toLowerCase().includes('inherit')

const DEFAULT_BACKGROUND_PROPS = ['background-color', 'background-image', 'background-repeat', 'background-attachment', 'background-position']
const DEFAULT_FONT_PROPS = ['font-style', 'font-variant', 'font-weight', 'font-stretch', 'font-size', 'line-height', 'font-family']
const DEFAULT_LIST_STYLE_PROPS = ['list-style-type', 'list-style-position', 'list-style-image']
const DEFAULT_OUTLINE_PROPS = ['outline-width', 'outline-style', 'outline-color']
const DEFAULT_BORDER_TOP_PROPS = ['border-top-width', 'border-top-style', 'border-top-color']
const DEFAULT_BORDER_RIGHT_PROPS = ['border-right-width', 'border-right-style', 'border-right-color']
const DEFAULT_BORDER_BOTTOM_PROPS = ['border-bottom-width', 'border-bottom-style', 'border-bottom-color']
const DEFAULT_BORDER_LEFT_PROPS = ['border-left-width', 'border-left-style', 'border-left-color']
const DEFAULT_BORDER_PROPS = ['border-width', 'border-style', 'border-color']
const DEFAULT_BORDER_RADIUS_PROPS = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']
const DEFAULT_MARGIN_PROPS = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']
const DEFAULT_PADDING_PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']

const { JSDOM } = jsdom

const success = clc.greenBright
// const success2 = clc.green
const info = clc.xterm(123)
const error = clc.red
const errorLine = clc.redBright
// const warning = clc.yellow
// const awesome = clc.magentaBright
const logoRed = clc.xterm(197)
const cool = clc.xterm(105)

// const read = fs.readFileSync
// const write = fs.writeFileSync
// const appendToFileSync = fs.appendFileSync

let hash

class CSSPurgeEmitter extends EventEmitter {}

class CSSPurge {
  constructor () {
    let date = new Date()

    const cssPurgeEventEmitter = new CSSPurgeEmitter()

    let CONFIG = {
      options: {
        css: ['demo/test1.css'],

        new_reduce_common_into_parent: false,

        trim: true,
        trim_keep_non_standard_inline_comments: false,
        trim_removed_rules_previous_comment: false,
        trim_comments: false,
        trim_whitespace: false,
        trim_breaklines: false,
        trim_last_semicolon: false,
        bypass_media_rules: true,
        bypass_document_rules: false,
        bypass_supports_rules: false,
        bypass_page_rules: false,
        bypass_charset: false,
        shorten: true,
        shorten_zero: false,
        shorten_hexcolor: false,
        shorten_hexcolor_extended_names: false,
        shorten_hexcolor_UPPERCASE: false,
        shorten_font: false,
        shorten_background: false,
        shorten_background_min: 2,
        shorten_margin: false,
        shorten_padding: false,
        shorten_list_style: false,
        shorten_outline: false,
        shorten_border: false,
        shorten_border_top: false,
        shorten_border_right: false,
        shorten_border_bottom: false,
        shorten_border_left: false,
        shorten_border_radius: false,
        format: true,
        format_font_family: false,
        format_4095_rules_legacy_limit: false,
        special_convert_rem: false,
        special_convert_rem_browser_default_px: '16',
        special_convert_rem_desired_html_px: '10',
        special_convert_rem_font_size: true,
        special_reduce_with_html: false,
        special_reduce_with_html_ignore_selectors: [
          '@-ms-',
          ':-ms-',
          '::',
          ':valid',
          ':invalid',
          '+.',
          ':-'
        ],

        generate_report: false,
        report_file_location: 'css_purge_report.json',

        verbose: false,
        zero_units: 'em, ex, %, px, cm, mm, in, pt, pc, ch, rem, vh, vw, vmin, vmax',
        zero_ignore_declaration: ['filter'],
        reduce_declarations_file_location: 'config_reduce_declarations.json'
      }
    }

    let OPTIONS = {
      css_output: CONFIG.options.css_output,
      css: CONFIG.options.css,
      html: CONFIG.options.html,
      js: CONFIG.options.js,

      new_reduce_common_into_parent: CONFIG.options.new_reduce_common_into_parent,

      trim: CONFIG.options.trim,
      trim_keep_non_standard_inline_comments: CONFIG.options.trim_keep_non_standard_inline_comments,
      trim_removed_rules_previous_comment: CONFIG.options.trim_removed_rules_previous_comment,
      trim_comments: CONFIG.options.trim_comments,
      trim_whitespace: CONFIG.options.trim_whitespace,
      trim_breaklines: CONFIG.options.trim_breaklines,
      trim_last_semicolon: CONFIG.options.trim_last_semicolon,
      bypass_media_rules: CONFIG.options.bypass_media_rules,
      bypass_document_rules: CONFIG.options.bypass_document_rules,
      bypass_supports_rules: CONFIG.options.bypass_supports_rules,
      bypass_page_rules: CONFIG.options.bypass_page_rules,
      bypass_charset: CONFIG.options.bypass_charset,
      shorten: CONFIG.options.shorten,
      shorten_zero: CONFIG.options.shorten_zero,
      shorten_hexcolor: CONFIG.options.shorten_hexcolor,
      shorten_hexcolor_extended_names: CONFIG.options.shorten_hexcolor_extended_names,
      shorten_hexcolor_UPPERCASE: CONFIG.options.shorten_hexcolor_UPPERCASE,
      shorten_font: CONFIG.options.shorten_font,
      shorten_background: CONFIG.options.shorten_background,
      shorten_background_min: CONFIG.options.shorten_background_min,
      shorten_margin: CONFIG.options.shorten_margin,
      shorten_padding: CONFIG.options.shorten_padding,
      shorten_list_style: CONFIG.options.shorten_list_style,
      shorten_outline: CONFIG.options.shorten_outline,
      shorten_border: CONFIG.options.shorten_border,
      shorten_border_top: CONFIG.options.shorten_border_top,
      shorten_border_right: CONFIG.options.shorten_border_right,
      shorten_border_bottom: CONFIG.options.shorten_border_bottom,
      shorten_border_left: CONFIG.options.shorten_border_left,
      shorten_border_radius: CONFIG.options.shorten_border_radius,
      format: CONFIG.options.format,
      format_font_family: CONFIG.options.format_font_family,
      format_4095_rules_legacy_limit: CONFIG.options.format_4095_rules_legacy_limit,
      special_convert_rem: CONFIG.options.special_convert_rem,
      special_convert_rem_browser_default_px: CONFIG.options.special_convert_rem_browser_default_px,
      special_convert_rem_desired_html_px: CONFIG.options.special_convert_rem_desired_html_px,
      special_convert_rem_font_size: CONFIG.options.special_convert_rem_font_size,
      special_reduce_with_html: CONFIG.options.special_reduce_with_html,
      special_reduce_with_html_ignore_selectors: CONFIG.options.special_reduce_with_html_ignore_selectors,

      generate_report: CONFIG.options.generate_report,
      verbose: CONFIG.options.verbose,
      zero_units: CONFIG.options.zero_units,
      zero_ignore_declaration: CONFIG.options.zero_ignore_declaration,
      report_file_location: CONFIG.options.report_file_location,
      reduce_declarations_file_location: CONFIG.options.reduce_declarations_file_location
    }

    let currentConfig = null

    const dataCSSIn = []
    let dataHTMLIn = []
    const dataJSIn = []

    let jsDom = null
    let jsDomWindow = null
    let jsDomDoc = null
    const resultsCount = 0

    let REPORT_DUPLICATE_CSS = CONFIG.options.report_file_location

    const summary = {
      files: {
        input: [],
        output: [],
        input_html: [],
        input_js: []
      },
      options_used: {
        new_reduce_common_into_parent: OPTIONS.new_reduce_common_into_parent,
        trim: OPTIONS.trim,
        trim_comments: OPTIONS.trim_comments,
        trim_keep_non_standard_inline_comments: OPTIONS.trim_keep_non_standard_inline_comments,
        trim_removed_rules_previous_comment: OPTIONS.trim_removed_rules_previous_comment,
        trim_whitespace: OPTIONS.trim_whitespace,
        trim_breaklines: OPTIONS.trim_breaklines,
        trim_last_semicolon: OPTIONS.trim_last_semicolon,
        shorten: OPTIONS.shorten,
        shorten_zero: OPTIONS.shorten_zero,
        shorten_hexcolor: OPTIONS.shorten_hexcolor,
        shorten_hexcolor_extended_names: OPTIONS.shorten_hexcolor_extended_names,
        shorten_hexcolor_UPPERCASE: OPTIONS.shorten_hexcolor_UPPERCASE,
        shorten_font: OPTIONS.shorten_font,
        shorten_background: OPTIONS.shorten_background,
        shorten_margin: OPTIONS.shorten_margin,
        shorten_padding: OPTIONS.shorten_padding,
        shorten_list_style: OPTIONS.shorten_list_style,
        shorten_outline: OPTIONS.shorten_outline,
        shorten_border: OPTIONS.shorten_border,
        shorten_border_top: OPTIONS.shorten_border_top,
        shorten_border_right: OPTIONS.shorten_border_right,
        shorten_border_bottom: OPTIONS.shorten_border_bottom,
        shorten_border_left: OPTIONS.shorten_border_left,
        shorten_border_radius: OPTIONS.shorten_border_radius,
        format: OPTIONS.format,
        format_font_family: OPTIONS.format_font_family,
        format_4095_rules_legacy_limit: OPTIONS.format_4095_rules_legacy_limit,
        special_convert_rem: OPTIONS.special_convert_rem,
        special_convert_rem_browser_default_px: OPTIONS.special_convert_rem_browser_default_px,
        special_convert_rem_desired_html_px: OPTIONS.special_convert_rem_desired_html_px,
        special_convert_rem_font_size: OPTIONS.special_convert_rem_font_size,
        generate_report: OPTIONS.generate_report,
        verbose: OPTIONS.verbose,
        bypass_media_rules: OPTIONS.bypass_media_rules,
        bypass_document_rules: OPTIONS.bypass_document_rules,
        bypass_supports_rules: OPTIONS.bypass_supports_rules,
        bypass_page_rules: OPTIONS.bypass_page_rules,
        bypass_charset: OPTIONS.bypass_charset,
        special_reduce_with_html: OPTIONS.special_reduce_with_html,
        special_reduce_with_html_ignore_selectors: OPTIONS.special_reduce_with_html_ignore_selectors
      },
      stats: {},
      duplicate_rules: [],
      duplicate_declarations: [],
      empty_declarations: [],
      selectors_removed: []
    }

    // stats
    const stats = {
      files: {
        css: [],
        html: [],
        js: []
      },
      before: {
        totalFileSizeKB: 0,
        noNodes: 0,
        noRules: 0,
        noDeclarations: 0,
        noComments: 0,
        noCharset: 0,
        noCustomMedia: 0,
        noDocument: 0,
        noFontFace: 0,
        noHost: 0,
        noImport: 0,
        noKeyframes: 0,
        noKeyframe: 0,
        noMedia: 0,
        noNamespace: 0,
        noPage: 0,
        noSupports: 0
      },
      after: {
        totalFileSizeKB: 0,
        noNodes: 0,
        noRules: 0,
        noDeclarations: 0,
        noComments: 0,
        noCharset: 0,
        noCustomMedia: 0,
        noDocument: 0,
        noFontFace: 0,
        noHost: 0,
        noImport: 0,
        noKeyframes: 0,
        noKeyframe: 0,
        noMedia: 0,
        noNamespace: 0,
        noPage: 0,
        noSupports: 0
      },
      summary: {
        savingsKB: 0,
        savingsPercentage: 0,
        noDuplicateRules: 0,
        noDuplicateDeclarations: 0,
        noZerosShortened: 0,
        noNamedColorsShortened: 0,
        noHexColorsShortened: 0,
        noRGBColorsShortened: 0,
        noHSLColorsShortened: 0,
        noFontsShortened: 0,
        noBackgroundsShortened: 0,
        noMarginsShortened: 0,
        noPaddingsShortened: 0,
        noListStylesShortened: 0,
        noOutlinesShortened: 0,
        noBordersShortened: 0,
        noBorderTopsShortened: 0,
        noBorderRightsShortened: 0,
        noBorderBottomsShortened: 0,
        noBorderLeftsShortened: 0,
        noBorderTopRightBottomLeftsShortened: 0,
        noBorderRadiusShortened: 0,
        noLastSemiColonsTrimmed: 0,
        noInlineCommentsTrimmed: 0,
        noReductions: {
          noNodes: 0,
          noRules: 0,
          noDeclarations: 0,
          noComments: 0,
          noCharset: 0,
          noCustomMedia: 0,
          noDocument: 0,
          noFontFace: 0,
          noHost: 0,
          noImport: 0,
          noKeyframes: 0,
          noKeyframe: 0,
          noMedia: 0,
          noNamespace: 0,
          noPage: 0,
          noSupports: 0
        }
      }
    }

    /* read declaration reduce lists */
    let CONFIG_REDUCE_DECLARATIONS = 'config_reduce_declarations.json'
    let hasReadReduceDeclarations = false

    let selectors = ''
    let selectorsCount = 0
    const selectorPropertyValues = []

    let declarationNames = [
      ...DEFAULT_DECLARATION_NAMES
    ]
    let declarationNamesCount = declarationNames.length

    const configFileLocation = 'config_css.json'
    let fileLocation = 'demo/test1.css'
    // const outputFileLocation = 'demo/test1_out.css'
    // let htmlFileLocation = ''
    let readStream
    let readHTMLStream
    // let readJSStream
    let readCSSFileCount = 0
    let readHTMLFileCount = 0
    // const readJSFileCount = 0
    let fileSizeKB = 0

    let declarations
    let declarationsNameCounts
    let declarationsCounts
    let declarationsValueCounts

    let amountRemoved
    let selectorPropertiesList

    let results
    let results1
    let results2
    let results3
    let results4

    let files

    let RULES_COUNT
    let rulesCount2
    let rulesCount3
    let rulesCount4

    let charset
    let charset2

    let duplicateIds

    let fontValuesOutput = []

    let fontVal = null

    let background = null
    let backgroundValuesOutput = []

    let hasMultipleBackgrounds = false
    let hasGradient = false

    let margin = null
    let marginValuesOutput = []

    let padding = null
    let paddingValuesOutput = []

    let listStyle = null
    let listStyleValuesOutput = []

    let outline = null
    let outlineValuesOutput = []

    let border = null
    let borderValuesOutput = []

    let borderTop = null
    let borderTopValuesOutput = []

    let borderRight = null
    let borderRightValuesOutput = []

    let borderBottom = null
    let borderBottomValuesOutput = []

    let borderLeft = null
    let borderLeftValuesOutput = []

    let borderTopRightBottomLeftValuesOutput = []

    let borderRadius = null
    let borderRadiusValuesOutput = []

    const tokensComments = []
    const _3tokenValues = []
    const _4tokenValues = []
    const _5tokenValues = []
    const _6tokenValues = []
    const _7tokenValues = []

    const h = 0
    const i = 0
    const j = 0
    const k = 0
    const l = 0

    let DECLARATION_COUNT = 0

    let cCount = 0
    const ilen = 0
    const jlen = 0
    const klen = 0

    function trimCSS (outputCSSIn) {
      // imports - move imports to top of page
      let imports = ''
      outputCSSIn = outputCSSIn.replace(/@import.*(([\n\r\t]*)(\s*)\/\*(_cssp_sc).\*\/)?([\n\r\t])+/gm, (match) => {
        imports += match.substr(0, match.length - 1) + ''
        return ''
      })
      outputCSSIn = imports + outputCSSIn

      // charset - move charset to top of page
      let charset = ''
      outputCSSIn = outputCSSIn.replace(/@charset.*(([\n\r\t]*)(\s*)\/\*(_cssp_sc).\*\/)?([\n\r\t])+/gm, (match) => {
        charset += match + ''
        return ''
      })
      outputCSSIn = charset + outputCSSIn

      if (OPTIONS.trim_breaklines || OPTIONS.trim) {
        outputCSSIn = outputCSSIn.replace(/\r?\n|\r/g, '')
      }

      if (OPTIONS.trim_whitespace || OPTIONS.trim) {
        if (OPTIONS.trim_comments || OPTIONS.trim) {
          // remove any left over comments and tabs
          outputCSSIn = outputCSSIn.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\t]+/g, '')
        }

        // remove single adjacent spaces
        outputCSSIn = outputCSSIn.replace(/ {2,}/g, ' ')
        outputCSSIn = outputCSSIn.replace(/ ([{:}]) /g, '$1')
        outputCSSIn = outputCSSIn.replace(/([{:}]) /g, '$1')
        outputCSSIn = outputCSSIn.replace(/([;,]) /g, '$1')
        outputCSSIn = outputCSSIn.replace(/\(\s*/g, '(')
        outputCSSIn = outputCSSIn.replace(/\s*\)/g, ')')
        outputCSSIn = outputCSSIn.replace(/ !/g, '!')
      }

      if (OPTIONS.trim_last_semicolon || OPTIONS.trim) {
        outputCSSIn = outputCSSIn.replace(/{([^}]*)}/gm, function (match, capture) {
          summary.stats.summary.noLastSemiColonsTrimmed += 1
          // console.log(capture)
          // return "{" + capture + "}";
          return '{' + capture.replace(/\;(?=[^;]*$)/, '') + '}'
        })
      }

      return outputCSSIn
    }

    function restoreHacks (outputCSSIn) {
      // tokens
      /// /hacks
      /// **/
      outputCSSIn = outputCSSIn.replace(/(_1token_hck)/g, '/**/')

      /// *\**/
      outputCSSIn = outputCSSIn.replace(/(_2token_hck)/g, '/*\\**/')

      // (specialchar)property
      outputCSSIn = outputCSSIn.replace(/(_3token_hck_([0-9]*): ;)/g, (match) => {
        const value = _3tokenValues[match.substring(12, match.length - 3) - 1]
        return value.substring(0, value.length) + ';'
      })

      // (;
      outputCSSIn = outputCSSIn.replace(/(_4token_hck_)[0-9]*[:][\s]*[;]/g, (match) => {
        const value = _4tokenValues[match.substring(12, match.length - 3) - 1]
        return value.substring(0, value.length - 2)
      })

      // [;
      outputCSSIn = outputCSSIn.replace(/(_5token_hck_)[0-9]*[:][\s]*[;]/g, (match) => {
        const value = _5tokenValues[match.substring(12, match.length - 3) - 1]
        return value.substring(0, value.length - 2)
      })

      // tokens - data:image
      outputCSSIn = outputCSSIn.replace(/(_6token_dataimage_)[0-9]*[:][\s]*/g, (match) => {
        const value = _6tokenValues[match.substring(18, match.length - 1) - 1]
        return value.substring(0, value.length) + ';'
      })

      // tokens - allow multi-keyframe selectors
      outputCSSIn = outputCSSIn.replace(/(@keyframes _7token_)[0-9]*[\s]*/g, (match) => {
        const value = _7tokenValues[match.substring(19, match.length) - 1]
        return trimCSS(value).substring(0, value.length) + ''
      })

      // tokens - replace side comments
      for (const key in tokensComments) {
        const regExp = new RegExp(`([\\n\\r\\t]*)(\\s*)\\/\\*(${key})\\*\\/`, 'gm')
        outputCSSIn = outputCSSIn.replace(regExp, tokensComments[key])
      }

      // tokens - end of replace side comments
      return outputCSSIn
    }

    function processHTMLSelectors (cssSelectors, htmlDataIn = null, htmlOptionsIn = null) {
      if (OPTIONS.verbose) { console.log(info('Process - HTML - Determine Rules to Remove')) }

      let htmlData = dataHTMLIn.join('')
      if (htmlDataIn !== null && htmlDataIn !== undefined) {
        htmlData = htmlDataIn
      }
      if (htmlOptionsIn !== null && htmlOptionsIn !== undefined) {
        for (const key in htmlOptionsIn) {
          OPTIONS.html[key] = htmlOptionsIn[key]
        }
      }

      // find values in ids
      results = []
      results1 = htmlData.match(/\bid\b[=](["'])(?:(?=(\\?))\2.)*?\1/gm)
      if (results1 !== null) {
        for (let i = 0, ilen = results1.length; i < ilen; ++i) {
          if (results1[i] !== null) {
            results1[i] = results1[i].split('=')[1].replace(/['"]+/g, '')
          }
        }
        results1 = Array.from(new Set(results1))
        results = results.concat(results1)
      }

      // find values in classes
      results2 = htmlData.match(/\bclass\b[=](["'])(?:(?=(\\?))\2.)*?\1/gm)
      if (results2 !== null) {
        for (let i = 0, ilen = results2.length; i < ilen; ++i) {
          if (results2[i] !== null) {
            results2[i] = results2[i].split('=')[1].replace(/['"]+/g, '')
          }
        }
        results2 = Array.from(new Set(results2))
        results = results.concat(results2)
      }

      // find values in internal selectors
      results3 = htmlData.match(/<style([\S\s]*?)>([\S\s]*?)<\/style>/gi)
      if (results3 !== null) {
        results4 = []
        for (let i = 0, ilen = results3.length; i < ilen; ++i) {
          if (results3[i] !== null) {
            results3[i] = results3[i].split('</')[0].split('>')[1]
            results4 = results4.concat(results3[i].match(/([#}.])([^0-9])([\S\s]*?){/g))
          }
        }
        results3 = []
        for (let i = 0, ilen = results4.length; i < ilen; ++i) {
          if (results4[i] !== null) {
            results4[i] = results4[i].replace(/\r?\n|\r|\s/g, '')
            results4[i] = results4[i].replace('{', '')
            results4[i] = results4[i].replace('}', '')
            results3 = results3.concat(results4[i].split(','))
          }
        }
        results3 = Array.from(new Set(results3))
        results = results.concat(results3)
      }

      // find values in the dom
      jsDom = new JSDOM(htmlData, { contentType: 'text/html' })
      jsDomWindow = jsDom.window
      jsDomDoc = jsDomWindow.document

      for (let i = 0, resultsCount = cssSelectors.length; i < resultsCount; ++i) {
        for (let j = 0, jlen = results.length; j < jlen; ++j) {
          if (cssSelectors[i] == results[j]) {
            cssSelectors.splice(i, 1)
            resultsCount -= 1
            i -= 1
            break
          }
        }

        if (jsDomDoc.querySelector(cssSelectors[i]) != null) {
          cssSelectors.splice(i, 1)
          resultsCount -= 1
          i -= 1
        }
      }

      return cssSelectors
    } // end of processHTMLSelectors

    function processHTML (cssSelectors = [], htmlDataIn = null, htmlOptionsIn = null) {
      // read html files
      if (OPTIONS.html !== '' && OPTIONS.html !== undefined && OPTIONS.special_reduce_with_html) {
        let htmlFiles = OPTIONS.html

        // check for file or files
        switch (typeof htmlFiles) {
          case 'object':
          {
            const collector = []

            Object.values(htmlFiles)
              .forEach((htmlFile) => {
                getFilePath(htmlFile, ['.html', '.htm'], collector)
              })

            if (collector.length) {
              htmlFiles = collector
            }
          }
          case 'array':
            {
              const collector = []

              htmlFiles
                .forEach((htmlFile) => {
                  getFilePath(htmlFile, ['.html', '.htm'], collector)
                })

              if (collector.length) {
                htmlFiles = collector
              }
            }
            break
          case 'string':
            // formats
            {
              htmlFiles = htmlFiles.replace(/ /g, '')

              // comma delimited list - filename1.html, filename2.html
              if (htmlFiles.indexOf(',') > -1) {
                htmlFiles = htmlFiles.replace(/^\s+|\s+$/g, '').split(',')
                tmpStr = ''

                const collector = []

                htmlFiles
                  .forEach((htmlFile) => {
                    getFilePath(htmlFile, ['.html', '.htm'], collector)
                  })

                if (collector.length) {
                  htmlFiles = collector
                }
              } else {
                const collector = []

                // string path
                getFilePath(htmlFiles, ['.html', '.htm'], collector)

                if (collector.length) {
                  htmlFiles = collector
                }
              }
            }
            break
        } // end of switch

        htmlFileLocation = (htmlFiles) ? htmlFiles.toString() : htmlFiles

        readHTMLFile(htmlFiles)

        cssPurgeEventEmitter.on('HTML_READ_AGAIN', function () {
          // process selectors
          processHTMLSelectors(cssSelectors, htmlDataIn, htmlOptionsIn)

          // read next file
          dataHTMLIn = []
          readHTMLFile(htmlFiles)
        })
        cssPurgeEventEmitter.on('HTML_READ_END', function () {
          // process selectors
          processHTMLSelectors(cssSelectors, htmlDataIn, htmlOptionsIn)

          dataHTMLIn = []
          cssPurgeEventEmitter.emit('HTML_RESULTS_END', cssSelectors)
        })
      } // end of html files check
    }

    function readHTMLFile (files = []) {
      if (OPTIONS.verbose) { console.log(info('Input - HTML File : ' + files[readHTMLFileCount])) }

      if (validUrl.isUri(files[readHTMLFileCount])) {
        request({
          url: files[readHTMLFileCount],
          method: 'GET'
        }, function (err, head, body) {
          let fileSizeKB = 0

          if (head) {
            const contentLength = head.headers['content-length']

            if (!contentLength) {
              fileSizeKB = getSizeInKB(body)
            } else {
              fileSizeKB = contentLength / 1000
            }
          } else {
            /**
             * `getSizeInKB(body)` above does not divide by 1000
             */
            fileSizeKB = getSizeInKB(body) / 1000
          }

          stats.files.html.push({
            fileName: files[readHTMLFileCount],
            fileSizeKB
          })
        })
      } else {
        const fileSizeKB = getFileSizeInKB(files[readHTMLFileCount])

        stats.files.html.push({
          fileName: files[readHTMLFileCount],
          fileSizeKB
        })
      }

      summary.files.input_html.push(files[readHTMLFileCount])

      if (validUrl.isUri(files[readHTMLFileCount])) {
        request(files[readHTMLFileCount], function (err, response, body) {
          if (response === undefined) {
            // try again
            request(files[readHTMLFileCount], function (err, response, body) {
              if (response.statusCode === 200) {
                dataHTMLIn.push(body)

                readHTMLFileCount += 1

                if (readHTMLFileCount < files.length) {
                  cssPurgeEventEmitter.emit('HTML_READ_AGAIN')
                } else {
                  cssPurgeEventEmitter.emit('HTML_READ_END')
                }
              } else {
                cssPurgeEventEmitter.emit('HTML_READ_ERROR')
                console.log(error('HTML File read error: check your HTML files and please try again.'))
                console.log(err)
                process.exit(1)
              }
            })
          } else if (response.statusCode === 200) {
            dataHTMLIn.push(body)

            readHTMLFileCount += 1

            if (readHTMLFileCount < files.length) {
              cssPurgeEventEmitter.emit('HTML_READ_AGAIN')
            } else {
              cssPurgeEventEmitter.emit('HTML_READ_END')
            }
          } else {
            cssPurgeEventEmitter.emit('HTML_READ_ERROR')
            console.log(error('HTML File read error: check your HTML files and please try again.'))
            console.log(err)
            process.exit(1)
          }
        })
      } else {
        readHTMLStream = createReadStream(files[readHTMLFileCount], 'utf8')

        readHTMLStream.on('data', function (chunk) {
          dataHTMLIn.push(chunk)
        }).on('end', function () {
          readHTMLFileCount += 1
          if (readHTMLFileCount < files.length) {
            cssPurgeEventEmitter.emit('HTML_READ_AGAIN')
          } else {
            cssPurgeEventEmitter.emit('HTML_READ_END')
          }
        }).on('error', function (e) {
          cssPurgeEventEmitter.emit('HTML_READ_ERROR')
          console.log(error('HTML File read error: Something went wrong while reading the file(s), check your HTML files and please try again.'))
          console.log(e)
          process.exit(1)
        })
      }
    } // end of readHTMLFile

    function readReduceDeclarations (jsonConfigIn = '') {
      if (jsonConfigIn) {
        const jsonConfig = jsonConfigIn
        declarationNames = jsonConfig.declaration_names
        selectors = jsonConfig.selectors

        switch (typeof selectors) {
          case 'string':
            if (selectors.length) {
              selectors = selectors.replace(/^\s+|\s+$/g, '')
              selectors = selectors.replace(/\r?\n|\r/g, '')
              selectors = selectors.split(',')
              selectorsCount = selectors.length
            } else {
              selectors = null
            }
            break
          case 'object':
            const selectorPropertyKeys = []
            for (const i in selectors) {
              selectorPropertyKeys.push(i)
              selectorPropertyValues[i] = selectors[i].replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',')
            }
            selectors = selectorPropertyKeys
            selectorsCount = selectors.length
            break
        }

        // by name
        if (declarationNames.length) {
          if (typeof declarationNames === 'string') {
            declarationNames = declarationNames.replace(/^\s+|\s+$/g, '')
            declarationNames = declarationNames.split(',')
            declarationNamesCount = declarationNames.length
          }

          if (typeof declarationNames === 'object' || typeof declarationNames === 'array') {
            declarationNames = declarationNames.filter((entry) => entry.trim() !== '')
            declarationNamesCount = declarationNames.length
          }
        } else {
          declarationNames = null
        }

        hasReadReduceDeclarations = true
        cssPurgeEventEmitter.emit('CONFIG_READ_REDUCE_PROPS_END', OPTIONS)
      } else {
        let jsonConfig = ''
        readStream = createReadStream(CONFIG_REDUCE_DECLARATIONS, 'utf8')
        readStream
          .on('data', (chunk) => {
            jsonConfig += chunk
          })
          .on('end', () => {
            jsonConfig = JSON.parse(jsonConfig)

            declarationNames = jsonConfig.declaration_names
            selectors = jsonConfig.selectors

            switch (typeof selectors) {
              case 'string':
                if (selectors.length) {
                  selectors = selectors.replace(/^\s+|\s+$/g, '')
                  selectors = selectors.replace(/\r?\n|\r/g, '')
                  selectors = selectors.split(',')
                  selectorsCount = selectors.length
                } else {
                  selectors = null
                }
                break
              case 'object':
                const selectorPropertyKeys = []
                for (const i in selectors) {
                  selectorPropertyKeys.push(i)
                  selectorPropertyValues[i] = selectors[i].replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',')
                }
                selectors = selectorPropertyKeys
                selectorsCount = selectors.length
                break
            }

            // by name
            if (declarationNames.length) {
              if (typeof declarationNames === 'string') {
                declarationNames = declarationNames.replace(/^\s+|\s+$/g, '')
                declarationNames = declarationNames.split(',')
                declarationNamesCount = declarationNames.length
              } else {
                if (typeof declarationNames === 'object' || typeof declarationNames === 'array') {
                  declarationNames = declarationNames.filter((entry) => entry.trim() !== '')
                  declarationNamesCount = declarationNames.length
                }
              }
            } else {
              declarationNames = null
            }

            hasReadReduceDeclarations = true
            cssPurgeEventEmitter.emit('CONFIG_READ_REDUCE_PROPS_END', OPTIONS)
          })
          .on('error', (e) => {
            cssPurgeEventEmitter.emit('CONFIG_READ_REDUCE_PROPS_ERROR', OPTIONS)
            console.log(error('Reduce Properties Config File read error: Something went wrong while reading the file, check your config_reduce_declarations.json and please try again.'))
            console.log(e)
            process.exit(1)
          })
      }
    } // end of readReduceDeclarations

    function readConfig (configFilePath = '', optionsIn = null) {
      let tmpCONFIG = ''
      if (configFilePath === '') {
        readStream = createReadStream(configFileLocation, 'utf8')
      } else {
        if (configFilePath == 'cmd_default') {
          CONFIG = {}
          CONFIG.options = optionsIn
          if (CONFIG.options.trim) {
            OPTIONS.trim_removed_rules_previous_comment = CONFIG.options.trim
            OPTIONS.trim_comments = CONFIG.options.trim
            OPTIONS.trim_whitespace = CONFIG.options.trim
            OPTIONS.trim_breaklines = CONFIG.options.trim
            OPTIONS.trim_last_semicolon = CONFIG.options.trim
          }
          if (CONFIG.options.shorten) {
            OPTIONS.shorten_zero = CONFIG.options.shorten
            OPTIONS.shorten_hexcolor = CONFIG.options.shorten
            OPTIONS.shorten_hexcolor_extended_names = CONFIG.options.shorten
            OPTIONS.shorten_font = CONFIG.options.shorten
            OPTIONS.shorten_background = CONFIG.options.shorten
            OPTIONS.shorten_margin = CONFIG.options.shorten
            OPTIONS.shorten_padding = CONFIG.options.shorten
            OPTIONS.shorten_list_style = CONFIG.options.shorten
            OPTIONS.shorten_outline = CONFIG.options.shorten
            OPTIONS.shorten_border = CONFIG.options.shorten
            OPTIONS.shorten_border_top = CONFIG.options.shorten
            OPTIONS.shorten_border_right = CONFIG.options.shorten
            OPTIONS.shorten_border_bottom = CONFIG.options.shorten
            OPTIONS.shorten_border_left = CONFIG.options.shorten
            OPTIONS.shorten_border_radius = CONFIG.options.shorten
          }
          if (CONFIG.options.special_reduce_with_html) {
            OPTIONS.special_reduce_with_html = CONFIG.special_reduce_with_html
          }
          if (CONFIG.options.css_output) {
            OPTIONS.css_output = CONFIG.options.css_output
          }
          if (CONFIG.options.verbose) {
            OPTIONS.verbose = CONFIG.options.verbose
          }

          summary.files.output.push(CONFIG.options.css_output)
          REPORT_DUPLICATE_CSS = OPTIONS.report_file_location
          CONFIG_REDUCE_DECLARATIONS = OPTIONS.reduce_declarations_file_location
          summary.options_used = OPTIONS

          cssPurgeEventEmitter.emit('CONFIG_READ_END', OPTIONS)

          return true
        } else { // custom
          readStream = createReadStream(configFilePath, 'utf8')
        }
      }

      readStream.on('data', function (chunk) {
        tmpCONFIG += chunk
      }).on('end', function () {
        if (tmpCONFIG !== '') {
          try {
            CONFIG = JSON.parse(tmpCONFIG)
          } catch (err) {
            console.log(error('Config File read error: ' + configFileLocation + ', check your syntax, especially commas, then please try again.'))
            console.log(err)
            process.exit(1)
          }
          summary.files.output.push(CONFIG.options.css_output)
          REPORT_DUPLICATE_CSS = CONFIG.options.report_file_location
          CONFIG_REDUCE_DECLARATIONS = CONFIG.options.reduce_declarations_file_location

          if (CONFIG.options.trim) {
            CONFIG.options.trim_removed_rules_previous_comment = CONFIG.options.trim
            CONFIG.options.trim_comments = CONFIG.options.trim
            CONFIG.options.trim_whitespace = CONFIG.options.trim
            CONFIG.options.trim_breaklines = CONFIG.options.trim
            CONFIG.options.trim_last_semicolon = CONFIG.options.trim
          }
          if (CONFIG.options.shorten) {
            CONFIG.options.shorten_zero = CONFIG.options.shorten
            CONFIG.options.shorten_hexcolor = CONFIG.options.shorten
            CONFIG.options.shorten_hexcolor_extended_names = CONFIG.options.shorten
            CONFIG.options.shorten_font = CONFIG.options.shorten
            CONFIG.options.shorten_background = CONFIG.options.shorten
            CONFIG.options.shorten_margin = CONFIG.options.shorten
            CONFIG.options.shorten_padding = CONFIG.options.shorten
            CONFIG.options.shorten_list_style = CONFIG.options.shorten
            CONFIG.options.shorten_outline = CONFIG.options.shorten
            CONFIG.options.shorten_border = CONFIG.options.shorten
            CONFIG.options.shorten_border_top = CONFIG.options.shorten
            CONFIG.options.shorten_border_right = CONFIG.options.shorten
            CONFIG.options.shorten_border_bottom = CONFIG.options.shorten
            CONFIG.options.shorten_border_left = CONFIG.options.shorten
            CONFIG.options.shorten_border_radius = CONFIG.options.shorten
          }
          OPTIONS = CONFIG.options
          summary.options_used = OPTIONS
        }

        cssPurgeEventEmitter.emit('CONFIG_READ_END', OPTIONS)
      }).on('error', function (e) {
        cssPurgeEventEmitter.emit('CONFIG_READ_ERROR')
        console.log(error('Config File read error: Something went wrong while reading the file, check your ' + configFileLocation + ' and please try again.'))
        console.log(e)
        process.exit(1)
      })

      return readStream
    }

    /* read css input files */
    function processCSSFiles (optionsIn = null, configFilePath = '') {
      function continueCSSFilesProcess (optionsIn2) {
        // console.log(optionsIn2)
        // console.log(optionsIn2.css)
        cssPurgeEventEmitter.removeListener('CONFIG_READ_REDUCE_PROPS_END', continueCSSFilesProcess)

        const continueCSSFilesProcessAfterConfig = function (optionsIn3) {
          cssPurgeEventEmitter.removeListener('continueCSSFilesProcessAfterConfig', continueCSSFilesProcessAfterConfig)

          // config
          if (OPTIONS.css === undefined && CONFIG.options.css) {
            OPTIONS.css = CONFIG.options.css
          }

          // Options
          if (optionsIn !== null && optionsIn !== undefined) {
            for (const key in optionsIn) {
              OPTIONS[key] = optionsIn[key]
            }
          }
          // console.log(CONFIG)
          // console.log(optionsIn.css)
          // console.log(optionsIn3)
          // CSS Files
          // let files = CONFIG.options.css;
          // if (optionsIn.css !== null && optionsIn.css !== undefined) {
          // files = optionsIn.css;
          // }
          files = OPTIONS.css

          if (files !== undefined && files !== '') {
            // check for file or files
            switch (typeof files) {
              case 'object':
              case 'array':
                {
                  const collector = []

                  files
                    .forEach((file) => {
                      getFilePath(file, ['.css'], collector)
                    })

                  if (collector.length) {
                    files = collector
                  }
                }

                break
              case 'string':
                {
                  // formats
                  files = files.replace(/ /g, '')
                  // comma delimited list - filename1.css, filename2.css
                  if (files.includes(',')) {
                    files = files.replace(/^\s+|\s+$/g, '').split(',')

                    const collector = []

                    files
                      .forEach((file) => {
                        getFilePath(file, ['.css'], collector)
                      })

                    if (collector.length) {
                      files = collector
                    }
                  } else {
                    const collector = []

                    // string path
                    getFilePath(files, ['.css'], collector)

                    if (collector.length) {
                      files = collector
                    }
                  }
                }

                break
            } // end of switch

            fileLocation = files.toString()

            cssPurgeEventEmitter.on('CSS_READ_AGAIN', function () {
              readCSSFile(files)
            })
            cssPurgeEventEmitter.on('CSS_READ_END', function () {
              // cssPurgeEventEmitter.emit('CONFIG_READ_REDUCE_PROPS_END');
              processCSS(null, OPTIONS, function () {
              })
            })

            readCSSFile(files)
          } else { // end of files nothing check
            //
          }
        }

        if (currentConfig != configFilePath) { // don't read same config
          cssPurgeEventEmitter.on('CONFIG_READ_END', continueCSSFilesProcessAfterConfig) // end of config read
        }

        currentConfig = configFilePath

        if (configFilePath != 'cmd_default') {
          readConfig(configFilePath)
        } else if (configFilePath == 'cmd_default') {
          readConfig(configFilePath, optionsIn)
        }
      }

      cssPurgeEventEmitter.on('CONFIG_READ_REDUCE_PROPS_END', continueCSSFilesProcess) // end of reduce config read

      if (!hasReadReduceDeclarations && existsSync(OPTIONS.reduce_declarations_file_location)) {
        readReduceDeclarations()
      }

      if (!hasReadReduceDeclarations && !existsSync(OPTIONS.reduce_declarations_file_location)) {
        // default process settings
        const default_reduce_declarations_config = {
          declaration_names: [
            ...DEFAULT_DECLARATION_NAMES
          ]
        }

        if (optionsIn !== null && (optionsIn.reduceConfig === undefined || optionsIn.reduceConfig === null)) {
          optionsIn.reduceConfig = default_reduce_declarations_config
          readReduceDeclarations(optionsIn.reduceConfig)
        } else {
          readReduceDeclarations()
        }
      }
    } // end of processCSSFiles

    function readCSSFile (files = []) {
      if (OPTIONS.verbose) { console.log(info('Input - CSS File : ' + files[readCSSFileCount])) }

      if (validUrl.isUri(files[readCSSFileCount])) {
        request({
          url: files[readCSSFileCount],
          method: 'GET'
        }, function (err, head, body) {
          let fileSizeKB

          if (head) {
            const contentLength = head.headers['content-length']

            if (!contentLength) {
              fileSizeKB = getSizeInKB(body)
            } else {
              fileSizeKB = contentLength / 1000
            }
          } else {
            fileSizeKB = getSizeInKB(body) / 1000
          }

          stats.files.css.push({
            fileName: files[readCSSFileCount],
            fileSizeKB
          })
          stats.before.totalFileSizeKB += fileSizeKB
        })
      } else {
        const fileSizeKB = getFileSizeInKB(files[readCSSFileCount])

        stats.files.css.push({
          fileName: files[readCSSFileCount],
          fileSizeKB
        })
        stats.before.totalFileSizeKB += fileSizeKB
      }

      summary.files.input.push(files[readCSSFileCount])

      if (validUrl.isUri(files[readCSSFileCount])) {
        request(files[readCSSFileCount], function (err, response, body) {
          if (response === undefined) {
            // try again
            request(files[readCSSFileCount], function (err, response, body) {
              if (response.statusCode === 200) {
                dataCSSIn.push(body)

                readCSSFileCount += 1

                if (readCSSFileCount < files.length) {
                  cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
                } else {
                  cssPurgeEventEmitter.emit('CSS_READ_END')
                }
              } else {
                cssPurgeEventEmitter.emit('CSS_READ_ERROR')
                console.log(error('CSS File read error: check your CSS files and please try again.'))
                console.log(err)
                process.exit(1)
              }
            })
          } else if (response.statusCode === 200) {
            dataCSSIn.push(body)

            readCSSFileCount += 1

            if (readCSSFileCount < files.length) {
              cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
            } else {
              cssPurgeEventEmitter.emit('CSS_READ_END')
            }
          } else {
            cssPurgeEventEmitter.emit('CSS_READ_ERROR')
            console.log(error('CSS File read error: check your CSS files and please try again.'))
            console.log(err)
            process.exit(1)
          }
        })
      } else {
        readStream = createReadStream(files[readCSSFileCount], 'utf8')

        readStream.on('data', function (chunk) {
          dataCSSIn.push(chunk)
        }).on('end', function () {
          readCSSFileCount += 1
          if (readCSSFileCount < files.length) {
            cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
          } else {
            cssPurgeEventEmitter.emit('CSS_READ_END')
          }
        }).on('error', function (e) {
          cssPurgeEventEmitter.emit('CSS_READ_ERROR')
          console.log(error('CSS File read error: Something went wrong while reading the file(s), check your CSS files and please try again.'))
          console.log(e)
          process.exit(1)
        })
      } // end of url check
    } // end of readCSSFile

    function processValues (rules) {
      if (OPTIONS.verbose) { console.log(info('Process - Values')) }

      const {
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
        shorten_hexcolor: SHORTEN_HEXCOLOR = false,
        shorten: SHORTEN = false
      } = OPTIONS

      rules
        .filter(Boolean)
        .filter(filterForDeclarations)
        .filter(filterForRule)
        .forEach((rule) => {
          if (SHORTEN || SHORTEN_BACKGROUND) processBackground(rule, OPTIONS)

          if (SHORTEN || SHORTEN_LIST_STYLE) processListStyle(rule, OPTIONS)

          if (SHORTEN || SHORTEN_BORDER_TOP) processBorderTop(rule, OPTIONS)

          if (SHORTEN || SHORTEN_BORDER_RIGHT) processBorderRight(rule, OPTIONS)

          if (SHORTEN || SHORTEN_BORDER_BOTTOM) processBorderBottom(rule, OPTIONS)

          if (SHORTEN || SHORTEN_BORDER_LEFT) processBorderLeft(rule, OPTIONS)

          if (SHORTEN || SHORTEN_BORDER) processBorder(rule, OPTIONS)

          if (SHORTEN || SHORTEN_BORDER_RADIUS) processBorderRadius(rule, OPTIONS)

          if (SHORTEN || SHORTEN_HEXCOLOR) processHexColor(rule, OPTIONS, summary)

          if (SHORTEN || SHORTEN_FONT) processFont(rule, OPTIONS)

          if (SHORTEN || SHORTEN_MARGIN) processMargin(rule, OPTIONS)

          if (SHORTEN || SHORTEN_PADDING) processPadding(rule, OPTIONS)

          if (SHORTEN || SHORTEN_OUTLINE) processOutline(rule, OPTIONS)

          if (SHORTEN || SHORTEN_ZERO) processZero(rule, OPTIONS)
        })

      const RULES_COUNT = rules.length

      for (let i = 0; i < RULES_COUNT; ++i) {
        if (rules[i] !== undefined && rules[i].declarations !== undefined && rules[i].type == 'rule') {
          DECLARATION_COUNT = rules[i].declarations.length

          // font
          if (SHORTEN || SHORTEN_FONT) {
            const font = rules[i].declarations.filter(filterForFont)

            const index = font.map(toProperty).indexOf('font-weight')

            // font-weight shortening
            if (index !== -1) {
              let value = font[index].value

              switch (value.toLowerCase()) {
                case 'thin':
                case 'hairline':
                  value = '100'
                  break
                case 'extra light':
                case 'ultra light':
                  value = '200'
                  break
                case 'light':
                  value = '300'
                  break
                case 'normal':
                  value = '400'
                  break
                case 'medium':
                  value = '500'
                  break
                case 'semi bold':
                case 'demi bold':
                  value = '600'
                  break
                case 'bold':
                  value = '700'
                  break
                case 'extra bold':
                case 'ultra bold':
                  value = '800'
                  break
                case 'black':
                case 'heavy':
                  value = '900'
                  break
              }

              font[index] = {
                type: font[index].type,
                property: font[index].property,
                value,
                position: font[index].position
              }
            }

            // special - convert rem
            if (OPTIONS.special_convert_rem && OPTIONS.special_convert_rem_font_size) {
              // for singular declaration
              for (let j = 0; j < DECLARATION_COUNT; ++j) {
                if (rules[i].declarations !== undefined && rules[i].declarations[j].property == 'font-size') {
                  let value = rules[i].declarations[j].value.toLowerCase()

                  if (value.includes('px')) {
                    value = value.substr(0, value.length - 2) / OPTIONS.special_convert_rem_desired_html_px + 'rem'
                  }

                  rules[i].declarations[j] = {
                    type: rules[i].declarations[j].type,
                    property: rules[i].declarations[j].property,
                    value,
                    position: rules[i].declarations[j].position
                  }
                }
              }

              const index = font.map(toProperty).indexOf('font-size')
              // for combined declaration
              if (index !== -1) {
                let value = font[index].value.toLowerCase()

                if (value.includes('px')) {
                  value = value.substr(0, value.length - 2) / OPTIONS.special_convert_rem_desired_html_px + 'rem'
                }

                font[index] = {
                  type: font[index].type,
                  property: font[index].property,
                  value,
                  position: font[index].position
                }
              }
            }

            let fontProps = font.map(toProperty)

            if (OPTIONS.format_font_family || OPTIONS.format) {
              // make sure multi-worded families have quotes
              if (fontProps.includes('font-family')) {
                for (let j = 0, jlen = rules[i].declarations.length; j < jlen; ++j) {
                  if (rules[i].declarations[j].property == 'font-family') {
                    fontVal = rules[i].declarations[j].value.split(',')
                    let value = ''
                    for (let k = 0, klen = fontVal.length; k < klen; ++k) {
                      fontVal[k] = fontVal[k].trim()
                      if (fontVal[k].includes(' ') &&
                        (
                          fontVal[k].indexOf('"') == -1 && fontVal[k].indexOf('\'') == -1
                        )) {
                        value += '"' + fontVal[k].trim() + '",'
                      } else {
                        value += fontVal[k].trim() + ','
                      }
                    }
                    value = value.substring(0, value.length - 1)

                    rules[i].declarations[j] = {
                      type: 'declaration',
                      property: 'font-family',
                      value,
                      position: rules[i].declarations[j].position
                    }
                  }
                }
              }
            }

            // reduce to font
            if (
              (
                fontProps.includes('font-size') &&
                fontProps.includes('font-family')
              ) ||
              fontProps.includes('font')) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Font : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const fontHasInherit = font.some(hasInherit)
              if (!fontHasInherit) {
                let fontValues = font.map(toValue)
                const fontPositions = font.map(toPosition)
                fontValuesOutput = [
                  (fontValues[fontProps.indexOf('font-style')] ? fontValues[fontProps.indexOf('font-style')] : ''),
                  (fontValues[fontProps.indexOf('font-variant')] ? fontValues[fontProps.indexOf('font-variant')] : ''),
                  (fontValues[fontProps.indexOf('font-weight')] ? fontValues[fontProps.indexOf('font-weight')] : ''),
                  (fontValues[fontProps.indexOf('font-stretch')] ? fontValues[fontProps.indexOf('font-stretch')] : ''),
                  (fontValues[fontProps.indexOf('font-size')] ? fontValues[fontProps.indexOf('font-size')] : ''),
                  (fontValues[fontProps.indexOf('line-height')] ? fontValues[fontProps.indexOf('line-height')] : ''),
                  (fontValues[fontProps.indexOf('font-family')] ? fontValues[fontProps.indexOf('font-family')] : '')
                ]

                // existing font check
                const fontPropValueIndex = fontProps.indexOf('font')
                if (fontPropValueIndex !== -1) {
                  let fontPropValue = fontValues[fontPropValueIndex]

                  // fill missing attribute with existing font
                  if (fontProps.indexOf('font-size') > fontPropValueIndex) {
                    fontValuesOutput[4] = fontValues[fontProps.indexOf('font-size')]
                  } else {
                    fontValuesOutput[4] = getValueOfFontProp(fontPropValue, 'size', fontPositions[fontProps.indexOf('font')])

                    if (fontValuesOutput[4] == 'check family') {
                      // check required font-family property exists
                      if (fontValues[fontProps.indexOf('font-family')] !== '' &&
                        fontValues[fontProps.indexOf('font-family')] !== undefined) {
                        fontValuesOutput[4] = fontPropValue
                        fontPropValue = fontPropValue + ' ' + fontValues[fontProps.indexOf('font-family')]
                      } else {
                        // report error and exit
                        console.log(error('Error Parsing Font Declaration'))
                        console.log(errorLine('Source: ' + fontPositions[fontProps.indexOf('font')].source))
                        console.log(errorLine('Line: ' + fontPositions[fontProps.indexOf('font')].start.line + ', column: ' + fontPositions[fontProps.indexOf('font')].start.column))
                        console.log('Required: font-family')
                        process.exit(1)
                      }
                    } else if (fontValuesOutput[4] == 'check size') {
                      // check required font-size property exists
                      if (fontValues[fontProps.indexOf('font-size')] !== '' &&
                        fontValues[fontProps.indexOf('font-size')] !== undefined) {
                        fontValuesOutput[4] = fontPropValue
                        fontPropValue = fontValues[fontProps.indexOf('font-size')] + ' ' + fontPropValue
                      } else {
                        if (fontPropValue == 'inherit') {
                          fontValuesOutput[4] = fontPropValue
                        } else {
                          // report error and exit
                          console.log(error('Error Parsing Font Declaration'))
                          console.log(errorLine('Source: ' + fontPositions[fontProps.indexOf('font')].source))
                          console.log(errorLine('Line: ' + fontPositions[fontProps.indexOf('font')].start.line + ', column: ' + fontPositions[fontProps.indexOf('font')].start.column))
                          console.log('Required: font-size')
                          process.exit(1)
                        }
                      }
                    }
                  }

                  if (fontProps.indexOf('font-family') > fontPropValueIndex) {
                    fontValuesOutput[6] = fontValues[fontProps.indexOf('font-family')]
                  } else {
                    fontValuesOutput[6] = getValueOfFontProp(fontPropValue, 'family', fontPositions[fontProps.indexOf('font')])

                    if (fontValuesOutput[6] == 'check size') {
                      // check required font-size property exists
                      if (fontValues[fontProps.indexOf('font-size')] !== '' &&
                        fontValues[fontProps.indexOf('font-size')] !== undefined) {
                        fontValuesOutput[6] = fontPropValue
                        fontPropValue = fontValues[fontProps.indexOf('font-size')] + ' ' + fontPropValue
                      } else {
                        if (fontPropValue == 'inherit') {
                          if (fontValuesOutput[4] == 'inherit') {
                            fontValuesOutput[6] = ''
                          }
                        } else {
                          // report error and exit
                          console.log(error('Error Parsing Font Declaration'))
                          console.log(errorLine('Source: ' + fontPositions[fontProps.indexOf('font')].source))
                          console.log(errorLine('Line: ' + fontPositions[fontProps.indexOf('font')].start.line + ', column: ' + fontPositions[fontProps.indexOf('font')].start.column))
                          console.log('Required: font-size')
                          process.exit(1)
                        }
                      }
                    } else if (fontValuesOutput[6] == 'check family') {
                      // check required font-family property exists
                      if (
                        fontValues[fontProps.indexOf('font-family')] !== '' &&
                        fontValues[fontProps.indexOf('font-family')] !== undefined) {
                        fontValuesOutput[6] = fontPropValue
                        fontPropValue = fontPropValue + ' ' + fontValues[fontProps.indexOf('font-family')]
                      } else {
                        // report error and exit
                        console.log(error('Error Parsing Font Declaration'))
                        console.log(errorLine('Source: ' + fontPositions[fontProps.indexOf('font')].source))
                        console.log(errorLine('Line: ' + fontPositions[fontProps.indexOf('font')].start.line + ', column: ' + fontPositions[fontProps.indexOf('font')].start.column))
                        console.log('Required: font-family')
                        process.exit(1)
                      }
                    } else {
                      // make sure multi-worded families have quotes
                      if (OPTIONS.format_font_family || OPTIONS.format) {
                        fontVal = fontValuesOutput[6]

                        let value = ''
                        for (let k = 0, klen = fontVal.length; k < klen; ++k) {
                          fontVal[k] = fontVal[k].trim()
                          if (fontVal[k].includes(' ') &&
                            (
                              fontVal[k].indexOf('"') == -1
                            )) {
                            value += '"' + fontVal[k].trim() + '",'
                          } else {
                            value += fontVal[k].trim() + ','
                          }
                        }
                        value = value.substring(0, value.length - 1)

                        fontValuesOutput[6] = value
                      } // end of format
                    } // end of font-family checks
                  } // end of font-family

                  if (fontProps.indexOf('font-style') > fontPropValueIndex) {
                    fontValuesOutput[0] = fontValues[fontProps.indexOf('font-style')]
                  } else {
                    fontValuesOutput[0] = getValueOfFontProp(fontPropValue, 'style', fontPositions[fontProps.indexOf('font')])
                    if (fontValuesOutput[0] == 'check size' ||
                      fontValuesOutput[0] == 'check family') {
                      fontValuesOutput[0] = ''
                    }
                  }

                  if (fontProps.indexOf('font-variant') > fontPropValueIndex) {
                    fontValuesOutput[1] = fontValues[fontProps.indexOf('font-variant')]
                  } else {
                    fontValuesOutput[1] = getValueOfFontProp(fontPropValue, 'variant', fontPositions[fontProps.indexOf('font')])
                    if (fontValuesOutput[1] == 'check size' ||
                      fontValuesOutput[1] == 'check family') {
                      fontValuesOutput[1] = ''
                    }
                  }

                  if (fontProps.indexOf('font-weight') > fontPropValueIndex) {
                    fontValuesOutput[2] = fontValues[fontProps.indexOf('font-weight')]
                  } else {
                    fontValuesOutput[2] = getValueOfFontProp(fontPropValue, 'weight', fontPositions[fontProps.indexOf('font')])
                    if (fontValuesOutput[2] == 'check size' ||
                      fontValuesOutput[2] == 'check family') {
                      fontValuesOutput[2] = ''
                    }
                  }

                  if (fontProps.indexOf('font-stretch') > fontPropValueIndex) {
                    fontValuesOutput[3] = fontValues[fontProps.indexOf('font-stretch')]
                  } else {
                    fontValuesOutput[3] = getValueOfFontProp(fontPropValue, 'stretch', fontPositions[fontProps.indexOf('font')])
                    if (fontValuesOutput[3] == 'check size' ||
                      fontValuesOutput[3] == 'check family') {
                      fontValuesOutput[3] = ''
                    }
                  }

                  if (fontProps.indexOf('line-height') > fontPropValueIndex) {
                    fontValuesOutput[5] = fontValues[fontProps.indexOf('line-height')]
                  } else {
                    fontValuesOutput[5] = getValueOfFontProp(fontPropValue, 'lineHeight', fontPositions[fontProps.indexOf('font')])
                    if (fontValuesOutput[5] == 'check size' ||
                      fontValuesOutput[5] == 'check family') {
                      fontValuesOutput[5] = ''
                    }
                  }
                }

                if (
                  fontValuesOutput[0] === '' &&
                  fontValuesOutput[1] === '' &&
                  fontValuesOutput[2] === '' &&
                  fontValuesOutput[3] === '' &&
                  fontValuesOutput[4] === '' &&
                  fontValuesOutput[5] === ''
                ) {
                  // !!!
                } else {
                  fontProps = [...DEFAULT_FONT_PROPS]
                  fontValues = fontValuesOutput
                }

                // check for !important
                let fontHasImportant = false
                for (let n = 0, j = fontValues.length; n < j; ++n) {
                  fontValues[n] = fontValues[n].toString().replace(/(!important)/g, () => {
                    fontHasImportant = true
                    return ''
                  })
                }

                if (fontHasImportant) {
                  fontValues[fontValues.length - 1] += ' !important'
                }

                // merge line-height with font-size
                if (fontValues[fontProps.indexOf('line-height')] !== '') {
                  fontValues[fontProps.indexOf('font-size')] = fontValues[fontProps.indexOf('font-size')] + '/' + fontValues[fontProps.indexOf('line-height')]
                  fontValues.splice(fontProps.indexOf('line-height'), 1)
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                fontValues = fontValues.filter(Boolean)

                // add declaration
                let fontRuleIndex = declarations.length
                for (let j = 0; j < fontRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'font-style':
                    case 'font-variant':
                    case 'font-weight':
                    case 'font-stretch':
                    case 'font-size':
                    case 'font-family':
                    case 'line-height':
                    case 'font':
                      if (j < fontRuleIndex) { fontRuleIndex = j }
                      break
                  }
                }

                declarations.splice(fontRuleIndex, 0, {
                  type: 'declaration',
                  property: 'font',
                  value: fontValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noFontsShortened += 1

                let fontIndex

                // remove existing originals
                fontIndex = declarations.map(toProperty).indexOf('font-style')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                fontIndex = declarations.map(toProperty).indexOf('font-variant')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                fontIndex = declarations.map(toProperty).indexOf('font-weight')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                fontIndex = declarations.map(toProperty).indexOf('font-stretch')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                fontIndex = declarations.map(toProperty).indexOf('font-size')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                fontIndex = declarations.map(toProperty).indexOf('line-height')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                fontIndex = declarations.map(toProperty).indexOf('font-family')
                if (fontIndex !== -1) {
                  declarations.splice(fontIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing fonts
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'font').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('font')
                    const now = properties.indexOf('font', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of font

          // background
          if (SHORTEN || SHORTEN_BACKGROUND) {
            background = rules[i].declarations.filter(filterForBackground)
            let backgroundProps = background.map(toProperty)

            if (backgroundProps.length >= OPTIONS.shorten_background_min) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Background : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const backgroundHasInherit = background.some(hasInherit)
              if (!backgroundHasInherit) {
                let backgroundValues = background.map(toValue)
                backgroundValuesOutput = [
                  (backgroundValues[backgroundProps.indexOf('background-color')] ? backgroundValues[backgroundProps.indexOf('background-color')] : ''),
                  (backgroundValues[backgroundProps.indexOf('background-image')] ? backgroundValues[backgroundProps.indexOf('background-image')] : ''),
                  (backgroundValues[backgroundProps.indexOf('background-repeat')] ? backgroundValues[backgroundProps.indexOf('background-repeat')] : ''),
                  (backgroundValues[backgroundProps.indexOf('background-attachment')] ? backgroundValues[backgroundProps.indexOf('background-attachment')] : ''),
                  (backgroundValues[backgroundProps.indexOf('background-position')] ? backgroundValues[backgroundProps.indexOf('background-position')] : '')
                ]
                hasMultipleBackgrounds = false
                hasGradient = false

                if (backgroundValues[0].match(/([^0-9]),([^0-9])/g) !== null) {
                  hasMultipleBackgrounds = true
                }

                // existing background check
                for (let j = 0; j < backgroundProps.length; ++j) {
                  if (backgroundValues[j].includes('gradient')) {
                    hasGradient = true
                  }

                  if (backgroundProps[j] == 'background') {
                    const backgroundPropValueIndex = j
                    let backgroundPropValue = backgroundValues[backgroundPropValueIndex]

                    if (backgroundPropValue.indexOf('gradient') == -1) {
                      // fill missing attribute with existing background props
                      if (backgroundProps.indexOf('background-color') > backgroundPropValueIndex) {
                        backgroundValuesOutput[0] = backgroundValues[backgroundProps.indexOf('background-color')]
                      } else {
                        backgroundValuesOutput[0] = (backgroundPropValue = getBackgroundProp(backgroundPropValue, 'color')) ? backgroundPropValue : backgroundValuesOutput[0]
                      }

                      if (backgroundProps.indexOf('background-image') > backgroundPropValueIndex) {
                        backgroundValuesOutput[1] = backgroundValues[backgroundProps.indexOf('background-image')]
                      } else {
                        backgroundValuesOutput[1] = (backgroundPropValue = getBackgroundProp(backgroundPropValue, 'image')) ? backgroundPropValue : backgroundValuesOutput[1]
                      }

                      if (backgroundProps.indexOf('background-repeat') > backgroundPropValueIndex) {
                        backgroundValuesOutput[2] = backgroundValues[backgroundProps.indexOf('background-repeat')]
                      } else {
                        backgroundValuesOutput[2] = (backgroundPropValue = getBackgroundProp(backgroundPropValue, 'repeat')) ? backgroundPropValue : backgroundValuesOutput[2]
                      }

                      if (backgroundProps.indexOf('background-attachment') > backgroundPropValueIndex) {
                        backgroundValuesOutput[3] = backgroundValues[backgroundProps.indexOf('background-attachment')]
                      } else {
                        backgroundValuesOutput[3] = (backgroundPropValue = getBackgroundProp(backgroundPropValue, 'attachment')) ? backgroundPropValue : backgroundValuesOutput[3]
                      }

                      if (backgroundProps.indexOf('background-position') > backgroundPropValueIndex) {
                        backgroundValuesOutput[4] = backgroundValues[backgroundProps.indexOf('background-position')]
                      } else {
                        backgroundValuesOutput[4] = (backgroundPropValue = getBackgroundProp(backgroundPropValue, 'position')) ? backgroundPropValue : backgroundValuesOutput[4]
                      }
                    }
                  }
                }

                if (hasMultipleBackgrounds && hasGradient == false) {
                  let backgroundPropValue = ''
                  for (let j = 0; j < backgroundValuesOutput.length; ++j) {
                    const backgroundPropValues = backgroundValuesOutput[j].split(',')
                    backgroundPropValue += (backgroundPropValues[0]) ? backgroundPropValues[0].trim() + ' ' : ''
                    backgroundPropValue += (backgroundPropValues[1]) ? backgroundPropValues[1].trim() + ' ' : ''
                    backgroundValuesOutput[j] = ''
                  }
                  backgroundPropValue = backgroundPropValue.trim()
                  backgroundPropValue += ', ' + backgroundPropValue.trim()
                  backgroundValuesOutput[0] = backgroundPropValue
                }

                if (hasGradient == false) {
                  if (
                    backgroundValuesOutput[0] === '' &&
                    backgroundValuesOutput[1] === '' &&
                    backgroundValuesOutput[2] === '' &&
                    backgroundValuesOutput[3] === '' &&
                    backgroundValuesOutput[4] === ''
                  ) {
                    // !!!
                  } else {
                    backgroundProps = [...DEFAULT_BACKGROUND_PROPS]
                    backgroundValues = backgroundValuesOutput
                  }

                  // check for !important
                  let backgroundHasImportant = false
                  for (let n = 0, j = backgroundValues.length; n < j; ++n) {
                    backgroundValues[n] = backgroundValues[n].toString().replace(/(!important)/g, () => {
                      backgroundHasImportant = true
                      return ''
                    })
                  }

                  if (backgroundHasImportant) {
                    backgroundValues[backgroundValues.length - 1] += ' !important'
                  }

                  const declarations = rules[i].declarations

                  // remove any spaces from empty values
                  backgroundValues = backgroundValues.filter(Boolean)

                  // add declaration
                  let backgroundRuleIndex = declarations.length
                  for (let j = 0; j < backgroundRuleIndex; ++j) {
                    switch (declarations[j].property) {
                      case 'background-color':
                      case 'background-image':
                      case 'background-position':
                      case 'background-repeat':
                      case 'background-attachment':
                      case 'background':
                        if (j < backgroundRuleIndex) { backgroundRuleIndex = j }
                        break
                    }
                  }

                  declarations.splice(backgroundRuleIndex, 0, {
                    type: 'declaration',
                    property: 'background',
                    value: backgroundValues.join(' ')
                  })

                  DECLARATION_COUNT += 1
                  summary.stats.summary.noBackgroundsShortened += 1

                  let backgroundIndex

                  // remove originals
                  backgroundIndex = declarations.map(toProperty).indexOf('background-color')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.map(toProperty).indexOf('background-image')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.map(toProperty).indexOf('background-position')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.map(toProperty).indexOf('background-repeat')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.map(toProperty).indexOf('background-attachment')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  // remove existing backgrounds
                  const properties = declarations.filter(toProperty).map(toProperty)
                  const j = properties.filter((value) => value === 'background')
                  if (j > 1) {
                    for (let i = 1; i < j; ++i) {
                      const was = properties.indexOf('background')
                      const now = properties.indexOf('background', (was + 1))
                      declarations.splice(now, 1)
                      DECLARATION_COUNT -= 1
                    }
                  }
                }
              } // end of inherit check
            }
          } // end of background

          // listStyle
          if (SHORTEN || SHORTEN_LIST_STYLE) {
            listStyle = rules[i].declarations.filter(filterForListStyle)
            let listStyleProps = listStyle.map(toProperty)
            if (
              listStyleProps.includes('list-style-type') ||
              listStyleProps.includes('list-style-position') ||
              listStyleProps.includes('list-style-image') ||
              listStyleProps.includes('list-style')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - List-style : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const listStyleHasInherit = listStyle.some(hasInherit)
              if (!listStyleHasInherit) {
                let listStyleValues = listStyle.map(toValue)
                listStyleValuesOutput = [
                  (listStyleValues[listStyleProps.indexOf('list-style-type')] ? listStyleValues[listStyleProps.indexOf('list-style-type')] : ''),
                  (listStyleValues[listStyleProps.indexOf('list-style-position')] ? listStyleValues[listStyleProps.indexOf('list-style-position')] : ''),
                  (listStyleValues[listStyleProps.indexOf('list-style-image')] ? listStyleValues[listStyleProps.indexOf('list-style-image')] : '')
                ]

                // existing listStyle check
                const listStylePropValueIndex = listStyleProps.indexOf('list-style')
                if (listStylePropValueIndex !== -1) {
                  let listStylePropValue = listStyleValues[listStylePropValueIndex]

                  if (listStylePropValue !== 'none') {
                    // fill missing attribute with existing listStyle
                    if (listStyleProps.indexOf('list-style-type') > listStylePropValueIndex) {
                      listStyleValuesOutput[0] = listStyleValues[listStyleProps.indexOf('list-style-type')]
                    } else {
                      listStyleValuesOutput[0] = (listStylePropValue = getValueOfTriProp(listStylePropValue, 'type')) ? listStylePropValue : listStyleValuesOutput[0]
                    }
                    if (listStyleProps.indexOf('list-style-position') > listStylePropValueIndex) {
                      listStyleValuesOutput[1] = listStyleValues[listStyleProps.indexOf('list-style-position')]
                    } else {
                      listStyleValuesOutput[1] = (listStylePropValue = getValueOfTriProp(listStylePropValue, 'position')) ? listStylePropValue : listStyleValuesOutput[1]
                    }
                    if (listStyleProps.indexOf('list-style-image') > listStylePropValueIndex) {
                      listStyleValuesOutput[2] = listStyleValues[listStyleProps.indexOf('list-style-image')]
                    } else {
                      listStyleValuesOutput[2] = (listStylePropValue = getValueOfTriProp(listStylePropValue, 'image')) ? listStylePropValue : listStyleValuesOutput[2]
                    }
                  } else {
                    listStyleValuesOutput[0] = listStylePropValue
                    listStyleValuesOutput[1] = ''
                    listStyleValuesOutput[2] = ''
                  }
                }

                if (
                  listStyleValuesOutput[0] === '' &&
                  listStyleValuesOutput[1] === '' &&
                  listStyleValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  listStyleProps = [...DEFAULT_LIST_STYLE_PROPS]
                  listStyleValues = listStyleValuesOutput
                }

                // check for !important
                let listStyleHasImportant = false
                for (let n = 0, j = listStyleValues.length; n < j; ++n) {
                  listStyleValues[n] = listStyleValues[n].toString().replace(/(!important)/g, () => {
                    listStyleHasImportant = true
                    return ''
                  })
                }

                if (listStyleHasImportant) {
                  listStyleValues[listStyleValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                listStyleValues = listStyleValues.filter(Boolean)

                // add declaration
                let listStyleRuleIndex = declarations.length
                for (let j = 0; j < listStyleRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'list-style-type':
                    case 'list-style-position':
                    case 'list-style-image':
                    case 'list-style':
                      if (j < listStyleRuleIndex) { listStyleRuleIndex = j }
                      break
                  }
                }

                declarations.splice(listStyleRuleIndex, 0, {
                  type: 'declaration',
                  property: 'list-style',
                  value: listStyleValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noListStylesShortened += 1

                let listStyleIndex

                listStyleIndex = declarations.map(toProperty).indexOf('list-style-type')
                if (listStyleIndex !== -1) {
                  declarations.splice(listStyleIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                listStyleIndex = declarations.map(toProperty).indexOf('list-style-position')
                if (listStyleIndex !== -1) {
                  declarations.splice(listStyleIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                listStyleIndex = declarations.map(toProperty).indexOf('list-style-image')
                if (listStyleIndex !== -1) {
                  declarations.splice(listStyleIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing listStyles
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'list-style').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('list-style')
                    const now = properties.indexOf('list-style', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of listStyle

          // outline
          if (SHORTEN || SHORTEN_OUTLINE) {
            outline = rules[i].declarations.filter(filterForOutline)
            let outlineProps = outline.map(toProperty)
            if (
              outlineProps.includes('outline-style') ||
              outlineProps.includes('outline')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Outline : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const outlineHasInherit = outline.some(hasInherit)
              if (!outlineHasInherit) {
                let outlineValues = outline.map(toValue)
                outlineValuesOutput = [
                  (outlineValues[outlineProps.indexOf('outline-width')] ? outlineValues[outlineProps.indexOf('outline-width')] : ''),
                  (outlineValues[outlineProps.indexOf('outline-style')] ? outlineValues[outlineProps.indexOf('outline-style')] : ''),
                  (outlineValues[outlineProps.indexOf('outline-color')] ? outlineValues[outlineProps.indexOf('outline-color')] : '')
                ]

                // existing outline check
                const outlinePropValueIndex = outlineProps.indexOf('outline')
                if (outlinePropValueIndex !== -1) {
                  let outlinePropValue = outlineValues[outlinePropValueIndex]
                  if (outlinePropValue !== 'none') {
                    // fill missing attribute with existing outline
                    if (outlineProps.indexOf('outline-width') > outlinePropValueIndex) {
                      outlineValuesOutput[0] = outlineValues[outlineProps.indexOf('outline-width')]
                    } else {
                      outlineValuesOutput[0] = (outlinePropValue = getValueOfTriProp(outlinePropValue, 'width')) ? outlinePropValue : outlineValuesOutput[0]
                    }
                    if (outlineProps.indexOf('outline-style') > outlinePropValueIndex) {
                      outlineValuesOutput[1] = outlineValues[outlineProps.indexOf('outline-style')]
                    } else {
                      outlineValuesOutput[1] = (outlinePropValue = getValueOfTriProp(outlinePropValue, 'style')) ? outlinePropValue : outlineValuesOutput[1]
                    }
                    if (outlineProps.indexOf('outline-color') > outlinePropValueIndex) {
                      outlineValuesOutput[2] = outlineValues[outlineProps.indexOf('outline-color')]
                    } else {
                      outlineValuesOutput[2] = (outlinePropValue = getValueOfTriProp(outlinePropValue, 'color')) ? outlinePropValue : outlineValuesOutput[2]
                    }
                  } else {
                    outlineValuesOutput[0] = '0'
                    outlineValuesOutput[1] = ''
                    outlineValuesOutput[2] = ''
                  }
                }

                if (
                  outlineValuesOutput[0] === '' &&
                  outlineValuesOutput[1] === '' &&
                  outlineValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  outlineProps = [...DEFAULT_OUTLINE_PROPS]
                  outlineValues = outlineValuesOutput
                }

                // check for !important
                let outlineHasImportant = false
                for (let n = 0, j = outlineValues.length; n < j; ++n) {
                  outlineValues[n] = outlineValues[n].toString().replace(/(!important)/g, () => {
                    outlineHasImportant = true
                    return ''
                  })
                }

                if (outlineHasImportant) {
                  outlineValues[outlineValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                outlineValues = outlineValues.filter(Boolean)

                // add declaration
                let outlineRuleIndex = declarations.length
                for (let j = 0; j < outlineRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'outline-width':
                    case 'outline-style':
                    case 'outline-color':
                    case 'outline':
                      if (j < outlineRuleIndex) { outlineRuleIndex = j }
                      break
                  }
                }

                declarations.splice(outlineRuleIndex, 0, {
                  type: 'declaration',
                  property: 'outline',
                  value: outlineValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noOutlinesShortened += 1

                let outlineIndex

                outlineIndex = declarations.map(toProperty).indexOf('outline-width')
                if (outlineIndex !== -1) {
                  declarations.splice(outlineIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                outlineIndex = declarations.map(toProperty).indexOf('outline-style')
                if (outlineIndex !== -1) {
                  declarations.splice(outlineIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                outlineIndex = declarations.map(toProperty).indexOf('outline-color')
                if (outlineIndex !== -1) {
                  declarations.splice(outlineIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing outlines
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'outline')
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = outlineProps.indexOf('outline')
                    const now = outlineProps.indexOf('outline', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of outline

          // borderTop
          if (SHORTEN || SHORTEN_BORDER_TOP) {
            borderTop = rules[i].declarations.filter(filterForBorderTop)
            let borderTopProps = borderTop.map(toProperty)
            if (
              borderTopProps.includes('border-top-style') ||
              borderTopProps.includes('border-top')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Top : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderTopHasInherit = borderTop.some(hasInherit)
              if (!borderTopHasInherit) {
                let borderTopValues = borderTop.map(toValue)
                borderTopValuesOutput = [
                  (borderTopValues[borderTopProps.indexOf('border-top-width')] ? borderTopValues[borderTopProps.indexOf('border-top-width')] : ''),
                  (borderTopValues[borderTopProps.indexOf('border-top-style')] ? borderTopValues[borderTopProps.indexOf('border-top-style')] : ''),
                  (borderTopValues[borderTopProps.indexOf('border-top-color')] ? borderTopValues[borderTopProps.indexOf('border-top-color')] : '')
                ]

                // existing borderTop check
                const borderTopPropValueIndex = borderTopProps.indexOf('border-top')
                if (borderTopPropValueIndex !== -1) {
                  let borderTopPropValue = borderTopValues[borderTopPropValueIndex]

                  if (borderTopPropValue !== 'none') {
                    // fill missing attribute with existing borderTop
                    if (borderTopProps.indexOf('border-top-width') > borderTopPropValueIndex) {
                      borderTopValuesOutput[0] = borderTopValues[borderTopProps.indexOf('border-top-width')]
                    } else {
                      borderTopValuesOutput[0] = (borderTopPropValue = getValueOfTriProp(borderTopPropValue, 'width')) ? borderTopPropValue : borderTopValuesOutput[0]
                    }
                    if (borderTopProps.indexOf('border-top-style') > borderTopPropValueIndex) {
                      borderTopValuesOutput[1] = borderTopValues[borderTopProps.indexOf('border-top-style')]
                    } else {
                      borderTopValuesOutput[1] = (borderTopPropValue = getValueOfTriProp(borderTopPropValue, 'style')) ? borderTopPropValue : borderTopValuesOutput[1]
                    }
                    if (borderTopProps.indexOf('border-top-color') > borderTopPropValueIndex) {
                      borderTopValuesOutput[2] = borderTopValues[borderTopProps.indexOf('border-top-color')]
                    } else {
                      borderTopValuesOutput[2] = (borderTopPropValue = getValueOfTriProp(borderTopPropValue, 'color')) ? borderTopPropValue : borderTopValuesOutput[2]
                    }
                  } else {
                    borderTopValuesOutput[0] = '0'
                    borderTopValuesOutput[1] = ''
                    borderTopValuesOutput[2] = ''
                  }
                }

                if (
                  borderTopValuesOutput[0] === '' &&
                  borderTopValuesOutput[1] === '' &&
                  borderTopValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  borderTopProps = [...DEFAULT_BORDER_TOP_PROPS]
                  borderTopValues = borderTopValuesOutput
                }

                // check for !important
                let borderTopHasImportant = false
                for (let n = 0, j = borderTopValues.length; n < j; ++n) {
                  borderTopValues[n] = borderTopValues[n].toString().replace(/(!important)/g, () => {
                    borderTopHasImportant = true
                    return ''
                  })
                }

                if (borderTopHasImportant) {
                  borderTopValues[borderTopValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                borderTopValues = borderTopValues.filter(Boolean)

                // add declaration
                let borderTopRuleIndex = declarations.length
                for (let j = 0; j < borderTopRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'border-top-width':
                    case 'border-top-style':
                    case 'border-top-color':
                    case 'border-top':
                      if (j < borderTopRuleIndex) { borderTopRuleIndex = j }
                      break
                  }
                }

                declarations.splice(borderTopRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-top',
                  value: borderTopValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noBorderTopsShortened += 1

                let borderTopIndex

                borderTopIndex = declarations.map(toProperty).indexOf('border-top-width')
                if (borderTopIndex !== -1) {
                  declarations.splice(borderTopIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderTopIndex = declarations.map(toProperty).indexOf('border-top-style')
                if (borderTopIndex !== -1) {
                  declarations.splice(borderTopIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderTopIndex = declarations.map(toProperty).indexOf('border-top-color')
                if (borderTopIndex !== -1) {
                  declarations.splice(borderTopIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderTops
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'border-top')
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = borderTopProps.indexOf('border-top')
                    const now = borderTopProps.indexOf('border-top', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit
            }
          } // end of borderTop

          // borderRight
          if (SHORTEN || SHORTEN_BORDER_RIGHT) {
            borderRight = rules[i].declarations.filter(filterForBorderRight)
            let borderRightProps = borderRight.map(toProperty)
            if (
              borderRightProps.includes('border-right-style') ||
              borderRightProps.includes('border-right')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Right : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderRightHasInherit = borderRight.some(hasInherit)
              if (!borderRightHasInherit) {
                let borderRightValues = borderRight.map(toValue)
                borderRightValuesOutput = [
                  (borderRightValues[borderRightProps.indexOf('border-right-width')] ? borderRightValues[borderRightProps.indexOf('border-right-width')] : ''),
                  (borderRightValues[borderRightProps.indexOf('border-right-style')] ? borderRightValues[borderRightProps.indexOf('border-right-style')] : ''),
                  (borderRightValues[borderRightProps.indexOf('border-right-color')] ? borderRightValues[borderRightProps.indexOf('border-right-color')] : '')
                ]

                // existing borderRight check
                const borderRightPropValueIndex = borderRightProps.indexOf('border-right')
                if (borderRightPropValueIndex !== -1) {
                  const borderRightPropValue = borderRightValues[borderRightPropValueIndex]

                  if (borderRightPropValue !== 'none') {
                    // fill missing attribute with existing borderRight
                    if (borderRightProps.indexOf('border-right-width') > borderRightPropValueIndex) {
                      borderRightValuesOutput[0] = borderRightValues[borderRightProps.indexOf('border-right-width')]
                    } else {
                      borderRightValuesOutput[0] = getValueOfTriProp(borderRightPropValue, 'width')
                    }
                    if (borderRightProps.indexOf('border-right-style') > borderRightPropValueIndex) {
                      borderRightValuesOutput[1] = borderRightValues[borderRightProps.indexOf('border-right-style')]
                    } else {
                      borderRightValuesOutput[1] = getValueOfTriProp(borderRightPropValue, 'style')
                    }
                    if (borderRightProps.indexOf('border-right-color') > borderRightPropValueIndex) {
                      borderRightValuesOutput[2] = borderRightValues[borderRightProps.indexOf('border-right-color')]
                    } else {
                      borderRightValuesOutput[2] = getValueOfTriProp(borderRightPropValue, 'color')
                    }
                  } else {
                    borderRightValuesOutput[0] = '0'
                    borderRightValuesOutput[1] = ''
                    borderRightValuesOutput[2] = ''
                  }
                }

                if (
                  borderRightValuesOutput[0] === '' &&
                  borderRightValuesOutput[1] === '' &&
                  borderRightValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  borderRightProps = [...DEFAULT_BORDER_RIGHT_PROPS]
                  borderRightValues = borderRightValuesOutput
                }

                // check for !important
                let borderRightHasImportant = false
                for (let n = 0, j = borderRightValues.length; n < j; ++n) {
                  borderRightValues[n] = borderRightValues[n].toString().replace(/(!important)/g, () => {
                    borderRightHasImportant = true
                    return ''
                  })
                }

                if (borderRightHasImportant) {
                  borderRightValues[borderRightValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                borderRightValues = borderRightValues.filter(Boolean)

                // add declaration
                let borderRightRuleIndex = declarations.length
                for (let j = 0; j < borderRightRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'border-right-width':
                    case 'border-right-style':
                    case 'border-right-color':
                    case 'border-right':
                      if (j < borderRightRuleIndex) { borderRightRuleIndex = j }
                      break
                  }
                }

                declarations.splice(borderRightRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-right',
                  value: borderRightValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noBorderRightsShortened += 1

                let borderRightIndex

                borderRightIndex = declarations.map(toProperty).indexOf('border-right-width')
                if (borderRightIndex !== -1) {
                  declarations.splice(borderRightIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRightIndex = declarations.map(toProperty).indexOf('border-right-style')
                if (borderRightIndex !== -1) {
                  declarations.splice(borderRightIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRightIndex = declarations.map(toProperty).indexOf('border-right-color')
                if (borderRightIndex !== -1) {
                  declarations.splice(borderRightIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderRights
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'border-right').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = borderRightProps.indexOf('border-right')
                    const now = borderRightProps.indexOf('border-right', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit
            }
          } // end of borderRight

          // borderBottom
          if (SHORTEN || SHORTEN_BORDER_BOTTOM) {
            borderBottom = rules[i].declarations.filter(filterForBorderBottom)
            let borderBottomProps = borderBottom.map(toProperty)
            if (
              borderBottomProps.includes('border-bottom-style') ||
              borderBottomProps.includes('border-bottom')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Bottom : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderBottomHasInherit = borderBottom.some(hasInherit)
              if (!borderBottomHasInherit) {
                let borderBottomValues = borderBottom.map(toValue)
                borderBottomValuesOutput = [
                  (borderBottomValues[borderBottomProps.indexOf('border-bottom-width')] ? borderBottomValues[borderBottomProps.indexOf('border-bottom-width')] : ''),
                  (borderBottomValues[borderBottomProps.indexOf('border-bottom-style')] ? borderBottomValues[borderBottomProps.indexOf('border-bottom-style')] : ''),
                  (borderBottomValues[borderBottomProps.indexOf('border-bottom-color')] ? borderBottomValues[borderBottomProps.indexOf('border-bottom-color')] : '')
                ]

                // existing borderBottom check
                const borderBottomPropValueIndex = borderBottomProps.indexOf('border-bottom')
                if (borderBottomPropValueIndex !== -1) {
                  let borderBottomPropValue = borderBottomValues[borderBottomPropValueIndex]

                  if (borderBottomPropValue !== 'none') {
                    // fill missing attribute with existing borderBottom
                    if (borderBottomProps.indexOf('border-bottom-width') > borderBottomPropValueIndex) {
                      borderBottomValuesOutput[0] = borderBottomValues[borderBottomProps.indexOf('border-bottom-width')]
                    } else {
                      borderBottomValuesOutput[0] = (borderBottomPropValue = getValueOfTriProp(borderBottomPropValue, 'width')) ? borderBottomPropValue : borderBottomValuesOutput[0]
                    }
                    if (borderBottomProps.indexOf('border-bottom-style') > borderBottomPropValueIndex) {
                      borderBottomValuesOutput[1] = borderBottomValues[borderBottomProps.indexOf('border-bottom-style')]
                    } else {
                      borderBottomValuesOutput[1] = (borderBottomPropValue = getValueOfTriProp(borderBottomPropValue, 'style')) ? borderBottomPropValue : borderBottomValuesOutput[1]
                    }
                    if (borderBottomProps.indexOf('border-bottom-color') > borderBottomPropValueIndex) {
                      borderBottomValuesOutput[2] = borderBottomValues[borderBottomProps.indexOf('border-bottom-color')]
                    } else {
                      borderBottomValuesOutput[2] = (borderBottomPropValue = getValueOfTriProp(borderBottomPropValue, 'color')) ? borderBottomPropValue : borderBottomValuesOutput[2]
                    }
                  } else {
                    borderBottomValuesOutput[0] = '0'
                    borderBottomValuesOutput[1] = ''
                    borderBottomValuesOutput[2] = ''
                  }
                }

                if (
                  borderBottomValuesOutput[0] === '' &&
                  borderBottomValuesOutput[1] === '' &&
                  borderBottomValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  borderBottomProps = [...DEFAULT_BORDER_BOTTOM_PROPS]
                  borderBottomValues = borderBottomValuesOutput
                }

                // check for !important
                let borderBottomHasImportant = false
                for (let n = 0, j = borderBottomValues.length; n < j; ++n) {
                  borderBottomValues[n] = borderBottomValues[n].toString().replace(/(!important)/g, () => {
                    borderBottomHasImportant = true
                    return ''
                  })
                }

                if (borderBottomHasImportant) {
                  borderBottomValues[borderBottomValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                borderBottomValues = borderBottomValues.filter(Boolean)

                // add declaration
                let borderBottomRuleIndex = declarations.length
                for (let j = 0; j < borderBottomRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'border-bottom-width':
                    case 'border-bottom-style':
                    case 'border-bottom-color':
                    case 'border-bottom':
                      if (j < borderBottomRuleIndex) { borderBottomRuleIndex = j }
                      break
                  }
                }

                declarations.splice(borderBottomRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-bottom',
                  value: borderBottomValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noBorderBottomsShortened += 1

                let borderBottomIndex

                borderBottomIndex = declarations.map(toProperty).indexOf('border-bottom-width')
                if (borderBottomIndex !== -1) {
                  declarations.splice(borderBottomIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderBottomIndex = declarations.map(toProperty).indexOf('border-bottom-style')
                if (borderBottomIndex !== -1) {
                  declarations.splice(borderBottomIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderBottomIndex = declarations.map(toProperty).indexOf('border-bottom-color')
                if (borderBottomIndex !== -1) {
                  declarations.splice(borderBottomIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderBottoms
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'border-bottom').length
                if (j > 1) {
                  for (let i = 0; i < j; ++i) {
                    const was = borderBottomProps.indexOf('border-bottom')
                    const now = borderBottomProps.indexOf('border-bottom', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit
            }
          } // end of borderBottom

          // borderLeft
          if (SHORTEN || SHORTEN_BORDER_LEFT) {
            borderLeft = rules[i].declarations.filter(filterForBorderLeft)
            let borderLeftProps = borderLeft.map(toProperty)
            if (
              borderLeftProps.includes('border-left-style') ||
              borderLeftProps.includes('border-left')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Left : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderLeftHasInherit = borderLeft.some(hasInherit)
              if (!borderLeftHasInherit) {
                let borderLeftValues = borderLeft.map(toValue)
                borderLeftValuesOutput = [
                  (borderLeftValues[borderLeftProps.indexOf('border-left-width')] ? borderLeftValues[borderLeftProps.indexOf('border-left-width')] : ''),
                  (borderLeftValues[borderLeftProps.indexOf('border-left-style')] ? borderLeftValues[borderLeftProps.indexOf('border-left-style')] : ''),
                  (borderLeftValues[borderLeftProps.indexOf('border-left-color')] ? borderLeftValues[borderLeftProps.indexOf('border-left-color')] : '')
                ]

                // existing borderLeft check
                const borderLeftPropValueIndex = borderLeftProps.indexOf('border-left')
                if (borderLeftPropValueIndex !== -1) {
                  let borderLeftPropValue = borderLeftValues[borderLeftPropValueIndex]

                  if (borderLeftPropValue !== 'none') {
                    // fill missing attribute with existing borderLeft
                    if (borderLeftProps.indexOf('border-left-width') > borderLeftPropValueIndex) {
                      borderLeftValuesOutput[0] = borderLeftValues[borderLeftProps.indexOf('border-left-width')]
                    } else {
                      borderLeftValuesOutput[0] = (borderLeftPropValue = getValueOfTriProp(borderLeftPropValue, 'width')) ? borderLeftPropValue : borderLeftValuesOutput[0]
                    }
                    if (borderLeftProps.indexOf('border-left-style') > borderLeftPropValueIndex) {
                      borderLeftValuesOutput[1] = borderLeftValues[borderLeftProps.indexOf('border-left-style')]
                    } else {
                      borderLeftValuesOutput[1] = (borderLeftPropValue = getValueOfTriProp(borderLeftPropValue, 'style')) ? borderLeftPropValue : borderLeftValuesOutput[1]
                    }
                    if (borderLeftProps.indexOf('border-left-color') > borderLeftPropValueIndex) {
                      borderLeftValuesOutput[2] = borderLeftValues[borderLeftProps.indexOf('border-left-color')]
                    } else {
                      borderLeftValuesOutput[2] = (borderLeftPropValue = getValueOfTriProp(borderLeftPropValue, 'color')) ? borderLeftPropValue : borderLeftValuesOutput[2]
                    }
                  } else {
                    borderLeftValuesOutput[0] = '0'
                    borderLeftValuesOutput[1] = ''
                    borderLeftValuesOutput[2] = ''
                  }
                }

                if (
                  borderLeftValuesOutput[0] === '' &&
                  borderLeftValuesOutput[1] === '' &&
                  borderLeftValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  borderLeftProps = [...DEFAULT_BORDER_LEFT_PROPS]
                  borderLeftValues = borderLeftValuesOutput
                }

                // check for !important
                let borderLeftHasImportant = false
                for (let n = 0, j = borderLeftValues.length; n < j; ++n) {
                  borderLeftValues[n] = borderLeftValues[n].toString().replace(/(!important)/g, () => {
                    borderLeftHasImportant = true
                    return ''
                  })
                }

                if (borderLeftHasImportant) {
                  borderLeftValues[borderLeftValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                borderLeftValues = borderLeftValues.filter(Boolean)

                // add declaration
                let borderLeftRuleIndex = declarations.length
                for (let j = 0; j < borderLeftRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'border-left-width':
                    case 'border-left-style':
                    case 'border-left-color':
                    case 'border-left':
                      if (j < borderLeftRuleIndex) { borderLeftRuleIndex = j }
                      break
                  }
                }

                declarations.splice(borderLeftRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-left',
                  value: borderLeftValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noBorderLeftsShortened += 1

                let borderLeftIndex

                borderLeftIndex = declarations.map(toProperty).indexOf('border-left-width')
                if (borderLeftIndex !== -1) {
                  declarations.splice(borderLeftIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderLeftIndex = declarations.map(toProperty).indexOf('border-left-style')
                if (borderLeftIndex !== -1) {
                  declarations.splice(borderLeftIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderLeftIndex = declarations.map(toProperty).indexOf('border-left-color')
                if (borderLeftIndex !== -1) {
                  declarations.splice(borderLeftIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderLefts
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'border-left')
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = borderLeftProps.indexOf('border-left')
                    const now = borderLeftProps.indexOf('border-left', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of borderLeft

          // border
          if (SHORTEN || SHORTEN_BORDER) {
            border = rules[i].declarations.filter(filterForBorderTopRightBottomLeft)
            let borderTopRightBottomLeftProps = border.map(toProperty)
            if (
              borderTopRightBottomLeftProps.includes('border-top') &&
              borderTopRightBottomLeftProps.includes('border-right') &&
              borderTopRightBottomLeftProps.includes('border-bottom') &&
              borderTopRightBottomLeftProps.includes('border-left')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderHasInherit = border.some(hasInherit)
              if (!borderHasInherit) {
                let borderTopRightBottomLeftValues = border.map(toValue)
                borderTopRightBottomLeftValuesOutput = [
                  (borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-width')] ? borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-width')] : ''),
                  (borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-style')] ? borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-style')] : ''),
                  (borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-color')] ? borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-color')] : '')
                ]

                if (
                  borderTopRightBottomLeftValues[0] == borderTopRightBottomLeftValues[1] &&
                  borderTopRightBottomLeftValues[0] == borderTopRightBottomLeftValues[2] &&
                  borderTopRightBottomLeftValues[0] == borderTopRightBottomLeftValues[3]
                ) {
                  const borderPropValue = borderTopRightBottomLeftValues[0]

                  if (borderTopRightBottomLeftProps.indexOf('border-width') == -1) {
                    borderTopRightBottomLeftValuesOutput[0] = getValueOfTriProp(borderPropValue, 'width')
                  } else {
                    borderTopRightBottomLeftValuesOutput[0] = borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-width')]
                  }
                  if (borderTopRightBottomLeftProps.indexOf('border-style') == -1) {
                    borderTopRightBottomLeftValuesOutput[1] = getValueOfTriProp(borderPropValue, 'style')
                  } else {
                    borderTopRightBottomLeftValuesOutput[1] = borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-style')]
                  }
                  if (borderTopRightBottomLeftProps.indexOf('border-color') == -1) {
                    borderTopRightBottomLeftValuesOutput[2] = getValueOfTriProp(borderPropValue, 'color')
                  } else {
                    borderTopRightBottomLeftValuesOutput[2] = borderTopRightBottomLeftValues[borderTopRightBottomLeftProps.indexOf('border-color')]
                  }

                  if (
                    borderTopRightBottomLeftValuesOutput[0] === '' &&
                    borderTopRightBottomLeftValuesOutput[1] === '' &&
                    borderTopRightBottomLeftValuesOutput[2] === ''
                  ) {
                    // !!!
                  } else {
                    borderTopRightBottomLeftProps = [...DEFAULT_BORDER_PROPS]
                    borderTopRightBottomLeftValues = borderTopRightBottomLeftValuesOutput
                  }

                  // check for !important
                  let borderHasImportant = false
                  for (let n = 0, j = borderTopRightBottomLeftValues.length; n < j; ++n) {
                    borderTopRightBottomLeftValues[n] = borderTopRightBottomLeftValues[n].toString().replace(/(!important)/g, () => {
                      borderHasImportant = true
                      return ''
                    })
                  }

                  if (borderHasImportant) {
                    borderTopRightBottomLeftValues[borderTopRightBottomLeftValues.length - 1] += ' !important'
                  }

                  const declarations = rules[i].declarations

                  // remove any spaces from empty values
                  borderTopRightBottomLeftValues = borderTopRightBottomLeftValues.filter(Boolean)

                  // add declaration
                  let borderTopRightBottomLeftRuleValueIndex = declarations.length
                  for (let j = 0; j < borderTopRightBottomLeftRuleValueIndex; ++j) {
                    switch (declarations[j].property) {
                      case 'border-top':
                      case 'border-right':
                      case 'border-bottom':
                      case 'border-left':
                        if (j < borderTopRightBottomLeftRuleValueIndex) { borderTopRightBottomLeftRuleValueIndex = j }
                        break
                    }
                  }

                  declarations.splice(borderTopRightBottomLeftRuleValueIndex, 0, {
                    type: 'declaration',
                    property: 'border',
                    value: borderTopRightBottomLeftValues.join(' ')
                  })

                  DECLARATION_COUNT += 1
                  summary.stats.summary.noBorderTopRightBottomLeftsShortened += 1

                  let borderTopRightBottomLeftIndex

                  borderTopRightBottomLeftIndex = declarations.map(toProperty).indexOf('border-top')
                  if (borderTopRightBottomLeftIndex !== -1) {
                    declarations.splice(borderTopRightBottomLeftIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  borderTopRightBottomLeftIndex = declarations.map(toProperty).indexOf('border-right')
                  if (borderTopRightBottomLeftIndex !== -1) {
                    declarations.splice(borderTopRightBottomLeftIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  borderTopRightBottomLeftIndex = declarations.map(toProperty).indexOf('border-bottom')
                  if (borderTopRightBottomLeftIndex !== -1) {
                    declarations.splice(borderTopRightBottomLeftIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  borderTopRightBottomLeftIndex = declarations.map(toProperty).indexOf('border-left')
                  if (borderTopRightBottomLeftIndex !== -1) {
                    declarations.splice(borderTopRightBottomLeftIndex, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            } // end of combining

            border = rules[i].declarations.filter(filterForBorder)
            let borderProps = border.map(toProperty)
            if (
              (
                borderProps.includes('border-width') &&
                borderProps.includes('border-style') &&
                borderProps.includes('border-color')
              ) ||
              borderProps.includes('border')
            ) {
              const borderHasInherit = border.some(hasInherit)
              let borderValues = border.map(toValue)
              if (!borderHasInherit &&
                (
                  borderProps.includes('border-width') &&
                  borderProps.includes('border-style') &&
                  borderProps.includes('border-color')
                ) &&
                borderValues[borderProps.indexOf('border-color')].split(' ').length == 1 && // multi-color (border around squares, etc.) check - only do if single
                borderValues[borderProps.indexOf('border-width')].split(' ').length == 1 // multi-width values not allowed
              ) {
                borderValuesOutput = [
                  (borderValues[borderProps.indexOf('border-width')] ? borderValues[borderProps.indexOf('border-width')] : ''),
                  (borderValues[borderProps.indexOf('border-style')] ? borderValues[borderProps.indexOf('border-style')] : ''),
                  (borderValues[borderProps.indexOf('border-color')] ? borderValues[borderProps.indexOf('border-color')] : '')
                ]

                // existing border check
                const borderPropValueIndex = borderProps.indexOf('border')
                if (borderPropValueIndex !== -1) {
                  let borderPropValue = borderValues[borderPropValueIndex]

                  if (borderPropValue !== 'none') {
                    // fill missing attribute with existing border
                    if (borderProps.indexOf('border-width') > borderPropValueIndex) {
                      borderValuesOutput[0] = borderValues[borderProps.indexOf('border-width')]
                    } else {
                      borderValuesOutput[0] = (borderPropValue = getValueOfTriProp(borderPropValue, 'width')) ? borderPropValue : borderValuesOutput[0]
                    }
                    if (borderProps.indexOf('border-style') > borderPropValueIndex) {
                      borderValuesOutput[1] = borderValues[borderProps.indexOf('border-style')]
                    } else {
                      borderValuesOutput[1] = (borderPropValue = getValueOfTriProp(borderPropValue, 'style')) ? borderPropValue : borderValuesOutput[1]
                    }
                    if (borderProps.indexOf('border-color') > borderPropValueIndex) {
                      borderValuesOutput[2] = borderValues[borderProps.indexOf('border-color')]
                    } else {
                      borderValuesOutput[2] = (borderPropValue = getValueOfTriProp(borderPropValue, 'color')) ? borderPropValue : borderValuesOutput[2]
                    }
                  } else {
                    borderValuesOutput[0] = '0'
                    borderValuesOutput[1] = ''
                    borderValuesOutput[2] = ''
                  }
                }

                if (
                  borderValuesOutput[0] === '' &&
                  borderValuesOutput[1] === '' &&
                  borderValuesOutput[2] === ''
                ) {
                  // !!!
                } else {
                  borderProps = [...DEFAULT_BORDER_PROPS]
                  borderValues = borderValuesOutput
                }

                // check for !important
                let borderHasImportant = false
                for (let n = 0, j = borderValues.length; n < j; ++n) {
                  borderValues[n] = borderValues[n].toString().replace(/(!important)/g, () => {
                    borderHasImportant = true
                    return ''
                  })
                }

                if (borderHasImportant) {
                  borderValues[borderValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                borderValues = borderValues.filter(Boolean)

                // add declaration
                let borderRuleValueIndex = declarations.length
                for (let j = 0; j < borderRuleValueIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'border-width':
                    case 'border-style':
                    case 'border-color':
                    case 'border':
                      if (j < borderRuleValueIndex) { borderRuleValueIndex = j }
                      break
                  }
                }

                declarations.splice(borderRuleValueIndex, 0, {
                  type: 'declaration',
                  property: 'border',
                  value: borderValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noBordersShortened += 1

                let borderIndex

                borderIndex = declarations.map(toProperty).indexOf('border-width')
                if (borderIndex !== -1) {
                  declarations.splice(borderIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderIndex = declarations.map(toProperty).indexOf('border-style')
                if (borderIndex !== -1) {
                  declarations.splice(borderIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderIndex = declarations.map(toProperty).indexOf('border-color')
                if (borderIndex !== -1) {
                  declarations.splice(borderIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borders
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'border').length
                if (j > 1) {
                  for (let i = 0; i < j; ++i) {
                    const was = properties.indexOf('border')
                    const now = properties.indexOf('border', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of border

          // borderRadius
          if (SHORTEN || SHORTEN_BORDER_RADIUS) {
            borderRadius = rules[i].declarations.filter(filterForBorderRadius)
            let borderRadiusProps = borderRadius.map(toProperty)
            if (
              (
                borderRadiusProps.includes('border-top-left-radius') &&
                borderRadiusProps.includes('border-top-right-radius') &&
                borderRadiusProps.includes('border-bottom-left-radius') &&
                borderRadiusProps.includes('border-bottom-right-radius')
              ) ||
              borderRadiusProps.includes('border-radius')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Radius : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderRadiusHasInherit = borderRadius.some(hasInherit)
              if (!borderRadiusHasInherit) {
                let borderRadiusValues = borderRadius.map(toValue)
                borderRadiusValuesOutput = [
                  (borderRadiusValues[borderRadiusProps.indexOf('border-top-left-radius')] ? borderRadiusValues[borderRadiusProps.indexOf('border-top-left-radius')] : ''),
                  (borderRadiusValues[borderRadiusProps.indexOf('border-top-right-radius')] ? borderRadiusValues[borderRadiusProps.indexOf('border-top-right-radius')] : ''),
                  (borderRadiusValues[borderRadiusProps.indexOf('border-bottom-left-radius')] ? borderRadiusValues[borderRadiusProps.indexOf('border-bottom-left-radius')] : ''),
                  (borderRadiusValues[borderRadiusProps.indexOf('border-bottom-right-radius')] ? borderRadiusValues[borderRadiusProps.indexOf('border-bottom-right-radius')] : '')
                ]

                // existing borderRadius check
                const borderRadiusPropValueIndex = borderRadiusProps.indexOf('border-radius')
                if (borderRadiusPropValueIndex !== -1) {
                  let borderRadiusPropValue = borderRadiusValues[borderRadiusPropValueIndex]

                  // fill missing attribute with existing borderRadius
                  if (borderRadiusProps.indexOf('border-top-left-radius') > borderRadiusPropValueIndex) {
                    borderRadiusValuesOutput[0] = borderRadiusValues[borderRadiusProps.indexOf('border-top-left-radius')]
                  } else {
                    borderRadiusValuesOutput[0] = (borderRadiusPropValue = getValueOfSquareProp(borderRadiusPropValue, 'top')) ? borderRadiusPropValue : borderRadiusValuesOutput[0]
                  }
                  if (borderRadiusProps.indexOf('border-top-right-radius') > borderRadiusPropValueIndex) {
                    borderRadiusValuesOutput[1] = borderRadiusValues[borderRadiusProps.indexOf('border-top-right-radius')]
                  } else {
                    borderRadiusValuesOutput[1] = (borderRadiusPropValue = getValueOfSquareProp(borderRadiusPropValue, 'right')) ? borderRadiusPropValue : borderRadiusValuesOutput[1]
                  }
                  if (borderRadiusProps.indexOf('border-bottom-left-radius') > borderRadiusPropValueIndex) {
                    borderRadiusValuesOutput[2] = borderRadiusValues[borderRadiusProps.indexOf('border-bottom-left-radius')]
                  } else {
                    borderRadiusValuesOutput[2] = (borderRadiusPropValue = getValueOfSquareProp(borderRadiusPropValue, 'bottom')) ? borderRadiusPropValue : borderRadiusValuesOutput[2]
                  }
                  if (borderRadiusProps.indexOf('border-bottom-right-radius') > borderRadiusPropValueIndex) {
                    borderRadiusValuesOutput[3] = borderRadiusValues[borderRadiusProps.indexOf('border-bottom-right-radius')]
                  } else {
                    borderRadiusValuesOutput[3] = (borderRadiusPropValue = getValueOfSquareProp(borderRadiusPropValue, 'left')) ? borderRadiusPropValue : borderRadiusValuesOutput[3]
                  }
                }

                borderRadiusProps = [...DEFAULT_BORDER_RADIUS_PROPS]
                borderRadiusValues = borderRadiusValuesOutput

                // check for requirements
                const borderRadiusLeftIndex = borderRadiusProps.indexOf('border-bottom-right-radius')
                const borderRadiusRightIndex = borderRadiusProps.indexOf('border-top-right-radius')
                const borderRadiusTopIndex = borderRadiusProps.indexOf('border-top-left-radius')
                const borderRadiusBottomIndex = borderRadiusProps.indexOf('border-bottom-left-radius')

                // apply rules
                // 1 value
                if (
                  borderRadiusTopIndex !== -1 && borderRadiusBottomIndex !== -1 &&
                  borderRadiusLeftIndex !== -1 && borderRadiusRightIndex !== -1 &&
                  borderRadiusValues[borderRadiusTopIndex] == borderRadiusValues[borderRadiusBottomIndex] &&
                  borderRadiusValues[borderRadiusTopIndex] == borderRadiusValues[borderRadiusRightIndex] &&
                  borderRadiusValues[borderRadiusTopIndex] == borderRadiusValues[borderRadiusLeftIndex]
                ) {
                  borderRadiusProps = ['border-radius']
                  borderRadiusValues = [borderRadiusValues[borderRadiusTopIndex]]
                } else if ( // 2
                  borderRadiusTopIndex !== -1 && borderRadiusBottomIndex !== -1 &&
                  borderRadiusLeftIndex !== -1 && borderRadiusRightIndex !== -1 &&
                  borderRadiusValues[borderRadiusTopIndex] === borderRadiusValues[borderRadiusBottomIndex] &&
                  borderRadiusValues[borderRadiusLeftIndex] === borderRadiusValues[borderRadiusRightIndex]
                ) {
                  const borderRadiusTopBottomValue = borderRadiusValues[borderRadiusTopIndex]
                  // remove Top + Bottom values
                  borderRadiusValues.splice(borderRadiusTopIndex, 1)
                  borderRadiusValues.splice(borderRadiusBottomIndex - 1, 1)
                  // add TopBottom value
                  borderRadiusValues.splice(0, 0, borderRadiusTopBottomValue)

                  // remove Top + Bottom properties
                  borderRadiusProps.splice(borderRadiusTopIndex, 1)
                  borderRadiusProps.splice(borderRadiusBottomIndex - 1, 1)
                  // add TopBottom property - for alignment sake
                  borderRadiusProps.splice(0, 0, 'border-radius-top-bottom')

                  const borderRadiusRightLeftValue = borderRadiusValues[borderRadiusRightIndex]
                  // remove Right + Left values
                  borderRadiusValues.splice(borderRadiusRightIndex, 1)
                  borderRadiusValues.splice(borderRadiusLeftIndex - 2, 1)
                  // add RightLeft value
                  borderRadiusValues.splice(1, 0, borderRadiusRightLeftValue)

                  // remove Right + Left properties
                  borderRadiusProps.splice(borderRadiusRightIndex, 1)
                  borderRadiusProps.splice(borderRadiusLeftIndex - 2, 1)
                  // add RightLeft property - for alignment sake
                  borderRadiusProps.splice(1, 0, 'border-radius-right-left')
                } else if ( // 3 values
                  borderRadiusLeftIndex !== -1 && borderRadiusRightIndex !== -1 &&
                  borderRadiusTopIndex !== -1 && borderRadiusBottomIndex !== -1 &&
                  borderRadiusValues[borderRadiusLeftIndex] === borderRadiusValues[borderRadiusRightIndex]
                ) {
                  const borderRadiusRightLeftValue = borderRadiusValues[borderRadiusRightIndex]

                  // remove right + left values
                  borderRadiusValues.splice(borderRadiusRightIndex, 1)
                  borderRadiusValues.splice(borderRadiusLeftIndex - 1, 1)
                  // add rightleft value
                  borderRadiusValues.splice(1, 0, borderRadiusRightLeftValue)

                  // remove right + left properties
                  borderRadiusProps.splice(borderRadiusRightIndex, 1)
                  borderRadiusProps.splice(borderRadiusLeftIndex - 1, 1)
                  // add rightleft property - for alignment sake
                  borderRadiusProps.splice(1, 0, 'border-radius-left-right')
                }

                // check for !important
                let borderRadiusHasImportant = false
                for (let n = 0, j = borderRadiusValues.length; n < j; ++n) {
                  borderRadiusValues[n] = borderRadiusValues[n].toString().replace(/(!important)/g, () => {
                    borderRadiusHasImportant = true
                    return ''
                  })
                }

                if (borderRadiusHasImportant) {
                  borderRadiusValues[borderRadiusValues.length - 1] += ' !important'
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                borderRadiusValues = borderRadiusValues.filter(Boolean)

                // add declaration
                let borderRadiusRuleValueIndex = declarations.length
                for (let j = 0; j < borderRadiusRuleValueIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'border-top-left-radius':
                    case 'border-top-right-radius':
                    case 'border-bottom-left-radius':
                    case 'border-bottom-right-radius':
                    case 'border-radius':
                      if (j < borderRadiusRuleValueIndex) { borderRadiusRuleValueIndex = j }
                      break
                  }
                }

                declarations.splice(borderRadiusRuleValueIndex, 0, {
                  type: 'declaration',
                  property: 'border-radius',
                  value: borderRadiusValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noPaddingsShortened += 1

                let borderRadiusIndex

                // remove originals
                borderRadiusIndex = declarations.map(toProperty).indexOf('border-top-left-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRadiusIndex = declarations.map(toProperty).indexOf('border-top-right-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRadiusIndex = declarations.map(toProperty).indexOf('border-bottom-left-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRadiusIndex = declarations.map(toProperty).indexOf('border-bottom-right-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderRadiuss
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'border-radius').length
                if (j > 1) {
                  for (let i = 0; i < j; ++i) {
                    const was = properties.indexOf('border-radius')
                    const now = properties.indexOf('border-radius', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of borderRadius

          // margin
          if (SHORTEN || SHORTEN_MARGIN) {
            margin = rules[i].declarations.filter(filterForMargin)
            let marginProps = margin.map(toProperty)
            if (
              (
                marginProps.includes('margin-top') &&
                marginProps.includes('margin-right') &&
                marginProps.includes('margin-bottom') &&
                marginProps.includes('margin-left')
              ) ||
              marginProps.includes('margin')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Margin : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const marginHasInherit = margin.some(hasInherit)
              if (!marginHasInherit) {
                let marginValues = margin.map(toValue)
                marginValuesOutput = [
                  (marginValues[marginProps.indexOf('margin-top')] ? marginValues[marginProps.indexOf('margin-top')] : ''),
                  (marginValues[marginProps.indexOf('margin-right')] ? marginValues[marginProps.indexOf('margin-right')] : ''),
                  (marginValues[marginProps.indexOf('margin-bottom')] ? marginValues[marginProps.indexOf('margin-bottom')] : ''),
                  (marginValues[marginProps.indexOf('margin-left')] ? marginValues[marginProps.indexOf('margin-left')] : '')
                ]

                // existing margin check
                const marginPropValueIndex = marginProps.indexOf('margin')
                if (marginPropValueIndex !== -1) {
                  const marginPropValue = marginValues[marginPropValueIndex]

                  // fill missing attribute with existing margin
                  if (marginProps.indexOf('margin-top') > marginPropValueIndex) {
                    marginValuesOutput[0] = marginValues[marginProps.indexOf('margin-top')]
                  } else {
                    marginValuesOutput[0] = getValueOfSquareProp(marginPropValue, 'top')
                  }
                  if (marginProps.indexOf('margin-right') > marginPropValueIndex) {
                    marginValuesOutput[1] = marginValues[marginProps.indexOf('margin-right')]
                  } else {
                    marginValuesOutput[1] = getValueOfSquareProp(marginPropValue, 'right')
                  }
                  if (marginProps.indexOf('margin-bottom') > marginPropValueIndex) {
                    marginValuesOutput[2] = marginValues[marginProps.indexOf('margin-bottom')]
                  } else {
                    marginValuesOutput[2] = getValueOfSquareProp(marginPropValue, 'bottom')
                  }
                  if (marginProps.indexOf('margin-left') > marginPropValueIndex) {
                    marginValuesOutput[3] = marginValues[marginProps.indexOf('margin-left')]
                  } else {
                    marginValuesOutput[3] = getValueOfSquareProp(marginPropValue, 'left')
                  }
                }

                if (
                  marginValuesOutput[0] === '' &&
                  marginValuesOutput[1] === '' &&
                  marginValuesOutput[2] === '' &&
                  marginValuesOutput[3] === ''
                ) {
                  //
                } else {
                  marginProps = [...DEFAULT_MARGIN_PROPS]
                  marginValues = marginValuesOutput
                }

                // check for !important
                let marginHasImportant = false
                for (let n = 0, j = marginValues.length; n < j; ++n) {
                  marginValues[n] = marginValues[n].toString().replace(/(!important)/g, () => {
                    marginHasImportant = true
                    return ''
                  })
                }

                if (marginHasImportant) {
                  marginValues[marginValues.length - 1] += ' !important'
                }

                // check for requirements
                const marginLeftIndex = marginProps.indexOf('margin-left')
                const marginRightIndex = marginProps.indexOf('margin-right')
                const marginTopIndex = marginProps.indexOf('margin-top')
                const marginBottomIndex = marginProps.indexOf('margin-bottom')

                // apply rules
                // 1 value
                if (
                  marginTopIndex !== -1 && marginBottomIndex !== -1 &&
                  marginLeftIndex !== -1 && marginRightIndex !== -1 &&
                  marginValues[marginTopIndex] == marginValues[marginBottomIndex] &&
                  marginValues[marginTopIndex] == marginValues[marginRightIndex] &&
                  marginValues[marginTopIndex] == marginValues[marginLeftIndex]) {
                  marginProps = ['margin']
                  marginValues = [marginValues[marginTopIndex]]
                } else if ( // 2
                  marginTopIndex !== -1 && marginBottomIndex !== -1 &&
                  marginLeftIndex !== -1 && marginRightIndex !== -1 &&
                  marginValues[marginTopIndex] == marginValues[marginBottomIndex] &&
                  marginValues[marginLeftIndex] == marginValues[marginRightIndex]) {
                  const marginTopBottomValue = marginValues[marginTopIndex]
                  // remove Top + Bottom values
                  marginValues.splice(marginTopIndex, 1)
                  marginValues.splice(marginBottomIndex - 1, 1)
                  // add TopBottom value
                  marginValues.splice(0, 0, marginTopBottomValue)

                  // remove Top + Bottom properties
                  marginProps.splice(marginTopIndex, 1)
                  marginProps.splice(marginBottomIndex - 1, 1)
                  // add TopBottom property - for alignment sake
                  marginProps.splice(0, 0, 'marginTopBottom')

                  const marginLeftRightValue = marginValues[marginRightIndex]
                  // remove Right + Left values
                  marginValues.splice(marginRightIndex, 1)
                  marginValues.splice(marginLeftIndex - 2, 1)
                  // add RightLeft value
                  marginValues.splice(1, 0, marginLeftRightValue)

                  // remove Right + Left properties
                  marginProps.splice(marginRightIndex, 1)
                  marginProps.splice(marginLeftIndex - 2, 1)
                  // add RightLeft property - for alignment sake
                  marginProps.splice(1, 0, 'marginRightLeft')
                } else if ( // 3 values
                  marginLeftIndex !== -1 && marginRightIndex !== -1 &&
                  marginTopIndex !== -1 && marginBottomIndex !== -1 &&
                  marginValues[marginLeftIndex] == marginValues[marginRightIndex]) {
                  const marginLeftRightValue = marginValues[marginRightIndex]

                  // remove right + left values
                  marginValues.splice(marginRightIndex, 1)
                  marginValues.splice(marginLeftIndex - 1, 1)
                  // add rightleft value
                  marginValues.splice(1, 0, marginLeftRightValue)

                  // remove right + left properties
                  marginProps.splice(marginRightIndex, 1)
                  marginProps.splice(marginLeftIndex - 1, 1)
                  // add rightleft property - for alignment sake
                  marginProps.splice(1, 0, 'marginLeftRight')
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                marginValues = marginValues.filter(Boolean)

                // add declaration
                let marginRuleIndex = declarations.length
                for (let j = 0; j < marginRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'margin-top':
                    case 'margin-right':
                    case 'margin-bottom':
                    case 'margin-left':
                    case 'margin':
                      if (j < marginRuleIndex) { marginRuleIndex = j }
                      break
                  }
                }

                declarations.splice(marginRuleIndex, 0, {
                  type: 'declaration',
                  property: 'margin',
                  value: marginValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noMarginsShortened += 1

                let marginIndex

                // remove originals
                marginIndex = declarations.map(toProperty).indexOf('margin-top')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                marginIndex = declarations.map(toProperty).indexOf('margin-right')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                marginIndex = declarations.map(toProperty).indexOf('margin-bottom')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                marginIndex = declarations.map(toProperty).indexOf('margin-left')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing margins
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'margin').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('margin')
                    const now = properties.indexOf('margin', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of margin

          // padding
          if (SHORTEN || SHORTEN_PADDING) {
            padding = rules[i].declarations.filter(filterForPadding)
            let paddingProps = padding.map(toProperty)
            if (
              (
                paddingProps.includes('padding-top') &&
                paddingProps.includes('padding-right') &&
                paddingProps.includes('padding-bottom') &&
                paddingProps.includes('padding-left')
              ) ||
              paddingProps.includes('padding')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Padding : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const paddingHasInherit = padding.some(hasInherit)
              if (!paddingHasInherit) {
                let paddingValues = padding.map(toValue)
                paddingValuesOutput = [
                  (paddingValues[paddingProps.indexOf('padding-top')] ? paddingValues[paddingProps.indexOf('padding-top')] : ''),
                  (paddingValues[paddingProps.indexOf('padding-right')] ? paddingValues[paddingProps.indexOf('padding-right')] : ''),
                  (paddingValues[paddingProps.indexOf('padding-bottom')] ? paddingValues[paddingProps.indexOf('padding-bottom')] : ''),
                  (paddingValues[paddingProps.indexOf('padding-left')] ? paddingValues[paddingProps.indexOf('padding-left')] : '')
                ]

                // existing padding check
                const paddingPropValueIndex = paddingProps.indexOf('padding')
                if (paddingPropValueIndex !== -1) {
                  let paddingPropValue = paddingValues[paddingPropValueIndex]

                  // fill missing attribute with existing padding
                  if (paddingProps.indexOf('padding-top') > paddingPropValueIndex) {
                    paddingValuesOutput[0] = paddingValues[paddingProps.indexOf('padding-top')]
                  } else {
                    paddingValuesOutput[0] = (paddingPropValue = getValueOfSquareProp(paddingPropValue, 'top')) ? paddingPropValue : paddingValuesOutput[0]
                  }
                  if (paddingProps.indexOf('padding-right') > paddingPropValueIndex) {
                    paddingValuesOutput[1] = paddingValues[paddingProps.indexOf('padding-right')]
                  } else {
                    paddingValuesOutput[1] = (paddingPropValue = getValueOfSquareProp(paddingPropValue, 'right')) ? paddingPropValue : paddingValuesOutput[1]
                  }
                  if (paddingProps.indexOf('padding-bottom') > paddingPropValueIndex) {
                    paddingValuesOutput[2] = paddingValues[paddingProps.indexOf('padding-bottom')]
                  } else {
                    paddingValuesOutput[2] = (paddingPropValue = getValueOfSquareProp(paddingPropValue, 'bottom')) ? paddingPropValue : paddingValuesOutput[2]
                  }
                  if (paddingProps.indexOf('padding-left') > paddingPropValueIndex) {
                    paddingValuesOutput[3] = paddingValues[paddingProps.indexOf('padding-left')]
                  } else {
                    paddingValuesOutput[3] = (paddingPropValue = getValueOfSquareProp(paddingPropValue, 'left')) ? paddingPropValue : paddingValuesOutput[3]
                  }
                }

                if (
                  paddingValuesOutput[0] === '' &&
                  paddingValuesOutput[1] === '' &&
                  paddingValuesOutput[2] === '' &&
                  paddingValuesOutput[3] === ''
                ) {
                  //
                } else {
                  paddingProps = [...DEFAULT_PADDING_PROPS]
                  paddingValues = paddingValuesOutput
                }

                // check for !important
                let paddingHasImportant = false
                for (let n = 0, j = paddingValues.length; n < j; ++n) {
                  paddingValues[n] = paddingValues[n].toString().replace(/(!important)/g, () => {
                    paddingHasImportant = true
                    return ''
                  })
                }

                if (paddingHasImportant) {
                  paddingValues[paddingValues.length - 1] += ' !important'
                }

                // check for requirements
                const paddingLeftIndex = paddingProps.indexOf('padding-left')
                const paddingRightIndex = paddingProps.indexOf('padding-right')
                const paddingTopIndex = paddingProps.indexOf('padding-top')
                const paddingBottomIndex = paddingProps.indexOf('padding-bottom')

                // 1 value
                if (
                  paddingTopIndex !== -1 && paddingBottomIndex !== -1 &&
                  paddingLeftIndex !== -1 && paddingRightIndex !== -1 &&
                  paddingValues[paddingTopIndex] == paddingValues[paddingBottomIndex] &&
                  paddingValues[paddingTopIndex] == paddingValues[paddingRightIndex] &&
                  paddingValues[paddingTopIndex] == paddingValues[paddingLeftIndex]
                ) {
                  paddingProps = ['padding']
                  paddingValues = [paddingValues[paddingTopIndex]]
                } else if ( // 2
                  paddingTopIndex !== -1 && paddingBottomIndex !== -1 &&
                  paddingLeftIndex !== -1 && paddingRightIndex !== -1 &&
                  paddingValues[paddingTopIndex] == paddingValues[paddingBottomIndex] &&
                  paddingValues[paddingLeftIndex] == paddingValues[paddingRightIndex]) {
                  const paddingTopBottomValue = paddingValues[paddingTopIndex]
                  // remove Top + Bottom values
                  paddingValues.splice(paddingTopIndex, 1)
                  paddingValues.splice(paddingBottomIndex - 1, 1)
                  // add TopBottom value
                  paddingValues.splice(0, 0, paddingTopBottomValue)

                  // remove Top + Bottom properties
                  paddingProps.splice(paddingTopIndex, 1)
                  paddingProps.splice(paddingBottomIndex - 1, 1)
                  // add TopBottom property - for alignment sake
                  paddingProps.splice(0, 0, 'paddingTopBottom')

                  const paddingRightLeftValue = paddingValues[paddingRightIndex]
                  // remove Right + Left values
                  paddingValues.splice(paddingRightIndex, 1)
                  paddingValues.splice(paddingLeftIndex - 2, 1)
                  // add RightLeft value
                  paddingValues.splice(1, 0, paddingRightLeftValue)

                  // remove Right + Left properties
                  paddingProps.splice(paddingRightIndex, 1)
                  paddingProps.splice(paddingLeftIndex - 2, 1)
                  // add RightLeft property - for alignment sake
                  paddingProps.splice(1, 0, 'paddingRightLeft')
                } else if ( // 3 values
                  paddingLeftIndex !== -1 && paddingRightIndex !== -1 &&
                  paddingTopIndex !== -1 && paddingBottomIndex !== -1 &&
                  paddingValues[paddingLeftIndex] == paddingValues[paddingRightIndex]) {
                  const paddingRightLeftValue = paddingValues[paddingRightIndex]

                  // remove right + left values
                  paddingValues.splice(paddingRightIndex, 1)
                  paddingValues.splice(paddingLeftIndex - 1, 1)
                  // add rightleft value
                  paddingValues.splice(1, 0, paddingRightLeftValue)

                  // remove right + left properties
                  paddingProps.splice(paddingRightIndex, 1)
                  paddingProps.splice(paddingLeftIndex - 1, 1)
                  // add rightleft property - for alignment sake
                  paddingProps.splice(1, 0, 'paddingLeftRight')
                }

                const declarations = rules[i].declarations

                // remove any spaces from empty values
                paddingValues = paddingValues.filter(Boolean)

                // add declaration
                let paddingRuleIndex = rules[i].declarations.length
                for (let j = 0; j < paddingRuleIndex; ++j) {
                  switch (declarations[j].property) {
                    case 'padding-top':
                    case 'padding-right':
                    case 'padding-bottom':
                    case 'padding-left':
                    case 'padding':
                      if (j < paddingRuleIndex) { paddingRuleIndex = j }
                      break
                  }
                }

                declarations.splice(paddingRuleIndex, 0, {
                  type: 'declaration',
                  property: 'padding',
                  value: paddingValues.join(' ')
                })

                DECLARATION_COUNT += 1
                summary.stats.summary.noPaddingsShortened += 1

                let paddingIndex

                // remove originals
                paddingIndex = declarations.map(toProperty).indexOf('padding-top')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                paddingIndex = declarations.map(toProperty).indexOf('padding-right')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                paddingIndex = declarations.map(toProperty).indexOf('padding-bottom')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                paddingIndex = declarations.map(toProperty).indexOf('padding-left')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing paddings
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((value) => value === 'padding').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('padding')
                    const now = properties.indexOf('padding', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of padding

          if (SHORTEN || SHORTEN_ZERO || SHORTEN_HEXCOLOR) {
            // declarations
            for (let l = 0; l < DECLARATION_COUNT; ++l) {
              // zero check
              if (SHORTEN || SHORTEN_ZERO &&
                OPTIONS.zero_ignore_declaration.indexOf(rules[i].declarations[l].property) == -1) {
                let value = rules[i].declarations[l].value

                if (value !== undefined) {
                  // leading zeros 000
                  if (value.match(/[^#]\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm)) {
                    value = value.replace(/\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm, '') // remove single duplicate 0

                    summary.stats.summary.noZerosShortened += 1

                    if (OPTIONS.verbose) { console.log(success('Process - Values - Zero : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }
                  }

                  // 0px, 0em, etc.
                  if (value.charAt(0) === '0' &&
                    (OPTIONS.zero_units.includes(value.substr(1, value.length)))) {
                    value = 0

                    if (OPTIONS.verbose) { console.log(success('Process - Values - Zero : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }
                    summary.stats.summary.noZerosShortened += 1
                  }

                  rules[i].declarations[l].value = value
                }
              }

              // hex color
              /*
              applied to color,
                         font, font-color,
                         background, background-color,
                         border, border-color,
                         outline-color,
                         box-shadow, text-shadow
              */
              if (SHORTEN || SHORTEN_HEXCOLOR &&
                (
                  rules[i].declarations[l].property == 'color' ||
                  rules[i].declarations[l].property == 'font' ||
                  rules[i].declarations[l].property == 'font-color' ||
                  rules[i].declarations[l].property == 'background' ||
                  rules[i].declarations[l].property == 'background-color' ||
                  rules[i].declarations[l].property == 'outline-color' ||
                  rules[i].declarations[l].property == 'box-shadow' ||
                  rules[i].declarations[l].property == 'text-shadow' ||
                  rules[i].declarations[l].property == 'border-color' ||
                  rules[i].declarations[l].property == 'border-top-color' ||
                  rules[i].declarations[l].property == 'border-right-color' ||
                  rules[i].declarations[l].property == 'border-bottom-color' ||
                  rules[i].declarations[l].property == 'border-left-color' ||
                  rules[i].declarations[l].property == 'border' ||
                  rules[i].declarations[l].property == 'border-top' ||
                  rules[i].declarations[l].property == 'border-right' ||
                  rules[i].declarations[l].property == 'border-bottom' ||
                  rules[i].declarations[l].property == 'border-left'
                )) {
                let value = '' + rules[i].declarations[l].value
                if (value !== 'undefined' && !value.includes('Microsoft')) {
                  value = processColor(value, rules[i].selectors, OPTIONS, summary)
                  rules[i].declarations[l].value = value
                }
              } // end of options check
            } // end of loop declarations
          } // end of OPTIONS.shorten_zero || SHORTEN_HEXCOLOR check
        } // end of undefined check
      } // end of loop rules
    } // end of processValues

    function processRules (rules) {
      if (rules !== undefined) {
        let RULES_COUNT = rules.length

        // reduce common declarations amongst children into parent
        if (OPTIONS.new_reduce_common_into_parent) {
          let directParents = []
          let hierachy = []
          let hierachyKeys = []
          let commonParentsKeys = []
          let commonParents = []
          let commonParentsLen = 0
          let commonParentDeclarations = []
          let newParentDeclarations = []
          let classLineage = ''
          let parentClassLineage = ''
          let lineageLabel = ''
          let tmpDeclarations = []

          for (let i = 0; i < RULES_COUNT; ++i) {
            /// rules
            // group classes - create hierarchy
            if (rules[i].selectors !== undefined) {
              for (let j = 0; j < rules[i].selectors.length; j++) { // each comma delimited
                if (rules[i].selectors[j].includes('.')) {
                  classLineage = rules[i].selectors[j].split(' ')
                  parentClassLineage = classLineage.slice(0) // clone
                  parentClassLineage.pop()
                  parentClassLineage = parentClassLineage.join(' ')

                  if (parentClassLineage !== undefined && parentClassLineage !== '') {
                    if (directParents[parentClassLineage] !== undefined) {
                      directParents[parentClassLineage].push({
                        selector: rules[i].selectors[j],
                        index: i
                      })
                    } else {
                      directParents[parentClassLineage] = [{
                        selector: rules[i].selectors[j],
                        index: i
                      }]
                    }
                  }

                  for (let k = 0; k < classLineage.length; k++) { // depth of hierachy
                    if (k > 0) {
                      lineageLabel = ''

                      for (let l = k; l > 0; l--) {
                        lineageLabel += classLineage[k - l] + ' '
                      }
                      lineageLabel += classLineage[k]

                      if (hierachy[lineageLabel] === undefined) {
                        hierachy[lineageLabel] = 0
                      }

                      hierachy[lineageLabel] += 1
                    } else {
                      if (hierachy[classLineage[k]] === undefined) {
                        hierachy[classLineage[k]] = 0
                      }

                      hierachy[classLineage[k]] += 1
                    }
                  } // end of for
                } // end of if
              } // end of for
            }
          }

          function sortHierachy (obj) {
            const keys = Object.keys(obj)
            keys.sort(function (a, b) { return b.length - a.length })
            hierachy = []
            for (let i = 0; i < keys.length; i++) {
              hierachy[keys[i]] = obj[keys[i]]

              Object.keys(directParents).forEach(function (key, index, val) {
                if (this[key].length > 1) {
                  for (let j = 0; j < this[key].length; j++) {
                    if (keys[i] == this[key][j].selector) {
                      if (OPTIONS.verbose) { console.log(success('Process - Rules - Group Common Parent Rule : ' + keys[i])) }
                      commonParentsKeys.push({
                        selector: key,
                        index: this[key][j].index,
                        childSelector: keys[i]
                      })
                    }
                  }
                }
              }, directParents)
            }
            return hierachy
          }
          sortHierachy(hierachy)
          hierachyKeys = Object.keys(hierachy)
          hierachyLen = hierachyKeys.length
          selectedHierachyLevel = 0
          commonParentsLen = commonParentsKeys.length

          // get declarations
          for (let i = 0; i < commonParentsKeys.length; i++) {
            if (rules[commonParentsKeys[i].index].declarations !== undefined) {
              for (let j = 0; j < rules[commonParentsKeys[i].index].declarations.length; j++) {
                if (commonParentDeclarations[rules[commonParentsKeys[i].index].declarations[j].property + '_' + rules[commonParentsKeys[i].index].declarations[j].value] !== undefined) {
                  commonParentDeclarations[rules[commonParentsKeys[i].index].declarations[j].property + '_' + rules[commonParentsKeys[i].index].declarations[j].value].count += 1
                } else {
                  commonParentDeclarations[rules[commonParentsKeys[i].index].declarations[j].property + '_' + rules[commonParentsKeys[i].index].declarations[j].value] = {
                    property: rules[commonParentsKeys[i].index].declarations[j].property,
                    value: rules[commonParentsKeys[i].index].declarations[j].value,
                    count: 1,
                    selector: rules[commonParentsKeys[i].index].selectors,
                    selectorIndex: commonParentsKeys[i].index,
                    commonParent: commonParentsKeys[i].selector
                  }
                }
              }
            }
          }

          Object.keys(commonParentDeclarations).forEach(function (val, index, key) {
            if (this[val].count == directParents[this[val].commonParent].length) {
              if (newParentDeclarations[this[val].commonParent] !== undefined) {
                newParentDeclarations[this[val].commonParent].declarations.push({
                  type: 'declaration',
                  property: this[val].property,
                  value: this[val].value
                })
              } else {
                newParentDeclarations[this[val].commonParent] = {
                  declarations: [{
                    type: 'declaration',
                    property: this[val].property,
                    value: this[val].value
                  }],
                  selectorIndex: this[val].selectorIndex
                }
              }

              commonParents.push(this[val].commonParent)
            }
          }, commonParentDeclarations)

          commonParentsLen = commonParentsKeys.length

          for (let i = 0; i < commonParentsLen; i++) {
            Object.keys(newParentDeclarations).forEach(function (key, index) {
              if (commonParentsKeys[i] !== undefined && commonParentsKeys[i].selector == key) {
                if (rules[commonParentsKeys[i].index] !== undefined && rules[commonParentsKeys[i].index].declarations !== undefined) {
                  // clone declarations
                  tmpDeclarations = rules[commonParentsKeys[i].index].declarations.slice(0) // clone
                  DECLARATION_COUNT = tmpDeclarations.length

                  for (let j = 0; j < this[key].declarations.length; j++) { // each parent declaration
                    // remove declarations
                    for (let k = 0; k < DECLARATION_COUNT; k++) { // each child declaration
                      if (this[key].declarations[j] !== undefined &&
                        this[key].declarations[j].type == 'declaration' &&
                        this[key].declarations[j].property == tmpDeclarations[k].property &&
                        this[key].declarations[j].value == tmpDeclarations[k].value) {
                        tmpDeclarations.splice(k, 1)
                        k -= 1
                        DECLARATION_COUNT -= 1
                      }
                    } // end of k loop
                  } // end of j loop

                  if (tmpDeclarations.length == 0) {
                    // remove whole rule
                    rules.splice(commonParentsKeys[i].index, 1)
                    i -= 1
                    commonParentsLen -= 1
                  } else {
                    // update declarations
                    rules[commonParentsKeys[i].index].declarations = tmpDeclarations
                  }
                }
              }
            }, newParentDeclarations)
          } // end of i loop

          // Create Common Parents
          Object.keys(newParentDeclarations).forEach(function (key, index) {
            rules.splice(((this[key].selectorIndex - 1 < 0) ? this[key].selectorIndex : this[key].selectorIndex - 1), 0, {
              type: 'rule',
              selectors: [key],
              declarations: this[key].declarations
            })
          }, newParentDeclarations)

          // some cleanup
          directParents = []
          hierachy = []
          hierachyKeys = []
          commonParentsKeys = []
          commonParents = []
          commonParentDeclarations = []
          newParentDeclarations = []
          processedCommonParentsChildren = []
          tmpDeclarations = []

          // reset rules count
          RULES_COUNT = rules.length
        } // end of reduce common declarations amongst children into parent

        for (let i = 0; i < RULES_COUNT; ++i) {
          /// /comments
          // checking declarations for comments
          if (rules[i] !== undefined && rules[i].declarations !== undefined) {
            declarations = rules[i].declarations
            DECLARATION_COUNT = declarations.length

            for (let j = 0; j < DECLARATION_COUNT; ++j) {
              // check for empty properties
              if (rules[i].declarations[j].value == '') {
                summary.empty_declarations.push({
                  selectors: rules[i].selectors,
                  property: rules[i].declarations[j]
                })
              }

              // remove comments in declarations - for turning off comments
              if (OPTIONS.trim_comments || OPTIONS.trim) {
                if (declarations[j] !== undefined && declarations[j].type == 'comment') {
                  if (OPTIONS.verbose) { console.log(info('Process - Rules - Remove Comment')) }
                  rules[i].declarations.splice(j, 1)
                  j -= 1
                  DECLARATION_COUNT -= 1
                }
              }
            }
          }

          // remove comments in root - for turning off comments
          if (OPTIONS.trim_comments || OPTIONS.trim) {
            if (rules[i] !== undefined && rules[i].type == 'comment') {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - Remove Comment')) }
              rules.splice(i, 1)
              i -= 1
              RULES_COUNT -= 1
            }
          }
          /// /end of comments
          /// /rules
          // remove duplicate root rules
          for (let j = i + 1; j < RULES_COUNT; ++j) {
            // console.log(j, RULES_COUNT)
            // root rules
            // rule selector
            if (rules[i] !== undefined &&
              // && rules[i].type == 'rule'
              rules[i].selectors !== undefined &&
              rules[j] !== undefined && rules[j].selectors !== undefined) {
              // duplicate rule found
              if (rules[i].selectors.toString() == rules[j].selectors.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(success('Process - Rules - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

                // copy + reduce
                summary.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  summary.duplicate_rules.push({
                    selectors: (rules[i].type == 'page') ? '@page' : rules[i].selectors,
                    position: rules[i].position
                  })
                  rules[j].declarations = rules[j].declarations.concat(rules[i].declarations)
                  rules.splice(i, 1)
                } else {
                  summary.duplicate_rules.push({
                    selectors: (rules[j].type == 'page') ? '@page' : rules[j].selectors,
                    position: rules[j].position
                  })
                  rules[i].declarations = rules[i].declarations.concat(rules[j].declarations)
                  rules.splice(j, 1)
                }
                i -= 1
                j -= 1
                RULES_COUNT -= 1
              }
            } // end of rule selector

            // media selector - it could affect evaluation sequence
            if (rules[i] !== undefined && rules[i].type == 'media' &&
              rules[i].media !== undefined &&
              rules[j] !== undefined && rules[j].media !== undefined &&
              OPTIONS.bypass_media_rules != true) {
              // duplicate rule found
              if (rules[i].media.toString() == rules[j].media.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(info('Process - Rules - @media - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

                // copy + reduce
                summary.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  summary.duplicate_rules.push({
                    selectors: '@media ' + rules[i].media,
                    position: rules[i].position
                  })
                  rules[j].rules = rules[j].rules.concat(rules[i].rules)
                  rules.splice(i, 1)
                } else {
                  summary.duplicate_rules.push({
                    selectors: '@media ' + rules[j].media,
                    position: rules[j].position
                  })
                  rules[i].rules = rules[i].rules.concat(rules[j].rules)
                  rules.splice(j, 1)
                }
                i -= 1
                j -= 1
                RULES_COUNT -= 1
              }
            }
            // end of media selector
            // document selector
            if (rules[i] !== undefined && rules[i].type == 'document' &&
              rules[i].document !== undefined &&
              rules[j] !== undefined && rules[j].document !== undefined) {
              // duplicate rule found
              if (rules[i].document.toString() == rules[j].document.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(success('Process - Rules - @document - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

                // copy + reduce
                summary.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  summary.duplicate_rules.push({
                    selectors: '@document ' + rules[i].document,
                    position: rules[i].position
                  })
                  rules[j].rules = rules[j].rules.concat(rules[i].rules)
                  rules.splice(i, 1)
                } else {
                  summary.duplicate_rules.push({
                    selectors: '@document ' + rules[j].document,
                    position: rules[j].position
                  })
                  rules[i].rules = rules[i].rules.concat(rules[j].rules)
                  rules.splice(j, 1)
                }
                i -= 1
                j -= 1
                RULES_COUNT -= 1
              }
            } // end of document selector

            // supports selector
            if (rules[i] !== undefined && rules[i].type == 'supports' &&
              rules[i].supports !== undefined &&
              rules[j] !== undefined && rules[j].supports !== undefined) {
              // duplicate rule found
              if (rules[i].supports.toString() == rules[j].supports.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(success('Process - Rules - @supports - Group Duplicate Rule : ' + (rules[j].supports ? rules[j].supports : ''))) }

                // copy + reduce
                summary.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  summary.duplicate_rules.push({
                    selectors: '@supports ' + rules[i].supports,
                    position: rules[i].position
                  })
                  rules[j].rules = rules[j].rules.concat(rules[i].rules)
                  rules.splice(i, 1)
                } else {
                  summary.duplicate_rules.push({
                    selectors: '@supports ' + rules[j].supports,
                    position: rules[j].position
                  })
                  rules[i].rules = rules[i].rules.concat(rules[j].rules)
                  rules.splice(j, 1)
                }
                i -= 1
                j -= 1
                RULES_COUNT -= 1
              }
            } // end of supports selector
          } // end of j

          /// /end of rules
          /// /declarations
          // reduce root delcarations by property name and by duplicate values
          if (rules[i] !== undefined &&
            (rules[i].type == 'rule' || (rules[i].type == 'page' && OPTIONS.bypass_page_rules == false))) {
            declarationsNameCounts = []

            DECLARATION_COUNT = rules[i].declarations.length

            // declarations duplicate check
            for (let l = 0; l < DECLARATION_COUNT; ++l) {
              if (rules[i].declarations[l].type == 'declaration') {
                if (declarationsNameCounts[rules[i].declarations[l].property] !== undefined) {
                  declarationsNameCounts[rules[i].declarations[l].property] += 1
                } else {
                  declarationsNameCounts[rules[i].declarations[l].property] = 1
                }
              }
            } // end of declarations duplicate check

            // reduce according to values
            declarationsValueCounts = []

            for (const key in declarationsNameCounts) {
              if (!declarationNames.includes(key)) { // only properties not in list
                for (let l = 0; l < DECLARATION_COUNT; ++l) {
                  if (
                    rules[i].declarations[l].type == 'declaration' &&
                    rules[i].declarations[l].property == key) {
                    hash = crypto.createHash('sha256')
                    hash.update(rules[i].declarations[l].property + rules[i].declarations[l].value)

                    const key = hash.digest('hex')

                    if (declarationsValueCounts[key] !== undefined) {
                      declarationsValueCounts[key].id += ',' + l
                      declarationsValueCounts[key].count += 1
                    } else {
                      declarationsValueCounts[key] = {
                        id: l,
                        count: 1
                      }
                    }
                  }
                }
              }
            }

            // remove duplicate declarations by duplicate values

            amountRemoved = 1

            for (const key in declarationsValueCounts) {
              if (declarationsValueCounts.hasOwnProperty(key)) {
                if (declarationsValueCounts[key].count > 1) {
                  duplicateIds = declarationsValueCounts[key].id.split(',')

                  amountRemoved = 1 // shift the ids by the amount removed

                  for (let l = 0; l < duplicateIds.length - 1; ++l) { // -1 to leave last behind
                    // remove previous comment above declaration to be removed
                    if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                      if (rules[i].declarations[duplicateIds[l] - 1] !== undefined && rules[i].declarations[duplicateIds[l] - 1].type == 'comment') {
                        rules[i].declarations.splice(duplicateIds[l] - 1, 1)
                        DECLARATION_COUNT -= 1

                        // adjust removal ids by amount already removed
                        if (duplicateIds[l] !== undefined) {
                          duplicateIds[l] -= amountRemoved // shift the ids by the amount removed
                        }
                        amountRemoved += 1
                      }
                    }

                    if (OPTIONS.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }

                    summary.duplicate_declarations.push(rules[i].declarations[duplicateIds[l]])
                    summary.stats.summary.noDuplicateDeclarations += 1
                    rules[i].declarations.splice(duplicateIds[l], 1)
                    DECLARATION_COUNT -= 1

                    // adjust removal ids by amount already removed
                    if (duplicateIds[l + 1] !== undefined) {
                      duplicateIds[l + 1] -= amountRemoved // shift the ids by the amount removed

                      // shift all the ids of the declarations afterwards
                      for (const key2 in declarationsValueCounts) {
                        if (declarationsValueCounts.hasOwnProperty(key2) && (key2 != key)) {
                          if (typeof declarationsValueCounts[key2].id === 'number') {
                            duplicateIds = []
                            duplicateIds[0] = declarationsValueCounts[key2].id
                          } else {
                            duplicateIds = declarationsValueCounts[key2].id.split(',')
                          }

                          for (let l = 0; l < duplicateIds.length; ++l) {
                            if (duplicateIds[l] !== undefined) {
                              duplicateIds[l] -= amountRemoved
                            }
                          }
                          declarationsValueCounts[key2].id = duplicateIds.join()
                        }
                      }
                      // end of shifting all ids
                    }
                    amountRemoved += 1
                  }
                } // end of if
              } // end of if
            } // end of for in

            // end of reduce according to values
            for (let k = 0; k < declarationNamesCount; ++k) {
              // declarations reduction
              for (const key in declarationsNameCounts) {
                if (declarationsNameCounts.hasOwnProperty(key)) {
                  if (declarationsNameCounts[key] > 1) {
                    for (let l = 0; l < DECLARATION_COUNT; ++l) {
                      if (rules[i].declarations[l].type == 'declaration') {
                        if (rules[i].declarations[l].property == key &&
                          declarationsNameCounts[key] > 1 // leave behind 1
                        ) {
                          // reduce according to list
                          if (rules[i].declarations[l].property == declarationNames[k]) {
                            // console.log(declarationsNameCounts[key])
                            // console.log(key)
                            // console.log(rules[i].declarations[l].property)
                            // console.log(declarationNames[k])
                            // remove previous comment above declaration to be removed
                            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                              if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type == 'comment') {
                                rules[i].declarations.splice(l - 1, 1)
                                l -= 1
                                DECLARATION_COUNT -= 1
                              }
                            }

                            if (OPTIONS.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }

                            // console.log(rules[i].declarations[l].value.indexOf('!important') !== -1)
                            // console.log(rules[i].declarations[l].value)
                            // console.log(rules[i].declarations[l+1].value)
                            // prioritises !important declarations
                            if (rules[i].declarations[l].value.indexOf('!important') !== -1) {
                              summary.duplicate_declarations.push(rules[i].declarations[l + 1])
                              summary.stats.summary.noDuplicateDeclarations += 1
                              rules[i].declarations.splice(l + 1, 1)
                            } else {
                              summary.duplicate_declarations.push(rules[i].declarations[l])
                              summary.stats.summary.noDuplicateDeclarations += 1
                              rules[i].declarations.splice(l, 1)
                            }

                            l -= 1
                            DECLARATION_COUNT -= 1
                            declarationsNameCounts[key] -= 1
                          }
                        }
                      }
                    }
                  }
                }
              }
            } // end of reduce root declarations by property name
          } // end of rule check

          // reduce root declarations by selector
          selectorPropertiesList = []
          declarationsCounts = []

          for (let k = 0; k < selectorsCount; ++k) {
            if (rules[i] !== undefined &&
              rules[i].type == 'rule') {
              if (rules[i].selectors !== undefined && rules[i].selectors.toString() === selectors[k]) {
                DECLARATION_COUNT = rules[i].declarations.length

                // detect declarations duplicates
                for (let l = 0; l < DECLARATION_COUNT; ++l) {
                  if (rules[i].declarations[l].type == 'declaration') {
                    if (declarationsCounts[rules[i].declarations[l].property] !== undefined) {
                      declarationsCounts[rules[i].declarations[l].property] += 1
                    } else {
                      declarationsCounts[rules[i].declarations[l].property] = 1
                    }
                  }
                } // end of declarations duplicate check

                // declarations reduction
                for (const key in declarationsCounts) {
                  if (declarationsCounts.hasOwnProperty(key)) {
                    if (declarationsCounts[key] > 1) {
                      for (let l = 0; l < DECLARATION_COUNT; ++l) {
                        if (rules[i].declarations[l].type == 'declaration') {
                          selectorPropertiesList = selectorPropertyValues[selectors[k]]

                          if (selectorPropertiesList !== undefined) { // specific in selector
                            if (rules[i].declarations[l].property == key &&
                              (selectorPropertiesList.includes(rules[i].declarations[l].property)) &&
                              declarationsCounts[key] > 1) { // leave behind 1
                              // remove previous comment above declaration to be removed
                              if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                                if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type == 'comment') {
                                  rules[i].declarations.splice(l - 1, 1)
                                  l -= 1
                                  DECLARATION_COUNT -= 1
                                }
                              }

                              if (OPTIONS.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }
                              summary.duplicate_declarations.push(rules[i].declarations[l])
                              summary.stats.summary.noDuplicateDeclarations += 1
                              rules[i].declarations.splice(l, 1)
                              l -= 1
                              DECLARATION_COUNT -= 1
                              declarationsCounts[key] -= 1
                            }
                          } else { // all in selector
                            if (rules[i].declarations[l].property == key &&
                              declarationsCounts[key] > 1) { // leave behind 1
                              // remove previous comment above declaration to be removed
                              if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                                if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type == 'comment') {
                                  rules[i].declarations.splice(l - 1, 1)
                                  l -= 1
                                  DECLARATION_COUNT -= 1
                                }
                              }

                              if (OPTIONS.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }
                              summary.duplicate_declarations.push(rules[i].declarations[l])
                              summary.stats.summary.noDuplicateDeclarations += 1
                              rules[i].declarations.splice(l, 1)
                              l -= 1
                              DECLARATION_COUNT -= 1
                              declarationsCounts[key] -= 1
                            }
                          }
                        }
                      }
                    }
                  }
                } // end of declarations reduction
              } // end of if
            } // end of if
          } // end of reduce root declarations by selector

          /// /end of declarations
          /// /empty nodes
          // remove empty @sign keyframes
          if (rules[i] != undefined && rules[i].keyframes !== undefined && rules[i].keyframes.length == 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                if (OPTIONS.verbose) { console.log(info('Process - @keyframes - Remove comment : ' + (rules[i].keyframes ? rules[i].keyframes.join(', ') : ''))) }
                rules.splice(i - 1, 1)
                i -= 1
                RULES_COUNT -= 1
              }
            }

            if (OPTIONS.verbose) { console.log(info('Process - @keyframes - Remove Empty Rule : ' + (rules[i].keyframes ? rules[i].keyframes.join(', ') : ''))) }

            rules.splice(i, 1)
            i -= 1
            RULES_COUNT -= 1
          }

          // remove empty @sign media
          if (rules[i] !== undefined && rules[i].type == 'media' &&
            rules[i].rules.length == 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                if (OPTIONS.verbose) { console.log(info('Process - @media - Remove comment : ' + (rules[i].media ? rules[i].media : ''))) }
                rules.splice(i - 1, 1)
                i -= 1
                RULES_COUNT -= 1
              }
            }
            if (OPTIONS.verbose) { console.log(info('Process - @media - Remove Empty Rule : ' + (rules[i].media ? rules[i].media : ''))) }
            rules.splice(i, 1)
            i -= 1
            RULES_COUNT -= 1
          }

          // remove empty @sign document
          if (rules[i] !== undefined && rules[i].type == 'document' &&
            rules[i].rules.length == 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                if (OPTIONS.verbose) { console.log(info('Process - @document - Remove comment : ' + (rules[i].document ? rules[i].document : ''))) }
                rules.splice(i - 1, 1)
                i -= 1
                RULES_COUNT -= 1
              }
            }

            if (OPTIONS.verbose) { console.log(info('Process - @document - Remove Empty Rule : ' + (rules[i].document ? rules[i].document : ''))) }
            rules.splice(i, 1)
            i -= 1
            RULES_COUNT -= 1
          }

          // remove empty @sign supports
          if (rules[i] !== undefined && rules[i].type == 'supports' &&
            rules[i].rules.length == 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                if (OPTIONS.verbose) { console.log(info('Process - @supports - Remove comment : ' + (rules[i].supports ? rules[i].supports : ''))) }
                rules.splice(i - 1, 1)
                i -= 1
                RULES_COUNT -= 1
              }
            }

            if (OPTIONS.verbose) { console.log(info('Process - @supports - Remove Empty Rule : ' + (rules[i].supports ? rules[i].supports : ''))) }
            rules.splice(i, 1)
            i -= 1
            RULES_COUNT -= 1
          }
          /// /end of empty nodes
        } // end of i
      } // end of undefined
    } // end of processRules

    function processRulesReset () {
      declarationsNameCounts = null
      declarationsValueCounts = null
      amountRemoved = 1
      duplicateIds = null
      selectorPropertiesList = null
    }

    function processHTMLResults (rulesIn, selectors) {
      if (OPTIONS.verbose) { console.log(info('Process - HTML - Remove Unused Rules')) }

      // remove unused selectors
      let foundInnocent = false
      let tmpSelectors = ''
      let findSelector = null
      for (let i = 0, RULES_COUNT = rulesIn.length; i < RULES_COUNT; ++i) {
        if (rulesIn[i] !== undefined) {
          switch (rulesIn[i].type) {
            case 'rule':
              for (let j = 0, rulesCount2 = selectors.length; j < rulesCount2; ++j) {
                tmpSelectors = rulesIn[i].selectors

                if (selectors[j].includes('[') ||
                  selectors[j].includes('*')) {
                  findSelector = new RegExp(escape('^(.' + selectors[j] + '|' + selectors[j] + ')$', 'gm'))
                } else {
                  findSelector = new RegExp('^(.' + selectors[j] + '|' + selectors[j] + ')$', 'gm')
                }

                if (tmpSelectors.join(',').match(findSelector)) {
                  if (tmpSelectors.length > 1) {
                    foundInnocent = false

                    // check for any "innocent" amongst the guilty group
                    for (let k = 0, rulesCount3 = tmpSelectors.length; k < rulesCount3; ++k) {
                      if (selectors.indexOf(tmpSelectors[k]) == -1) {
                        foundInnocent = true
                        break
                      }
                    }

                    if (!foundInnocent) { // remove only guilty
                      // remove rule
                      rulesIn.splice(i, 1)
                      i -= 1
                      RULES_COUNT -= 1
                    }
                  } else {
                    // remove rule
                    rulesIn.splice(i, 1)
                    i -= 1
                    RULES_COUNT -= 1
                  }

                  break
                }
              }

              break
            case 'document':
            case 'supports':
            case 'media':

              for (let j = 0, rulesCount2 = rulesIn[i].rules.length; j < rulesCount2; ++j) {
                if (rulesIn[i].rules[j] !== undefined) {
                  for (let k = 0, rulesCount3 = selectors.length; k < rulesCount3; ++k) {
                    tmpSelectors = rulesIn[i].rules[j].selectors

                    if (selectors[k].includes('[') ||
                      selectors[k].includes('*')) {
                      findSelector = new RegExp(escape('^(.' + selectors[k] + '|' + selectors[k] + ')$', 'gm'))
                    } else {
                      findSelector = new RegExp('^(.' + selectors[k] + '|' + selectors[k] + ')$', 'gm')
                    }

                    if (tmpSelectors.join(',').match(findSelector)) {
                      if (tmpSelectors.length > 1) {
                        foundInnocent = false

                        // check for any "innocent" amongst the guilty group
                        for (let l = 0, rulesCount4 = tmpSelectors.length; l < rulesCount4; ++l) {
                          if (selectors.indexOf(tmpSelectors[l]) == -1) {
                            foundInnocent = true
                            break
                          }
                        }

                        if (!foundInnocent) { // remove only guilty
                          // remove rule
                          rulesIn[i].rules.splice(j, 1)
                          j -= 1
                          rulesCount3 -= 1
                        }
                      } else {
                        // remove rule
                        rulesIn[i].rules.splice(j, 1)
                        j -= 1
                        rulesCount3 -= 1
                        break
                      }
                    }
                  }
                }
              }
              break
            case 'charset':
              break
            case 'page':
              break
          }
        }
      }

      if (OPTIONS.verbose) { console.log(info('Process - Rules - Base')) }

      processRules(rulesIn)

      // after
      stats.after.totalFileSizeKB = 0
      stats.after.noNodes = 0
      stats.after.noRules = 0
      stats.after.noDeclarations = 0
      stats.after.noComments = 0
      stats.after.noCharset = 0
      stats.after.noCustomMedia = 0
      stats.after.noDocument = 0
      stats.after.noFontFace = 0
      stats.after.noHost = 0
      stats.after.noImport = 0
      stats.after.noKeyframes = 0
      stats.after.noKeyframe = 0
      stats.after.noMedia = 0
      stats.after.noNamespace = 0
      stats.after.noPage = 0
      stats.after.noSupports = 0

      stats.after.noNodes = rulesIn.length
      for (let i = 0; i < stats.after.noNodes; ++i) {
        if (rulesIn[i] !== undefined) {
          if (rulesIn[i].declarations !== undefined) {
            DECLARATION_COUNT = rulesIn[i].declarations.length

            for (let j = 0; j < DECLARATION_COUNT; ++j) {
              if (rulesIn[i].declarations[j].type == 'comment') {
                summary.stats.after.noComments += 1
              }
            }
          }

          if (rulesIn[i].type == 'comment') {
            summary.stats.after.noComments += 1
          }

          if (rulesIn[i].type == 'rule') {
            summary.stats.after.noRules += 1

            summary.stats.after.noDeclarations += rulesIn[i].declarations.length
          }

          switch (rulesIn[i].type) {
            case 'charset': summary.stats.after.noCharset += 1
              break
            case 'custom-media': summary.stats.after.noCustomMedia += 1
              break
            case 'document': summary.stats.after.noDocument += 1
              break
            case 'font-face': summary.stats.after.noFontFace += 1
              break
            case 'host': summary.stats.after.noHost += 1
              break
            case 'import': summary.stats.after.noImport += 1
              break
            case 'keyframes': summary.stats.after.noKeyframes += 1
              break
            case 'keyframe': summary.stats.after.noKeyframe += 1
              break
            case 'media': summary.stats.after.noMedia += 1
              break
            case 'namespace': summary.stats.after.noNamespace += 1
              break
            case 'page': summary.stats.after.noPage += 1
              break
            case 'supports': summary.stats.after.noSupports += 1
              break
          }
        }
      } // end of after count

      // calc reductions
      summary.stats.summary.noReductions.noNodes = summary.stats.before.noNodes - summary.stats.after.noNodes
      summary.stats.summary.noReductions.noRules = summary.stats.before.noRules - summary.stats.after.noRules
      summary.stats.summary.noReductions.noDeclarations = summary.stats.before.noDeclarations - summary.stats.after.noDeclarations
      summary.stats.summary.noReductions.noComments = summary.stats.before.noComments - summary.stats.after.noComments
      summary.stats.summary.noReductions.noCharset = summary.stats.before.noCharset - summary.stats.after.noCharset
      summary.stats.summary.noReductions.noCustomMedia = summary.stats.before.noCustomMedia - summary.stats.after.noCustomMedia
      summary.stats.summary.noReductions.noDocument = summary.stats.before.noDocument - summary.stats.after.noDocument
      summary.stats.summary.noReductions.noFontFace = summary.stats.before.noFontFace - summary.stats.after.noFontFace
      summary.stats.summary.noReductions.noHost = summary.stats.before.noHost - summary.stats.after.noHost
      summary.stats.summary.noReductions.noImport = summary.stats.before.noImport - summary.stats.after.noImport
      summary.stats.summary.noReductions.noKeyframes = summary.stats.before.noKeyframes - summary.stats.after.noKeyframes
      summary.stats.summary.noReductions.noKeyframe = summary.stats.before.noKeyframe - summary.stats.after.noKeyframe
      summary.stats.summary.noReductions.noMedia = summary.stats.before.noMedia - summary.stats.after.noMedia
      summary.stats.summary.noReductions.noNamespace = summary.stats.before.noNamespace - summary.stats.after.noNamespace
      summary.stats.summary.noReductions.noPage = summary.stats.before.noPage - summary.stats.after.noPage
      summary.stats.summary.noReductions.noSupports = summary.stats.before.noSupports - summary.stats.after.noSupports

      outputAST = {
        type: 'stylesheet',
        stylesheet: {
          rules: rulesIn
        }
      }

      outputCSS = cssTools.stringify(outputAST)

      return outputCSS
    } // end of processHTMLResults

    function completeOutput (outputCSS = '') {
      if (OPTIONS.css_output !== '') {
        // console.log(outputCSS)
        // write output
        try {
          if (OPTIONS.format_4095_rules_legacy_limit) {
            // console.log(summary.stats.after.noRules)
            const noOutputFilesNeeded = Math.ceil(summary.stats.after.noRules / 4095)
            // console.log(noOutputFilesNeeded)
            if (noOutputFilesNeeded == 1) {
              outputCSS = trimCSS(outputCSS)
              outputCSS = restoreHacks(outputCSS)
              writeFileSync(OPTIONS.css_output, outputCSS)
              fileSizeKB = getFileSizeInKB(OPTIONS.css_output)
            } else { // group 4095 rules
              let ast
              try {
                ast = cssTools.parse(outputCSS, { source: fileLocation })
              } catch (err) {
                console.log(error('CSS Parser2 Error: probably have something funny in your CSS, change it then please try again.'))
                console.log('Reason: ' + err.reason)
                console.log('Line: ' + err.line)
                console.log('Column: ' + err.column)
                console.log('Filename: ' + err.filename)
                process.exit(1)
              }

              const rulesGroups = []
              let rulesGroupsLen = 0
              const rules = ast.stylesheet.rules
              const ruleslen = rules.length
              let ruleCount = 0
              let groupCount = 0

              for (let i = 0; i < ruleslen; ++i) {
                if (rulesGroups[groupCount] === undefined) {
                  rulesGroups[groupCount] = []
                }
                rulesGroups[groupCount].push(rules[i])
                ruleCount += 1

                if (ruleCount == 4095) {
                  groupCount += 1
                }
              }
              rulesGroupsLen = rulesGroups.length
              fileSizeKB = 0
              outputFilename = ''
              for (let i = 0; i < rulesGroupsLen; i++) {
                outputAST = {
                  type: 'stylesheet',
                  stylesheet: {
                    rules: rulesGroups[i]
                  }
                }
                outputCSS = cssTools.stringify(outputAST)

                outputCSS = trimCSS(outputCSS)
                outputCSS = restoreHacks(outputCSS)
                outputFilename = OPTIONS.css_output.substr(0, OPTIONS.css_output.length - 4) + '_' + i + '.css'
                writeFileSync(outputFilename, outputCSS)

                fileSizeKB += getFileSizeInKB(outputFilename)
              }
            }
          } else {
            outputCSS = trimCSS(outputCSS)
            outputCSS = restoreHacks(outputCSS)
            if (OPTIONS.css_output === null || OPTIONS.css_output === undefined || OPTIONS.css_output === '') {
              const size = getSizeInKB(outputCSS)
              fileSizeKB = size / 1000
            } else {
              writeFileSync(OPTIONS.css_output, outputCSS)
              fileSizeKB = getFileSizeInKB(OPTIONS.css_output)
            }
          }
        } catch (e) {
          console.log(error('Output file error: Something went wrong while writing the file, check your folder permissions, config_css.json and please try again.'))
          console.log(e)
          process.exit(1)
        }
      } else {
        outputCSS = trimCSS(outputCSS)
        outputCSS = restoreHacks(outputCSS)
        fileSizeKB = getSizeInKB(outputCSS)
      }

      summary.stats.after.totalFileSizeKB += fileSizeKB
      summary.stats.summary.savingsKB = roundTo(summary.stats.before.totalFileSizeKB - summary.stats.after.totalFileSizeKB, 4)
      summary.stats.summary.savingsPercentage = roundTo(summary.stats.summary.savingsKB / summary.stats.before.totalFileSizeKB * 100, 2)

      // write report
      if (OPTIONS.generate_report) {
        try {
          writeFileSync(REPORT_DUPLICATE_CSS, JSON.stringify(summary, null, '\t'))
        } catch (e) {
          console.log(error('Report output file error: Something went wrong while writing the file, check your folder permissions, config_css.json and please try again.'))
          console.log(e)
          process.exit(1)
        }
      }

      if (OPTIONS.verbose) {
        console.log(cool('Before: ' + summary.stats.before.totalFileSizeKB + 'KB'))
        console.log(cool('After: ' + summary.stats.after.totalFileSizeKB + 'KB'))
        console.log(cool('Saved: ' + summary.stats.summary.savingsKB + 'KB (' + summary.stats.summary.savingsPercentage + '%)'))

        // date = new Date()

        console.timeEnd(logoRed('Purged ' + date + ' in'))
      }

      if (OPTIONS.css_output === null || OPTIONS.css_output === undefined || OPTIONS.css_output === '') {
        return outputCSS
      }
    }

    function processCSS (cssDataIn = null, optionsIn = null, callback = () => {}) {
      function continueCSSProcess () {
        cssPurgeEventEmitter.removeListener('CONFIG_READ_REDUCE_PROPS_END', continueCSSProcess)

        let cssData = dataCSSIn.join('')

        if (cssDataIn !== null && cssDataIn !== undefined) {
          cssData = cssDataIn

          fileSizeKB = getSizeInKB(cssDataIn)

          stats.before.totalFileSizeKB += fileSizeKB
        }

        if (optionsIn !== null && optionsIn !== undefined) {
          for (const key in optionsIn) {
            OPTIONS[key] = optionsIn[key]
          }
        }

        if (OPTIONS.verbose) {
          date = Date()

          if (OPTIONS.css_output !== undefined && OPTIONS.css_output !== '') {
            date = OPTIONS.css_output
          }

          console.time(logoRed('Purged ' + date + ' in'))
        }

        if (OPTIONS.verbose) { console.log(info('Process - CSS')) }

        // tokens - allow multi-keyframe selectors
        cssData = cssData.replace(/(@(-?)[a-zA-Z\-]*(keyframes)*\s[a-zA-Z\-]*(\s*,?\s*)){2,}/g, (match) => {
          _7tokenValues.push(match)
          return '@keyframes _7token_' + _7tokenValues.length + ''
        })

        // tokens - data:image
        cssData = cssData.replace(/url\(\"data:image\/([a-zA-Z]*);base64,([^\"]*)\"\)/g, (match) => {
          _6tokenValues.push(match)
          return '_6token_dataimage_' + _6tokenValues.length + ':'
        })

        // remove non-standard commented lines
        cssData = cssData.replace(/([^(:;,a-zA-Z0-9]|^)\/\/.*$/gm, (match) => {
          stats.summary.noInlineCommentsTrimmed += 1

          if (OPTIONS.trim_keep_non_standard_inline_comments && OPTIONS.trim_comments != true) {
            return '/*' + match.substring(3, match.length) + ' */'
          } else {
            return ''
          }
        })

        /// // hacks
        /// **/
        cssData = cssData.replace(/\/\*\*\//gm, '_1token_hck')

        /// *\**/
        cssData = cssData.replace(/\/\*\\\*\*\//gm, '_2token_hck')

        // (specialchar)property
        cssData = cssData.replace(/[\!\$\&\*\(\)\=\%\+\@\,\.\/\`\[\]\#\~\?\:\<\>\|\*\/]{1}([\-\_\.]?)([a-zA-Z0-9]+):((\s\S*?));/g, (match) => {
          _3tokenValues.push(match.substring(0, match.length - 1))
          return '_3token_hck_' + _3tokenValues.length + ':'
        })

        // (;
        cssData = cssData.replace(/(\(;)([\s\S]*?)(\})/g, (match) => {
          _4tokenValues.push(match)
          return '_4token_hck_' + _4tokenValues.length + ':}'
        })

        // [;
        cssData = cssData.replace(/(\[;)([\s\S]*?)(\})/g, (match) => {
          _5tokenValues.push(match)
          return '_5token_hck_' + _5tokenValues.length + ':}'
        })

        /// /end of hacks
        // tokens - replace side comments
        if (OPTIONS.trim_comments != true) {
          cssData = cssData.replace(/[;]([^\n][\s]*?)\/\*([\s\S]*?)\*\//gm, (match) => {
            tokensComments['_cssp_sc' + (Object.keys(tokensComments).length + 1)] = match
            return '; /*_cssp_sc' + Object.keys(tokensComments).length + '*/'
          })
        }

        let ast
        try {
          ast = cssTools.parse(cssData, { source: fileLocation })
        } catch (err) {
          console.log(error('CSS Parser Error: probably have something funny in your CSS, change it then please try again.'))
          console.log('Reason: ' + err.reason)
          console.log('Line: ' + err.line)
          console.log('Column: ' + err.column)
          console.log('Filename: ' + err.filename)
          process.exit(1)
        }

        const fRules = ast.stylesheet.rules
        let fRulesCount = fRules.length

        stats.before.noNodes = fRulesCount

        summary.stats = stats

        // before
        for (let i = 0; i < fRulesCount; ++i) {
          if (fRules[i] !== undefined) {
            if (fRules[i].declarations !== undefined) {
              DECLARATION_COUNT = fRules[i].declarations.length

              for (let j = 0; j < DECLARATION_COUNT; ++j) {
                if (fRules[i].declarations[j].type == 'comment') {
                  summary.stats.before.noComments += 1
                }
              }
            }

            if (fRules[i].type == 'comment') {
              summary.stats.before.noComments += 1
            }

            if (fRules[i].type == 'rule') {
              summary.stats.before.noRules += 1

              summary.stats.before.noDeclarations += fRules[i].declarations.length
            }

            switch (fRules[i].type) {
              case 'charset': summary.stats.before.noCharset += 1
                break
              case 'custom-media': summary.stats.before.noCustomMedia += 1
                break
              case 'document': summary.stats.before.noDocument += 1
                break
              case 'font-face': summary.stats.before.noFontFace += 1
                break
              case 'host': summary.stats.before.noHost += 1
                break
              case 'import': summary.stats.before.noImport += 1
                break
              case 'keyframes': summary.stats.before.noKeyframes += 1
                break
              case 'keyframe': summary.stats.before.noKeyframe += 1
                break
              case 'media': summary.stats.before.noMedia += 1
                break
              case 'namespace': summary.stats.before.noNamespace += 1
                break
              case 'page': summary.stats.before.noPage += 1
                break
              case 'supports': summary.stats.before.noSupports += 1
                break
            }
          }
        } // end of before count

        if (OPTIONS.verbose) { console.log(info('Process - Rules - Base')) }

        processRules(fRules)
        processRulesReset()

        for (let g = 0; g < fRulesCount; ++g) {
          if (fRules[g] !== undefined) {
            // console.log(g, fRulesCount)
            // @media rules
            if (fRules[g] !== undefined &&
              fRules[g].type == 'media'
              // && OPTIONS.bypass_media_rules == false
            ) {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - @media ' + (fRules[g].media ? fRules[g].media : ''))) }

              processRules(fRules[g].rules)
              processRulesReset()
              processValues(fRules[g].rules)
            }

            // @document rules
            if (fRules[g] !== undefined &&
              fRules[g].type == 'document' &&
              OPTIONS.bypass_document_rules == false) {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - @document ' + (fRules[g].document ? fRules[g].document : ''))) }

              processRules(fRules[g].rules)
              processRulesReset()
              processValues(fRules[g].rules)
            }

            // @supports rules
            if (fRules[g] !== undefined &&
              fRules[g].type == 'supports' &&
              OPTIONS.bypass_supports_rules == false) {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - @supports ' + (fRules[g].supports ? fRules[g].supports : ''))) }

              processRules(fRules[g].rules)
              processRulesReset()
              processValues(fRules[g].rules)
            }

            /// /charset
            if (fRules[g] !== undefined &&
              fRules[g].type == 'charset' &&
              OPTIONS.bypass_charset == false) {
              if (OPTIONS.verbose) { console.log(info('Process - Charset')) }

              charset = fRules[g].charset
              cCount = fRules.length

              for (let h = g + 1; h < cCount; ++h) {
                if (fRules[h] !== undefined) {
                  charset2 = fRules[h].charset

                  if (charset == charset2) {
                    // remove charset
                    if (fRules[h] !== undefined && fRules[h].type == 'charset') {
                      fRules.splice(h, 1)
                      g -= 1
                      h -= 1
                      cCount -= 1
                      fRulesCount -= 1

                      // remove side comment
                      if (fRules[h + 1] !== undefined &&
                        fRules[h + 1].type == 'comment' &&
                        fRules[h + 1].comment.includes('_cssp_sc')) {
                        // console.log('hi')
                        // console.log(fRules[h+1])
                        fRules.splice((h + 1), 1)
                        g -= 1
                        // h-=1;
                        // cCount-=1;
                        fRulesCount -= 1
                      }
                    }
                  }
                }
              } // end of h

              if (charset.substr(0, 1) != '"' ||
                charset.substr(charset.length - 1, charset.length) != '"') {
                // remove charset
                if (fRules[g] !== undefined && fRules[g].type == 'charset') {
                  fRules.splice(g, 1)
                  g -= 1
                  fRulesCount -= 1

                  // remove side comment
                  if (fRules[g + 1] !== undefined &&
                    fRules[g + 1].type == 'comment' &&
                    fRules[g + 1].comment.includes('_cssp_sc')) {
                    fRules.splice((g + 1), 1)
                    g -= 1
                    fRulesCount -= 1
                  }
                }
              }
            }
            /// /end of charset
          } // end of undefined
        } // end of for loop

        // rems - html check
        if (OPTIONS.special_convert_rem) {
          let hasHTML = false
          let htmlHasFontSize = false
          const tmpRulesCount = fRules.length
          for (let i = 0; i < tmpRulesCount; ++i) {
            if (fRules[i] !== undefined &&
              fRules[i].selectors !== undefined &&
              fRules[i].selectors.toString().includes('html')) {
              hasHTML = true
              for (let j = 0; j < fRules[i].declarations.length; ++j) {
                if (fRules[i].declarations !== undefined) {
                  if (fRules[i].declarations[j].property == 'font-size') {
                    htmlHasFontSize = true
                    break
                  }
                }
              }

              if (htmlHasFontSize == false) { // create font-size
                fRules[i].declarations.unshift({
                  type: 'declaration',
                  property: 'font-size',
                  value: ((parseInt(OPTIONS.special_convert_rem_desired_html_px) / parseInt(OPTIONS.special_convert_rem_browser_default_px)) * 100) + '%'
                })
              }

              // move to top
              const value = fRules[i]
              fRules.splice(i, 1)
              fRules.unshift(value)

              break
            }
          } // end of for

          if (hasHTML == false) { // create html with font-size
            fRules.unshift({
              type: 'rule',
              selectors: ['html'],
              declarations: [{
                type: 'declaration',
                property: 'font-size',
                value: ((parseInt(OPTIONS.special_convert_rem_desired_html_px) / parseInt(OPTIONS.special_convert_rem_browser_default_px)) * 100) + '%'
              }]
            })
          }
        } // end of rems - html check

        processValues(fRules)

        /// /charset first check
        if (fRules[0] !== undefined &&
          fRules[1] !== undefined &&
          fRules[0].type == 'comment' &&
          fRules[1].type == 'charset' &&
          OPTIONS.bypass_charset == false) {
          fRules.splice(0, 1)
        }
        /// /end of charset first check
        // after
        stats.after.noNodes = fRules.length
        for (let i = 0; i < fRulesCount; ++i) {
          if (fRules[i] !== undefined) {
            if (fRules[i].declarations !== undefined) {
              DECLARATION_COUNT = fRules[i].declarations.length

              for (let j = 0; j < DECLARATION_COUNT; ++j) {
                if (fRules[i].declarations[j].type == 'comment') {
                  summary.stats.after.noComments += 1
                }
              }
            }

            if (fRules[i].type == 'comment') {
              summary.stats.after.noComments += 1
            }

            if (fRules[i].type == 'rule') {
              summary.stats.after.noRules += 1

              summary.stats.after.noDeclarations += fRules[i].declarations.length
            }

            switch (fRules[i].type) {
              case 'charset':
                summary.stats.after.noCharset += 1
                break
              case 'custom-media':
                summary.stats.after.noCustomMedia += 1
                break
              case 'document':
                summary.stats.after.noDocument += 1
                break
              case 'font-face':
                summary.stats.after.noFontFace += 1
                break
              case 'host':
                summary.stats.after.noHost += 1
                break
              case 'import':
                summary.stats.after.noImport += 1
                break
              case 'keyframes':
                summary.stats.after.noKeyframes += 1
                break
              case 'keyframe':
                summary.stats.after.noKeyframe += 1
                break
              case 'media':
                summary.stats.after.noMedia += 1
                break
              case 'namespace':
                summary.stats.after.noNamespace += 1
                break
              case 'page':
                summary.stats.after.noPage += 1
                break
              case 'supports':
                summary.stats.after.noSupports += 1
                break
            }
          }
        } // end of after count

        // calc reductions
        summary.stats.summary.noReductions.noNodes = summary.stats.before.noNodes - summary.stats.after.noNodes
        summary.stats.summary.noReductions.noRules = summary.stats.before.noRules - summary.stats.after.noRules
        summary.stats.summary.noReductions.noDeclarations = summary.stats.before.noDeclarations - summary.stats.after.noDeclarations
        summary.stats.summary.noReductions.noComments = summary.stats.before.noComments - summary.stats.after.noComments
        summary.stats.summary.noReductions.noCharset = summary.stats.before.noCharset - summary.stats.after.noCharset
        summary.stats.summary.noReductions.noCustomMedia = summary.stats.before.noCustomMedia - summary.stats.after.noCustomMedia
        summary.stats.summary.noReductions.noDocument = summary.stats.before.noDocument - summary.stats.after.noDocument
        summary.stats.summary.noReductions.noFontFace = summary.stats.before.noFontFace - summary.stats.after.noFontFace
        summary.stats.summary.noReductions.noHost = summary.stats.before.noHost - summary.stats.after.noHost
        summary.stats.summary.noReductions.noImport = summary.stats.before.noImport - summary.stats.after.noImport
        summary.stats.summary.noReductions.noKeyframes = summary.stats.before.noKeyframes - summary.stats.after.noKeyframes
        summary.stats.summary.noReductions.noKeyframe = summary.stats.before.noKeyframe - summary.stats.after.noKeyframe
        summary.stats.summary.noReductions.noMedia = summary.stats.before.noMedia - summary.stats.after.noMedia
        summary.stats.summary.noReductions.noNamespace = summary.stats.before.noNamespace - summary.stats.after.noNamespace
        summary.stats.summary.noReductions.noPage = summary.stats.before.noPage - summary.stats.after.noPage
        summary.stats.summary.noReductions.noSupports = summary.stats.before.noSupports - summary.stats.after.noSupports

        // prepare output
        const outputAST = {
          type: 'stylesheet',
          stylesheet: {
            rules: fRules
          }
        }
        let outputCSS = cssTools.stringify(outputAST)

        // Detect via JS
        // Detect via HTML
        if (OPTIONS.special_reduce_with_html && (OPTIONS.html !== undefined && OPTIONS.html !== '')) {
          if (OPTIONS.verbose) { console.log(info('Process - HTML')) }

          const ast = cssTools.parse(outputCSS, { source: fileLocation })

          const rulesIn = ast.stylesheet.rules

          let selectors = []
          const rulesCount2 = 0
          const rulesCount3 = 0
          let ignoreFound = false

          for (let i = 0, RULES_COUNT = rulesIn.length; i < RULES_COUNT; ++i) {
            if (rulesIn[i] !== undefined) {
              switch (rulesIn[i].type) {
                case 'rule':

                  ignoreFound = false

                  for (let j = 0, rulesCount2 = OPTIONS.special_reduce_with_html_ignore_selectors.length; j < rulesCount2; ++j) {
                    if (rulesIn[i].selectors && rulesIn[i].selectors.join(',').includes(OPTIONS.special_reduce_with_html_ignore_selectors[j])) {
                      ignoreFound = true
                      break
                    }
                  }

                  if (ignoreFound == false) {
                    for (let j = 0, rulesCount2 = rulesIn[i].selectors.length; j < rulesCount2; ++j) {
                      selectors.push(rulesIn[i].selectors[j])
                    }
                  }

                  break
                case 'media':

                  for (let j = 0, rulesCount2 = rulesIn[i].rules.length; j < rulesCount2; ++j) {
                    ignoreFound = false

                    for (let k = 0, rulesCount3 = OPTIONS.special_reduce_with_html_ignore_selectors.length; k < rulesCount3; ++k) {
                      if (rulesIn[i].rules[j].selectors && rulesIn[i].rules[j].selectors.join(',').includes(OPTIONS.special_reduce_with_html_ignore_selectors[k])) {
                        ignoreFound = true
                        break
                      }
                    }

                    if (ignoreFound == false) {
                      for (let k = 0, rulesCount3 = rulesIn[i].rules[j].selectors.length; k < rulesCount3; ++k) {
                        selectors.push(rulesIn[i].rules[j].selectors[k])
                      }
                    }
                  }
                  break
                case 'document':

                  for (let j = 0, rulesCount2 = rulesIn[i].rules.length; j < rulesCount2; ++j) {
                    ignoreFound = false

                    for (let k = 0, rulesCount3 = OPTIONS.special_reduce_with_html_ignore_selectors.length; k < rulesCount3; ++k) {
                      if (rulesIn[i].rules[j].selectors && rulesIn[i].rules[j].selectors.join(',').includes(OPTIONS.special_reduce_with_html_ignore_selectors[k])) {
                        ignoreFound = true
                        break
                      }
                    }

                    if (ignoreFound == false) {
                      for (let k = 0, rulesCount3 = rulesIn[i].rules[j].selectors.length; k < rulesCount3; ++k) {
                        selectors.push(rulesIn[i].rules[j].selectors[k])
                      }
                    }
                  }
                  break
                case 'supports':

                  for (let j = 0, rulesCount2 = rulesIn[i].rules.length; j < rulesCount2; ++j) {
                    ignoreFound = false

                    for (let k = 0, rulesCount3 = OPTIONS.special_reduce_with_html_ignore_selectors.length; k < rulesCount3; ++k) {
                      if (rulesIn[i].rules[j].selectors && rulesIn[i].rules[j].selectors.join(',').includes(OPTIONS.special_reduce_with_html_ignore_selectors[k])) {
                        ignoreFound = true
                        break
                      }
                    }

                    if (ignoreFound == false) {
                      for (let k = 0, rulesCount3 = rulesIn[i].rules[j].selectors.length; k < rulesCount3; ++k) {
                        selectors.push(rulesIn[i].rules[j].selectors[k])
                      }
                    }
                  }
                  break
                case 'charset':
                  break
              }
            }
          }

          // remove duplicates
          selectors = Array.from(new Set(selectors))

          // process selectors returned from processing HTML
          cssPurgeEventEmitter.on('HTML_RESULTS_END', (selectorsRemoved) => {
            summary.selectors_removed = selectorsRemoved

            outputCSS = processHTMLResults(rulesIn, selectors)

            callback(null, completeOutput(outputCSS))
          })

          processHTML(selectors)
        } else { // end of special_reduce_with_html
          callback(null, completeOutput(outputCSS))
        } // end of special_reduce_with_html
      }

      cssPurgeEventEmitter.on('CONFIG_READ_REDUCE_PROPS_END', continueCSSProcess) // end of event

      if (cssDataIn == null) {
        cssPurgeEventEmitter.emit('CONFIG_READ_REDUCE_PROPS_END')
      }

      if (!hasReadReduceDeclarations && optionsIn !== null && !existsSync(OPTIONS.reduce_declarations_file_location)) {
        if (optionsIn !== null && (optionsIn.reduceConfig === undefined || optionsIn.reduceConfig === null)) {
          // default process settings
          const default_reduce_declarations_config = {
            declaration_names: [
              'font',
              'margin',
              'padding',
              'list-style',
              'outline',
              'border',
              'border-top',
              'border-right',
              'border-bottom',
              'border-left',
              'border-radius',
              'border-color',
              'border-top-color',
              'border-right-color',
              'border-bottom-color',
              'border-left-color',
              'color',
              'background-color',
              'font-color',
              'outline-color',
              'box-shadow',
              'text-shadow',
              'float',
              'font-family',
              'font-size',
              'font-weight',
              'font-style',
              'font-variant',
              'font-stretch'
            ]
          }
          optionsIn.reduceConfig = default_reduce_declarations_config
          readReduceDeclarations(optionsIn.reduceConfig)
        }
      } else if (!hasReadReduceDeclarations) {
        readReduceDeclarations()
      }
    } // end of processCSS

    this.purgeCSS = function purgeCSS (css, options, callback) {
      processCSS(css, options, callback)
    }

    this.purgeCSSFiles = function purgeCSSFiles (options, configFilePath) {
      processCSSFiles(options, configFilePath)
    }
  }
} // end of CSSPurge

export default {
  purgeCSS (css, options, callback) {
    const cssPurge = new CSSPurge()

    cssPurge.purgeCSS(css, options, callback)
  },
  purgeCSSFiles (options, configFilePath) {
    const cssPurge = new CSSPurge()

    cssPurge.purgeCSSFiles(options, configFilePath)
  }
}
