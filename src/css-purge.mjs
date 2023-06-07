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

/**
 *  Process font
 */

import filterForFont from './utils/filter-for-font.mjs'
// import hasInherit from './utils/has-inherit.mjs'
// import toProperty from './utils/to-property.mjs'
// import toValue from './utils/to-value.mjs'
// import toPosition from './utils/to-position.mjs'
import formatFontFamily from './utils/format-font-family.mjs'
import getValueOfFontProp from './utils/get-value-of-font-prop.mjs'

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

import trim from './css/trim.mjs'
import hack from './css/hack.mjs'

import getTokens from './utils/get-tokens.mjs'

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
import filterForListStyle from './utils/filter-for-list-style.mjs'
import filterForMargin from './utils/filter-for-margin.mjs'
import filterForOutline from './utils/filter-for-outline.mjs'
import filterForPadding from './utils/filter-for-padding.mjs'

import hasInherit from './utils/has-inherit.mjs'

import getSelectors from './utils/get-selectors.mjs'
import getValueOfTriProp from './utils/get-value-of-tri-prop.mjs'
import getValueOfSquareProp from './utils/get-value-of-square-prop.mjs'
import getBackgroundProp from './utils/get-background-prop.mjs'
import getFilePath from './utils/get-file-path.mjs'
import getFileSizeInKB from './utils/get-file-size-in-kilo-bytes.mjs'
import getSizeInKB from './utils/get-size-in-kilo-bytes.mjs'
import roundTo from './utils/round-to.mjs'
import escape from './utils/escape.mjs'

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

function getSummaryStatsFor (collector) {
  return function getSummaryStats ({ declarations, type }) {
    if (Array.isArray(declarations)) {
      collector.noComments = declarations.filter(({ type }) => type === 'comment').length
    }

    if (type === 'comment') {
      collector.noComments += 1
    }

    if (type === 'rule') {
      collector.noRules += 1

      collector.noDeclarations += declarations.length
    }

    switch (type) {
      case 'charset':
        collector.noCharset += 1
        break
      case 'custom-media':
        collector.noCustomMedia += 1
        break
      case 'document':
        collector.noDocument += 1
        break
      case 'font-face':
        collector.noFontFace += 1
        break
      case 'host':
        collector.noHost += 1
        break
      case 'import':
        collector.noImport += 1
        break
      case 'keyframes':
        collector.noKeyframes += 1
        break
      case 'keyframe':
        collector.noKeyframe += 1
        break
      case 'media':
        collector.noMedia += 1
        break
      case 'namespace':
        collector.noNamespace += 1
        break
      case 'page':
        collector.noPage += 1
        break
      case 'supports':
        collector.noSupports += 1
        break
    }
  }
}

class CSSPurgeEmitter extends EventEmitter {}

class CSSPurge {
  constructor () {
    let date = new Date()

    const cssPurgeEventEmitter = new CSSPurgeEmitter()

    let DEFAULT_OPTIONS = {
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
      shorten_hexcolor_uppercase: false,
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
      special_convert_rem_default_px: '16',
      special_convert_rem_px: '10',
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
      reduce_declarations_file_location: 'default_options_reduce_declarations.json'
    }

    let OPTIONS = {
      ...DEFAULT_OPTIONS
    }

    let CURRENT_CONFIG_FILE_PATH = null

    const dataCSSIn = []
    let dataHTMLIn = []
    const dataJSIn = []

    let jsDom = null
    let jsDomWindow = null
    let jsDomDoc = null

    let REPORT_DUPLICATE_CSS = DEFAULT_OPTIONS.report_file_location

    // summary
    const SUMMARY = {
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
        shorten_hexcolor_uppercase: OPTIONS.shorten_hexcolor_uppercase,
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
        special_convert_rem_default_px: OPTIONS.special_convert_rem_default_px,
        special_convert_rem_px: OPTIONS.special_convert_rem_px,
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
    const STATS = {
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
    let DEFAULT_OPTIONS_REDUCE_DECLARATIONS = 'default_options_reduce_declarations.json'
    let hasReadReduceDeclarations = false

    let selectors = ''
    let selectorsCount = 0
    const selectorPropertyValues = []

    let declarationNames = [
      ...DEFAULT_DECLARATION_NAMES
    ]
    let declarationNamesCount = declarationNames.length

    const configFileLocation = 'default_options.json'
    let fileLocation = 'demo/test1.css'

    let readCSSFileCount = 0
    let readHTMLFileCount = 0
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

    let duplicateIds

    let DECLARATION_COUNT = 0

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

      for (let i = 0, cssSelectorsLength = cssSelectors.length; i < cssSelectorsLength; ++i) {
        for (let j = 0, resultsLength = results.length; j < resultsLength; ++j) {
          if (cssSelectors[i] === results[j]) {
            cssSelectors.splice(i, 1)
            cssSelectorsLength -= 1
            i -= 1
            break
          }
        }

        if (jsDomDoc.querySelector(cssSelectors[i]) !== null) {
          cssSelectors.splice(i, 1)
          cssSelectorsLength -= 1
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

              Object
                .values(htmlFiles)
                .forEach((htmlFile) => {
                  getFilePath(htmlFile, ['.html', '.htm'], collector)
                })

              if (collector.length) {
                htmlFiles = collector
              }
            }
            break
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
          case 'string': // formats
            {
              htmlFiles = htmlFiles.replace(/ /g, '')

              // comma delimited list - filename1.html, filename2.html
              if (htmlFiles.indexOf(',') > -1) {
                htmlFiles = htmlFiles.replace(/^\s+|\s+$/g, '').split(',')

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

        readHTMLFile(htmlFiles)

        cssPurgeEventEmitter.on('HTML_READ_AGAIN', () => {
          // process selectors
          processHTMLSelectors(cssSelectors, htmlDataIn, htmlOptionsIn)

          // read next file
          dataHTMLIn = []
          readHTMLFile(htmlFiles)
        })
        cssPurgeEventEmitter.on('HTML_READ_END', () => {
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

          STATS.files.html.push({
            fileName: files[readHTMLFileCount],
            fileSizeKB
          })
        })
      } else {
        const fileSizeKB = getFileSizeInKB(files[readHTMLFileCount])

        STATS.files.html.push({
          fileName: files[readHTMLFileCount],
          fileSizeKB
        })
      }

      SUMMARY.files.input_html.push(files[readHTMLFileCount])

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
        const readHTMLStream = createReadStream(files[readHTMLFileCount], 'utf8')

        readHTMLStream
          .on('data', function (chunk) {
            dataHTMLIn.push(chunk)
          })
          .on('end', () => {
            readHTMLFileCount += 1
            if (readHTMLFileCount < files.length) {
              cssPurgeEventEmitter.emit('HTML_READ_AGAIN')
            } else {
              cssPurgeEventEmitter.emit('HTML_READ_END')
            }
          })
          .on('error', (e) => {
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
        cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END', OPTIONS)
      } else {
        let jsonConfig = ''

        const readStream = createReadStream(DEFAULT_OPTIONS_REDUCE_DECLARATIONS, 'utf8')

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
            cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END', OPTIONS)
          })
          .on('error', (e) => {
            cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_REDUCE_PROPS_ERROR', OPTIONS)
            console.log(error('Reduce Properties Config File read error: Something went wrong while reading the file, check your default_options_reduce_declarations.json and please try again.'))
            console.log(e)
            process.exit(1)
          })
      }
    } // end of readReduceDeclarations

    function readConfig (configFilePath = '', optionsIn = {}) {
      let defaultOptions = ''
      let readStream

      if (configFilePath === '') {
        readStream = createReadStream(configFileLocation, 'utf8')
      } else {
        if (configFilePath === 'cmd_default') {
          DEFAULT_OPTIONS = {}
          DEFAULT_OPTIONS = optionsIn

          if (DEFAULT_OPTIONS.trim) {
            OPTIONS.trim_removed_rules_previous_comment = DEFAULT_OPTIONS.trim
            OPTIONS.trim_comments = DEFAULT_OPTIONS.trim
            OPTIONS.trim_whitespace = DEFAULT_OPTIONS.trim
            OPTIONS.trim_breaklines = DEFAULT_OPTIONS.trim
            OPTIONS.trim_last_semicolon = DEFAULT_OPTIONS.trim
          }

          if (DEFAULT_OPTIONS.shorten) {
            OPTIONS.shorten_zero = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_hexcolor = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_hexcolor_extended_names = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_font = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_background = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_margin = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_padding = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_list_style = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_outline = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_border = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_border_top = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_border_right = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_border_bottom = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_border_left = DEFAULT_OPTIONS.shorten
            OPTIONS.shorten_border_radius = DEFAULT_OPTIONS.shorten
          }

          if (DEFAULT_OPTIONS.special_reduce_with_html) {
            OPTIONS.special_reduce_with_html = DEFAULT_OPTIONS.special_reduce_with_html
          }

          if (DEFAULT_OPTIONS.css_output) {
            OPTIONS.css_output = DEFAULT_OPTIONS.css_output
          }

          if (DEFAULT_OPTIONS.verbose) {
            OPTIONS.verbose = DEFAULT_OPTIONS.verbose
          }

          SUMMARY.files.output.push(DEFAULT_OPTIONS.css_output)
          REPORT_DUPLICATE_CSS = OPTIONS.report_file_location
          DEFAULT_OPTIONS_REDUCE_DECLARATIONS = OPTIONS.reduce_declarations_file_location
          SUMMARY.options_used = OPTIONS

          cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_END', OPTIONS)

          return true
        } else { // custom
          readStream = createReadStream(configFilePath, 'utf8')
        }
      }

      readStream
        .on('data', function (chunk) {
          defaultOptions += chunk
        })
        .on('end', () => {
          if (defaultOptions !== '') {
            try {
              DEFAULT_OPTIONS = JSON.parse(defaultOptions)
            } catch (err) {
              console.log(error('Config File read error: ' + configFileLocation + ', check your syntax, especially commas, then please try again.'))
              console.log(err)
              process.exit(1)
            }

            SUMMARY.files.output.push(DEFAULT_OPTIONS.css_output)
            REPORT_DUPLICATE_CSS = DEFAULT_OPTIONS.report_file_location
            DEFAULT_OPTIONS_REDUCE_DECLARATIONS = DEFAULT_OPTIONS.reduce_declarations_file_location

            if (DEFAULT_OPTIONS.trim) {
              DEFAULT_OPTIONS.trim_removed_rules_previous_comment = DEFAULT_OPTIONS.trim
              DEFAULT_OPTIONS.trim_comments = DEFAULT_OPTIONS.trim
              DEFAULT_OPTIONS.trim_whitespace = DEFAULT_OPTIONS.trim
              DEFAULT_OPTIONS.trim_breaklines = DEFAULT_OPTIONS.trim
              DEFAULT_OPTIONS.trim_last_semicolon = DEFAULT_OPTIONS.trim
            }

            if (DEFAULT_OPTIONS.shorten) {
              DEFAULT_OPTIONS.shorten_zero = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_hexcolor = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_hexcolor_extended_names = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_font = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_background = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_margin = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_padding = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_list_style = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_outline = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_border = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_border_top = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_border_right = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_border_bottom = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_border_left = DEFAULT_OPTIONS.shorten
              DEFAULT_OPTIONS.shorten_border_radius = DEFAULT_OPTIONS.shorten
            }

            OPTIONS = DEFAULT_OPTIONS
            SUMMARY.options_used = OPTIONS
          }

          cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_END', OPTIONS)
        })
        .on('error', (e) => {
          cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_ERROR')
          console.log(error('Config File read error: Something went wrong while reading the file, check your ' + configFileLocation + ' and please try again.'))
          console.log(e)
          process.exit(1)
        })

      return readStream
    }

    /* read css input files */
    function processCSSFiles (optionsIn = null, configFilePath = '') {
      function continueCSSFilesProcess () {
        cssPurgeEventEmitter.removeListener('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END', continueCSSFilesProcess)

        function continueCSSFilesProcessAfterConfig () {
          cssPurgeEventEmitter.removeListener('continueCSSFilesProcessAfterConfig', continueCSSFilesProcessAfterConfig)

          // config
          if (OPTIONS.css === undefined && DEFAULT_OPTIONS.css) {
            OPTIONS.css = DEFAULT_OPTIONS.css
          }

          // Options
          if (optionsIn !== null && optionsIn !== undefined) {
            for (const key in optionsIn) {
              OPTIONS[key] = optionsIn[key]
            }
          }

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

            cssPurgeEventEmitter.on('CSS_READ_AGAIN', () => {
              readCSSFile(files)
            })

            cssPurgeEventEmitter.on('CSS_READ_END', () => {
              // cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END');
              processCSS(null, OPTIONS, () => {
              })
            })

            readCSSFile(files)
          } else { // end of files nothing check
            //
          }
        }

        if (CURRENT_CONFIG_FILE_PATH !== configFilePath) { // don't read same config
          cssPurgeEventEmitter.on('DEFAULT_OPTIONS_READ_END', continueCSSFilesProcessAfterConfig) // end of config read
        }

        CURRENT_CONFIG_FILE_PATH = configFilePath

        if (configFilePath !== 'cmd_default') {
          readConfig(configFilePath)
        } else if (configFilePath === 'cmd_default') {
          readConfig(configFilePath, optionsIn)
        }
      }

      cssPurgeEventEmitter.on('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END', continueCSSFilesProcess) // end of reduce config read

      if (!hasReadReduceDeclarations && existsSync(OPTIONS.reduce_declarations_file_location)) {
        readReduceDeclarations()
      }

      if (!hasReadReduceDeclarations && !existsSync(OPTIONS.reduce_declarations_file_location)) {
        if (optionsIn !== null && (optionsIn.reduceDeclarations === undefined || optionsIn.reduceDeclarations === null)) {
        // default process settings
          const defaultReduceDeclarations = {
            declaration_names: [
              ...DEFAULT_DECLARATION_NAMES
            ]
          }

          optionsIn.reduceDeclarations = defaultReduceDeclarations

          readReduceDeclarations(defaultReduceDeclarations)
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

          STATS.files.css.push({
            fileName: files[readCSSFileCount],
            fileSizeKB
          })
          STATS.before.totalFileSizeKB += fileSizeKB
        })
      } else {
        const fileSizeKB = getFileSizeInKB(files[readCSSFileCount])

        STATS.files.css.push({
          fileName: files[readCSSFileCount],
          fileSizeKB
        })
        STATS.before.totalFileSizeKB += fileSizeKB
      }

      SUMMARY.files.input.push(files[readCSSFileCount])

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
        const readStream = createReadStream(files[readCSSFileCount], 'utf8')

        readStream
          .on('data', function (chunk) {
            dataCSSIn.push(chunk)
          })
          .on('end', () => {
            readCSSFileCount += 1
            if (readCSSFileCount < files.length) {
              cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
            } else {
              cssPurgeEventEmitter.emit('CSS_READ_END')
            }
          })
          .on('error', (e) => {
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
          if (SHORTEN || SHORTEN_BACKGROUND) processBackground(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_LIST_STYLE) processListStyle(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_BORDER_TOP) processBorderTop(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_BORDER_RIGHT) processBorderRight(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_BORDER_BOTTOM) processBorderBottom(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_BORDER_LEFT) processBorderLeft(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_BORDER) processBorder(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_BORDER_RADIUS) processBorderRadius(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_HEXCOLOR) processHexColor(rule, OPTIONS, SUMMARY)

          // if (SHORTEN || SHORTEN_FONT) processFont(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_MARGIN) processMargin(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_PADDING) processPadding(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_OUTLINE) processOutline(rule, OPTIONS, SUMMARY)

          if (SHORTEN || SHORTEN_ZERO) processZero(rule, OPTIONS, SUMMARY)
        })

      const RULES_COUNT = rules.length

      for (let i = 0; i < RULES_COUNT; ++i) {
        if (rules[i] !== undefined && rules[i].declarations !== undefined && rules[i].type === 'rule') {
          DECLARATION_COUNT = rules[i].declarations.length

          // font
          if (SHORTEN || SHORTEN_FONT) processFont(rules[i], OPTIONS, SUMMARY)

          DECLARATION_COUNT = rules[i].declarations.length

          // background
          if (SHORTEN || SHORTEN_BACKGROUND) {
            const background = rules[i].declarations.filter(filterForBackground)
            let backgroundProps = background.map(toProperty)

            if (backgroundProps.length >= OPTIONS.shorten_background_min) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Background : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

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

                const BACKGROUND_VALUES = [
                  backgroundColorValue,
                  backgroundImageValue,
                  backgroundRepeatValue,
                  backgroundAttachmentValue,
                  backgoundPositionValue
                ]

                const hasMultipleBackgrounds = backgroundValues.some((background) => background.match(/([^0-9]),([^0-9])/g))

                const hasGradient = backgroundValues.some((background) => background.includes('gradient'))

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

                if (hasMultipleBackgrounds && !hasGradient) {
                  let backgroundPropValue = ''
                  for (let j = 0; j < BACKGROUND_VALUES.length; ++j) {
                    const backgroundPropValues = BACKGROUND_VALUES[j].split(',')
                    backgroundPropValue += (backgroundPropValues[0]) ? backgroundPropValues[0].trim() + ' ' : ''
                    backgroundPropValue += (backgroundPropValues[1]) ? backgroundPropValues[1].trim() + ' ' : ''
                    BACKGROUND_VALUES[j] = ''
                  }
                  backgroundPropValue = backgroundPropValue.trim()
                  backgroundPropValue += ', ' + backgroundPropValue.trim()
                  BACKGROUND_VALUES[0] = backgroundPropValue
                }

                if (!hasGradient) {
                  if (
                    BACKGROUND_VALUES[0] === '' &&
                    BACKGROUND_VALUES[1] === '' &&
                    BACKGROUND_VALUES[2] === '' &&
                    BACKGROUND_VALUES[3] === '' &&
                    BACKGROUND_VALUES[4] === ''
                  ) {
                    // !!!
                  } else {
                    backgroundProps = [...DEFAULT_BACKGROUND_PROPS]
                    backgroundValues = BACKGROUND_VALUES
                  }

                  const declarations = rules[i].declarations

                  // check for !important
                  const hasImportant = backgroundValues.some((background) => /(!important)/g.test(background))

                  backgroundValues = backgroundValues.map((background) => background.replace(/(!important)/g, ''))

                  if (hasImportant) {
                    backgroundValues[backgroundValues.length - 1] += ' !important'
                  }

                  // remove any spaces from empty values
                  backgroundValues = backgroundValues.filter(Boolean)

                  // add declaration
                  const backgroundRuleIndex = declarations.findIndex(filterForBackground)

                  declarations.splice(backgroundRuleIndex, 0, {
                    type: 'declaration',
                    property: 'background',
                    value: backgroundValues.join(' ')
                  })

                  DECLARATION_COUNT += 1
                  SUMMARY.stats.summary.noBackgroundsShortened += 1

                  let backgroundIndex

                  // remove originals
                  backgroundIndex = declarations.findIndex(({ property }) => property === 'background-color')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.findIndex(({ property }) => property === 'background-image')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.findIndex(({ property }) => property === 'background-position')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.findIndex(({ property }) => property === 'background-repeat')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  backgroundIndex = declarations.findIndex(({ property }) => property === 'background-attachment')
                  if (backgroundIndex !== -1) {
                    declarations.splice(backgroundIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  // remove existing backgrounds
                  const properties = declarations.filter(toProperty).map(toProperty)
                  const j = properties.filter((property) => property === 'background').length
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
            const listStyle = rules[i].declarations.filter(filterForListStyle)
            let listStyleProps = listStyle.map(toProperty)
            if (
              (
                listStyleProps.includes('list-style-type') ||
                listStyleProps.includes('list-style-position') ||
                listStyleProps.includes('list-style-image')
              ) ||
              listStyleProps.includes('list-style')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - List-style : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const listStyleHasInherit = listStyle.some(hasInherit)
              if (!listStyleHasInherit) {
                let listStyleValues = listStyle.map(toValue)

                const listStyleTypeIndex = listStyleProps.indexOf('list-style-type')
                const listStylePositionIndex = listStyleProps.indexOf('list-style-position')
                const listStyleImageIndex = listStyleProps.indexOf('list-style-image')
                const listStyleTypeValue = listStyleValues[listStyleTypeIndex] ?? ''
                const listStylePositionValue = listStyleValues[listStylePositionIndex] ?? ''
                const listStyleImageValue = listStyleValues[listStyleImageIndex] ?? ''

                const LIST_STYLE_VALUES = [
                  listStyleTypeValue,
                  listStylePositionValue,
                  listStyleImageValue
                ]

                // existing listStyle check
                const listStylePropValueIndex = listStyleProps.indexOf('list-style')
                if (listStylePropValueIndex !== -1) {
                  const listStylePropValue = listStyleValues[listStylePropValueIndex]

                  if (listStylePropValue !== 'none') {
                    if (listStyleTypeIndex > listStylePropValueIndex) {
                      LIST_STYLE_VALUES[0] = listStyleTypeValue
                    } else {
                      const propValue = getValueOfTriProp(listStylePropValue, 'type')
                      if (propValue) LIST_STYLE_VALUES[0] = propValue
                    }

                    if (listStylePositionIndex > listStylePropValueIndex) {
                      LIST_STYLE_VALUES[1] = listStylePositionValue
                    } else {
                      const propValue = getValueOfTriProp(listStylePropValue, 'position')
                      if (propValue) LIST_STYLE_VALUES[1] = propValue
                    }

                    if (listStyleImageIndex > listStylePropValueIndex) {
                      LIST_STYLE_VALUES[2] = listStyleImageValue
                    } else {
                      const propValue = getValueOfTriProp(listStylePropValue, 'image')
                      if (propValue) LIST_STYLE_VALUES[2] = propValue
                    }
                  } else {
                    LIST_STYLE_VALUES[0] = listStylePropValue
                    LIST_STYLE_VALUES[1] = ''
                    LIST_STYLE_VALUES[2] = ''
                  }
                }

                if (
                  LIST_STYLE_VALUES[0] === '' &&
                  LIST_STYLE_VALUES[1] === '' &&
                  LIST_STYLE_VALUES[2] === ''
                ) {
                  // !!!
                } else {
                  listStyleProps = [...DEFAULT_LIST_STYLE_PROPS]
                  listStyleValues = LIST_STYLE_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = listStyleValues.some((listStyle) => /(!important)/g.test(listStyle))

                listStyleValues = listStyleValues.map((listStyle) => listStyle.replace(/(!important)/g, ''))

                if (hasImportant) {
                  listStyleValues[listStyleValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                listStyleValues = listStyleValues.filter(Boolean)

                // add declaration
                const listStyleRuleIndex = declarations.findIndex(filterForListStyle)

                declarations.splice(listStyleRuleIndex, 0, {
                  type: 'declaration',
                  property: 'list-style',
                  value: listStyleValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noListStylesShortened += 1

                let listStyleIndex

                listStyleIndex = declarations.findIndex(({ property }) => property === 'list-style-type')
                if (listStyleIndex !== -1) {
                  declarations.splice(listStyleIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                listStyleIndex = declarations.findIndex(({ property }) => property === 'list-style-position')
                if (listStyleIndex !== -1) {
                  declarations.splice(listStyleIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                listStyleIndex = declarations.findIndex(({ property }) => property === 'list-style-image')
                if (listStyleIndex !== -1) {
                  declarations.splice(listStyleIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing listStyles
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'list-style').length
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
            const outline = rules[i].declarations.filter(filterForOutline)
            let outlineProps = outline.map(toProperty)
            if (
              (
                outlineProps.includes('outline-width') ||
                outlineProps.includes('outline-style') ||
                outlineProps.includes('outline-color')
              ) ||
              outlineProps.includes('outline')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Outline : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const outlineHasInherit = outline.some(hasInherit)
              if (!outlineHasInherit) {
                let outlineValues = outline.map(toValue)

                const outlineWidthIndex = outlineProps.indexOf('outline-width')
                const outlineStyleIndex = outlineProps.indexOf('outline-style')
                const outlineColorIndex = outlineProps.indexOf('outline-color')
                const outlineWidthValue = outlineValues[outlineWidthIndex] ?? ''
                const outlineStyleValue = outlineValues[outlineStyleIndex] ?? ''
                const outlineColorValue = outlineValues[outlineColorIndex] ?? ''

                const OUTLINE_VALUES = [
                  outlineWidthValue,
                  outlineStyleValue,
                  outlineColorValue
                ]

                // existing outline check
                const outlinePropValueIndex = outlineProps.indexOf('outline')
                if (outlinePropValueIndex !== -1) {
                  const outlinePropValue = outlineValues[outlinePropValueIndex]
                  if (outlinePropValue !== 'none') {
                    if (outlineWidthIndex > outlinePropValueIndex) {
                      OUTLINE_VALUES[0] = outlineWidthValue
                    } else {
                      const propValue = getValueOfTriProp(outlinePropValue, 'width')
                      if (propValue) OUTLINE_VALUES[0] = propValue
                    }

                    if (outlineStyleIndex > outlinePropValueIndex) {
                      OUTLINE_VALUES[1] = outlineStyleValue
                    } else {
                      const propValue = getValueOfTriProp(outlinePropValue, 'style')
                      if (propValue) OUTLINE_VALUES[1] = propValue
                    }

                    if (outlineColorIndex > outlinePropValueIndex) {
                      OUTLINE_VALUES[2] = outlineColorValue
                    } else {
                      const propValue = getValueOfTriProp(outlinePropValue, 'color')
                      if (propValue) OUTLINE_VALUES[2] = propValue
                    }
                  } else {
                    OUTLINE_VALUES[0] = '0'
                    OUTLINE_VALUES[1] = ''
                    OUTLINE_VALUES[2] = ''
                  }
                }

                if (
                  OUTLINE_VALUES[0] === '' &&
                  OUTLINE_VALUES[1] === '' &&
                  OUTLINE_VALUES[2] === ''
                ) {
                  // !!!
                } else {
                  outlineProps = [...DEFAULT_OUTLINE_PROPS]
                  outlineValues = OUTLINE_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = outlineValues.some((outline) => /(!important)/g.test(outline))

                outlineValues = outlineValues.map((outline) => outline.replace(/(!important)/g, ''))

                if (hasImportant) {
                  outlineValues[outlineValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                outlineValues = outlineValues.filter(Boolean)

                // add declaration
                const outlineRuleIndex = declarations.findIndex(filterForOutline)

                declarations.splice(outlineRuleIndex, 0, {
                  type: 'declaration',
                  property: 'outline',
                  value: outlineValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noOutlinesShortened += 1

                let outlineIndex

                outlineIndex = declarations.findIndex(({ property }) => property === 'outline-width')
                if (outlineIndex !== -1) {
                  declarations.splice(outlineIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                outlineIndex = declarations.findIndex(({ property }) => property === 'outline-style')
                if (outlineIndex !== -1) {
                  declarations.splice(outlineIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                outlineIndex = declarations.findIndex(({ property }) => property === 'outline-color')
                if (outlineIndex !== -1) {
                  declarations.splice(outlineIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing outlines
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'outline').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('outline')
                    const now = properties.indexOf('outline', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of outline

          // borderTop
          if (SHORTEN || SHORTEN_BORDER_TOP) {
            const borderTop = rules[i].declarations.filter(filterForBorderTop)
            let borderTopProps = borderTop.map(toProperty)
            if (
              (
                borderTopProps.includes('border-top-width') ||
                borderTopProps.includes('border-top-style') ||
                borderTopProps.includes('border-top-color')
              ) ||
              borderTopProps.includes('border-top')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Top : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderTopHasInherit = borderTop.some(hasInherit)
              if (!borderTopHasInherit) {
                let borderTopValues = borderTop.map(toValue)

                const borderTopWidthIndex = borderTopProps.indexOf('border-top-width')
                const borderTopStyleIndex = borderTopProps.indexOf('border-top-style')
                const borderTopColorIndex = borderTopProps.indexOf('border-top-color')
                const borderTopWidthValue = borderTopValues[borderTopWidthIndex] ?? ''
                const borderTopStyleValue = borderTopValues[borderTopStyleIndex] ?? ''
                const borderTopColorValue = borderTopValues[borderTopColorIndex] ?? ''

                const BORDER_TOP_VALUES = [
                  borderTopWidthValue,
                  borderTopStyleValue,
                  borderTopColorValue
                ]

                // existing borderTop check
                const borderTopPropValueIndex = borderTopProps.indexOf('border-top')
                if (borderTopPropValueIndex !== -1) {
                  const borderTopPropValue = borderTopValues[borderTopPropValueIndex]

                  if (borderTopPropValue !== 'none') {
                    if (borderTopWidthIndex > borderTopPropValueIndex) {
                      BORDER_TOP_VALUES[0] = borderTopWidthValue
                    } else {
                      const propValue = getValueOfTriProp(borderTopPropValue, 'width')
                      if (propValue) BORDER_TOP_VALUES[0] = propValue
                    }

                    if (borderTopStyleIndex > borderTopPropValueIndex) {
                      BORDER_TOP_VALUES[1] = borderTopStyleValue
                    } else {
                      const propValue = getValueOfTriProp(borderTopPropValue, 'style')
                      if (propValue) BORDER_TOP_VALUES[1] = propValue
                    }

                    if (borderTopColorIndex > borderTopPropValueIndex) {
                      BORDER_TOP_VALUES[2] = borderTopColorValue
                    } else {
                      const propValue = getValueOfTriProp(borderTopPropValue, 'color')
                      if (propValue) BORDER_TOP_VALUES[2] = propValue
                    }
                  } else {
                    BORDER_TOP_VALUES[0] = '0'
                    BORDER_TOP_VALUES[1] = ''
                    BORDER_TOP_VALUES[2] = ''
                  }
                }

                if (
                  BORDER_TOP_VALUES[0] === '' &&
                  BORDER_TOP_VALUES[1] === '' &&
                  BORDER_TOP_VALUES[2] === ''
                ) {
                  // !!!
                } else {
                  borderTopProps = [...DEFAULT_BORDER_TOP_PROPS]
                  borderTopValues = BORDER_TOP_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = borderTopValues.some((borderTop) => /(!important)/g.test(borderTop))

                borderTopValues = borderTopValues.map((borderTop) => borderTop.replace(/(!important)/g, ''))

                if (hasImportant) {
                  borderTopValues[borderTopValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                borderTopValues = borderTopValues.filter(Boolean)

                // add declaration
                const borderTopRuleIndex = declarations.findIndex(filterForBorderTop)

                declarations.splice(borderTopRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-top',
                  value: borderTopValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noBorderTopsShortened += 1

                let borderTopIndex

                borderTopIndex = declarations.findIndex(({ property }) => property === 'border-top-width')
                if (borderTopIndex !== -1) {
                  declarations.splice(borderTopIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderTopIndex = declarations.findIndex(({ property }) => property === 'border-top-style')
                if (borderTopIndex !== -1) {
                  declarations.splice(borderTopIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderTopIndex = declarations.findIndex(({ property }) => property === 'border-top-color')
                if (borderTopIndex !== -1) {
                  declarations.splice(borderTopIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderTops
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'border-top').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('border-top')
                    const now = properties.indexOf('border-top', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit
            }
          } // end of borderTop

          // borderRight
          if (SHORTEN || SHORTEN_BORDER_RIGHT) {
            const borderRight = rules[i].declarations.filter(filterForBorderRight)
            let borderRightProps = borderRight.map(toProperty)
            if (
              (
                borderRightProps.includes('border-right-width') ||
                borderRightProps.includes('border-right-style') ||
                borderRightProps.includes('border-right-color')
              ) ||
              borderRightProps.includes('border-right')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Right : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderRightHasInherit = borderRight.some(hasInherit)
              if (!borderRightHasInherit) {
                let borderRightValues = borderRight.map(toValue)

                const borderRightWidthIndex = borderRightProps.indexOf('border-right-width')
                const borderRightStyleIndex = borderRightProps.indexOf('border-right-style')
                const borderRightColorIndex = borderRightProps.indexOf('border-right-color')
                const borderRightWidthValue = borderRightValues[borderRightWidthIndex] ?? ''
                const borderRightStyleValue = borderRightValues[borderRightStyleIndex] ?? ''
                const borderRightColorValue = borderRightValues[borderRightColorIndex] ?? ''

                const BORDER_RIGHT_VALUES = [
                  borderRightWidthValue,
                  borderRightStyleValue,
                  borderRightColorValue
                ]

                // existing borderRight check
                const borderRightPropValueIndex = borderRightProps.indexOf('border-right')
                if (borderRightPropValueIndex !== -1) {
                  const borderRightPropValue = borderRightValues[borderRightPropValueIndex]

                  if (borderRightPropValue !== 'none') {
                    if (borderRightWidthIndex > borderRightPropValueIndex) {
                      BORDER_RIGHT_VALUES[0] = borderRightWidthValue
                    } else {
                      const propValue = getValueOfTriProp(borderRightPropValue, 'width')
                      if (propValue) BORDER_RIGHT_VALUES[0] = propValue
                    }
                    if (borderRightStyleIndex > borderRightPropValueIndex) {
                      BORDER_RIGHT_VALUES[1] = borderRightStyleValue
                    } else {
                      const propValue = getValueOfTriProp(borderRightPropValue, 'style')
                      if (propValue) BORDER_RIGHT_VALUES[1] = propValue
                    }
                    if (borderRightColorIndex > borderRightPropValueIndex) {
                      BORDER_RIGHT_VALUES[2] = borderRightColorValue
                    } else {
                      const propValue = getValueOfTriProp(borderRightPropValue, 'color')
                      if (propValue) BORDER_RIGHT_VALUES[2] = propValue
                    }
                  } else {
                    BORDER_RIGHT_VALUES[0] = '0'
                    BORDER_RIGHT_VALUES[1] = ''
                    BORDER_RIGHT_VALUES[2] = ''
                  }
                }

                if (
                  BORDER_RIGHT_VALUES[0] === '' &&
                  BORDER_RIGHT_VALUES[1] === '' &&
                  BORDER_RIGHT_VALUES[2] === ''
                ) {
                  // !!!
                } else {
                  borderRightProps = [...DEFAULT_BORDER_RIGHT_PROPS]
                  borderRightValues = BORDER_RIGHT_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = borderRightValues.some((borderRight) => /(!important)/g.test(borderRight))

                borderRightValues = borderRightValues.map((borderRight) => borderRight.replace(/(!important)/g, ''))

                if (hasImportant) {
                  borderRightValues[borderRightValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                borderRightValues = borderRightValues.filter(Boolean)

                // add declaration
                const borderRightRuleIndex = declarations.findIndex(filterForBorderRight)

                declarations.splice(borderRightRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-right',
                  value: borderRightValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noBorderRightsShortened += 1

                let borderRightIndex

                borderRightIndex = declarations.findIndex(({ property }) => property === 'border-right-width')
                if (borderRightIndex !== -1) {
                  declarations.splice(borderRightIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRightIndex = declarations.findIndex(({ property }) => property === 'border-right-style')
                if (borderRightIndex !== -1) {
                  declarations.splice(borderRightIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRightIndex = declarations.findIndex(({ property }) => property === 'border-right-color')
                if (borderRightIndex !== -1) {
                  declarations.splice(borderRightIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderRights
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'border-right').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('border-right')
                    const now = properties.indexOf('border-right', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit
            }
          } // end of borderRight

          // borderBottom
          if (SHORTEN || SHORTEN_BORDER_BOTTOM) {
            const borderBottom = rules[i].declarations.filter(filterForBorderBottom)
            let borderBottomProps = borderBottom.map(toProperty)
            if (
              (
                borderBottomProps.includes('border-bottom-width') ||
                borderBottomProps.includes('border-bottom-style') ||
                borderBottomProps.includes('border-bottom-color')
              ) ||
              borderBottomProps.includes('border-bottom')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Bottom : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderBottomHasInherit = borderBottom.some(hasInherit)
              if (!borderBottomHasInherit) {
                let borderBottomValues = borderBottom.map(toValue)

                const borderBottomWidthIndex = borderBottomProps.indexOf('border-bottom-width')
                const borderBottomStyleIndex = borderBottomProps.indexOf('border-bottom-style')
                const borderBottomColorIndex = borderBottomProps.indexOf('border-bottom-color')
                const borderBottomWidthValue = borderBottomValues[borderBottomWidthIndex] ?? ''
                const borderBottomStyleValue = borderBottomValues[borderBottomStyleIndex] ?? ''
                const borderBottomColorValue = borderBottomValues[borderBottomColorIndex] ?? ''

                const BORDER_BOTTOM_VALUES = [
                  borderBottomWidthValue,
                  borderBottomStyleValue,
                  borderBottomColorValue
                ]

                // existing borderBottom check
                const borderBottomPropValueIndex = borderBottomProps.indexOf('border-bottom')
                if (borderBottomPropValueIndex !== -1) {
                  const borderBottomPropValue = borderBottomValues[borderBottomPropValueIndex]
                  if (borderBottomPropValue !== 'none') {
                    if (borderBottomWidthIndex > borderBottomPropValueIndex) {
                      BORDER_BOTTOM_VALUES[0] = borderBottomWidthValue
                    } else {
                      const propValue = getValueOfTriProp(borderBottomPropValue, 'width')
                      if (propValue) BORDER_BOTTOM_VALUES[0] = propValue
                    }

                    if (borderBottomStyleIndex > borderBottomPropValueIndex) {
                      BORDER_BOTTOM_VALUES[1] = borderBottomStyleValue
                    } else {
                      const propValue = getValueOfTriProp(borderBottomPropValue, 'style')
                      if (propValue) BORDER_BOTTOM_VALUES[1] = propValue
                    }

                    if (borderBottomColorIndex > borderBottomPropValueIndex) {
                      BORDER_BOTTOM_VALUES[2] = borderBottomColorValue
                    } else {
                      const propValue = getValueOfTriProp(borderBottomPropValue, 'color')
                      if (propValue) BORDER_BOTTOM_VALUES[2] = propValue
                    }
                  } else {
                    BORDER_BOTTOM_VALUES[0] = '0'
                    BORDER_BOTTOM_VALUES[1] = ''
                    BORDER_BOTTOM_VALUES[2] = ''
                  }
                }

                if (
                  BORDER_BOTTOM_VALUES[0] === '' &&
                  BORDER_BOTTOM_VALUES[1] === '' &&
                  BORDER_BOTTOM_VALUES[2] === ''
                ) {
                  // !!!
                } else {
                  borderBottomProps = [...DEFAULT_BORDER_BOTTOM_PROPS]
                  borderBottomValues = BORDER_BOTTOM_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = borderBottomValues.some((borderBottom) => /(!important)/g.test(borderBottom))

                borderBottomValues = borderBottomValues.map((borderBottom) => borderBottom.replace(/(!important)/g, ''))

                if (hasImportant) {
                  borderBottomValues[borderBottomValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                borderBottomValues = borderBottomValues.filter(Boolean)

                // add declaration
                const borderBottomRuleIndex = declarations.findIndex(filterForBorderBottom)

                declarations.splice(borderBottomRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-bottom',
                  value: borderBottomValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noBorderBottomsShortened += 1

                let borderBottomIndex

                borderBottomIndex = declarations.findIndex(({ property }) => property === 'border-bottom-width')
                if (borderBottomIndex !== -1) {
                  declarations.splice(borderBottomIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderBottomIndex = declarations.findIndex(({ property }) => property === 'border-bottom-style')
                if (borderBottomIndex !== -1) {
                  declarations.splice(borderBottomIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderBottomIndex = declarations.findIndex(({ property }) => property === 'border-bottom-color')
                if (borderBottomIndex !== -1) {
                  declarations.splice(borderBottomIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderBottoms
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'border-bottom').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('border-bottom')
                    const now = properties.indexOf('border-bottom', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit
            }
          } // end of borderBottom

          // borderLeft
          if (SHORTEN || SHORTEN_BORDER_LEFT) {
            const borderLeft = rules[i].declarations.filter(filterForBorderLeft)
            let borderLeftProps = borderLeft.map(toProperty)
            if (
              (
                borderLeftProps.includes('border-left-width') ||
                borderLeftProps.includes('border-left-style') ||
                borderLeftProps.includes('border-left-color')
              ) ||
              borderLeftProps.includes('border-left')
            ) {
              if (OPTIONS.verbose) { console.log(success('Process - Values - Border Left : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }

              const borderLeftHasInherit = borderLeft.some(hasInherit)
              if (!borderLeftHasInherit) {
                let borderLeftValues = borderLeft.map(toValue)

                const borderLeftWidthIndex = borderLeftProps.indexOf('border-left-width')
                const borderLeftStyleIndex = borderLeftProps.indexOf('border-left-style')
                const borderLeftColorIndex = borderLeftProps.indexOf('border-left-color')
                const borderLeftWidthValue = borderLeftValues[borderLeftWidthIndex] ?? ''
                const borderLeftStyleValue = borderLeftValues[borderLeftStyleIndex] ?? ''
                const borderLeftColorValue = borderLeftValues[borderLeftColorIndex] ?? ''

                const BORDER_LEFT_VALUES = [
                  borderLeftWidthValue,
                  borderLeftStyleValue,
                  borderLeftColorValue
                ]

                // existing borderLeft check
                const borderLeftPropValueIndex = borderLeftProps.indexOf('border-left')
                if (borderLeftPropValueIndex !== -1) {
                  const borderLeftPropValue = borderLeftValues[borderLeftPropValueIndex]

                  if (borderLeftPropValue !== 'none') {
                    if (borderLeftWidthIndex > borderLeftPropValueIndex) {
                      BORDER_LEFT_VALUES[0] = borderLeftWidthValue
                    } else {
                      const propValue = getValueOfTriProp(borderLeftPropValue, 'width')
                      if (propValue) BORDER_LEFT_VALUES[0] = propValue
                    }

                    if (borderLeftStyleIndex > borderLeftPropValueIndex) {
                      BORDER_LEFT_VALUES[1] = borderLeftStyleValue
                    } else {
                      const propValue = getValueOfTriProp(borderLeftPropValue, 'style')
                      if (propValue) BORDER_LEFT_VALUES[1] = propValue
                    }

                    if (borderLeftColorIndex > borderLeftPropValueIndex) {
                      BORDER_LEFT_VALUES[2] = borderLeftColorValue
                    } else {
                      const propValue = getValueOfTriProp(borderLeftPropValue, 'color')
                      if (propValue) BORDER_LEFT_VALUES[2] = propValue
                    }
                  } else {
                    BORDER_LEFT_VALUES[0] = '0'
                    BORDER_LEFT_VALUES[1] = ''
                    BORDER_LEFT_VALUES[2] = ''
                  }
                }

                if (
                  BORDER_LEFT_VALUES[0] === '' &&
                  BORDER_LEFT_VALUES[1] === '' &&
                  BORDER_LEFT_VALUES[2] === ''
                ) {
                  // !!!
                } else {
                  borderLeftProps = [...DEFAULT_BORDER_LEFT_PROPS]
                  borderLeftValues = BORDER_LEFT_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = borderLeftValues.some((borderLeft) => /(!important)/g.test(borderLeft))

                borderLeftValues = borderLeftValues.map((borderLeft) => borderLeft.replace(/(!important)/g, ''))

                if (hasImportant) {
                  borderLeftValues[borderLeftValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                borderLeftValues = borderLeftValues.filter(Boolean)

                // add declaration
                const borderLeftRuleIndex = declarations.findIndex(filterForBorderLeft)

                declarations.splice(borderLeftRuleIndex, 0, {
                  type: 'declaration',
                  property: 'border-left',
                  value: borderLeftValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noBorderLeftsShortened += 1

                let borderLeftIndex

                borderLeftIndex = declarations.findIndex(({ property }) => property === 'border-left-width')
                if (borderLeftIndex !== -1) {
                  declarations.splice(borderLeftIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderLeftIndex = declarations.findIndex(({ property }) => property === 'border-left-style')
                if (borderLeftIndex !== -1) {
                  declarations.splice(borderLeftIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderLeftIndex = declarations.findIndex(({ property }) => property === 'border-left-color')
                if (borderLeftIndex !== -1) {
                  declarations.splice(borderLeftIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderLefts
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'border-left').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
                    const was = properties.indexOf('border-left')
                    const now = properties.indexOf('border-left', (was + 1))
                    declarations.splice(now, 1)
                    DECLARATION_COUNT -= 1
                  }
                }
              } // end of inherit check
            }
          } // end of borderLeft

          // border
          if (SHORTEN || SHORTEN_BORDER) {
            {
              const border = rules[i].declarations.filter(filterForBorderTopRightBottomLeft)
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

                  const borderTopRightBottomLeftWidthIndex = borderTopRightBottomLeftProps.indexOf('border-width')
                  const borderTopRightBottomLeftStyleIndex = borderTopRightBottomLeftProps.indexOf('border-style')
                  const borderTopRightBottomLeftColorIndex = borderTopRightBottomLeftProps.indexOf('border-color')
                  const borderTopRightBottomLeftWidthValue = borderTopRightBottomLeftValues[borderTopRightBottomLeftWidthIndex] ?? ''
                  const borderTopRightBottomLeftStyleValue = borderTopRightBottomLeftValues[borderTopRightBottomLeftStyleIndex] ?? ''
                  const borderTopRightBottomLeftColorValue = borderTopRightBottomLeftValues[borderTopRightBottomLeftColorIndex] ?? ''

                  const BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES = [
                    borderTopRightBottomLeftWidthValue,
                    borderTopRightBottomLeftStyleValue,
                    borderTopRightBottomLeftColorValue
                  ]

                  if (
                    borderTopRightBottomLeftValues[0] === borderTopRightBottomLeftValues[1] &&
                    borderTopRightBottomLeftValues[0] === borderTopRightBottomLeftValues[2] &&
                    borderTopRightBottomLeftValues[0] === borderTopRightBottomLeftValues[3]
                  ) {
                    const borderPropValue = borderTopRightBottomLeftValues[0]

                    if (borderTopRightBottomLeftWidthIndex === -1) {
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[0] = getValueOfTriProp(borderPropValue, 'width')
                    } else {
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[0] = borderTopRightBottomLeftWidthValue
                    }

                    if (borderTopRightBottomLeftStyleIndex === -1) {
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[1] = getValueOfTriProp(borderPropValue, 'style')
                    } else {
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[1] = borderTopRightBottomLeftStyleValue
                    }

                    if (borderTopRightBottomLeftColorIndex === -1) {
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[2] = getValueOfTriProp(borderPropValue, 'color')
                    } else {
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[2] = borderTopRightBottomLeftColorValue
                    }

                    if (
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[0] === '' &&
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[1] === '' &&
                      BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES[2] === ''
                    ) {
                      // !!!
                    } else {
                      borderTopRightBottomLeftProps = [...DEFAULT_BORDER_PROPS]
                      borderTopRightBottomLeftValues = BORDER_TOP_RIGHT_BOTTOM_LEFT_VALUES
                    }

                    const declarations = rules[i].declarations

                    // check for !important
                    const hasImportant = borderTopRightBottomLeftValues.some((borderTopRightBottomLeft) => /(!important)/g.test(borderTopRightBottomLeft))

                    borderTopRightBottomLeftValues = borderTopRightBottomLeftValues.map((borderTopRightBottomLeft) => borderTopRightBottomLeft.replace(/(!important)/g, ''))

                    if (hasImportant) {
                      borderTopRightBottomLeftValues[borderTopRightBottomLeftValues.length - 1] += ' !important'
                    }

                    // remove any spaces from empty values
                    borderTopRightBottomLeftValues = borderTopRightBottomLeftValues.filter(Boolean)

                    // add declaration
                    const borderTopRightBottomLeftRuleValueIndex = declarations.findIndex(filterForBorderTopRightBottomLeft)

                    declarations.splice(borderTopRightBottomLeftRuleValueIndex, 0, {
                      type: 'declaration',
                      property: 'border',
                      value: borderTopRightBottomLeftValues.join(' ')
                    })

                    DECLARATION_COUNT += 1
                    SUMMARY.stats.summary.noBorderTopRightBottomLeftsShortened += 1

                    let borderTopRightBottomLeftIndex

                    borderTopRightBottomLeftIndex = declarations.findIndex(({ property }) => property === 'border-top')
                    if (borderTopRightBottomLeftIndex !== -1) {
                      declarations.splice(borderTopRightBottomLeftIndex, 1)
                      DECLARATION_COUNT -= 1
                    }

                    borderTopRightBottomLeftIndex = declarations.findIndex(({ property }) => property === 'border-right')
                    if (borderTopRightBottomLeftIndex !== -1) {
                      declarations.splice(borderTopRightBottomLeftIndex, 1)
                      DECLARATION_COUNT -= 1
                    }

                    borderTopRightBottomLeftIndex = declarations.findIndex(({ property }) => property === 'border-bottom')
                    if (borderTopRightBottomLeftIndex !== -1) {
                      declarations.splice(borderTopRightBottomLeftIndex, 1)
                      DECLARATION_COUNT -= 1
                    }

                    borderTopRightBottomLeftIndex = declarations.findIndex(({ property }) => property === 'border-left')
                    if (borderTopRightBottomLeftIndex !== -1) {
                      declarations.splice(borderTopRightBottomLeftIndex, 1)
                      DECLARATION_COUNT -= 1
                    }
                  }
                } // end of inherit check
              } // end of combining
            }

            {
              const border = rules[i].declarations.filter(filterForBorder)
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
                  borderValues[borderProps.indexOf('border-color')].split(' ').length === 1 && // multi-color (border around squares, etc.) check - only do if single
                  borderValues[borderProps.indexOf('border-width')].split(' ').length === 1 // multi-width values not allowed
                ) {
                  const borderWidthIndex = borderProps.indexOf('border-width')
                  const borderStyleIndex = borderProps.indexOf('border-style')
                  const borderColorIndex = borderProps.indexOf('border-color')
                  const borderWidthValue = borderValues[borderWidthIndex] ?? ''
                  const borderStyleValue = borderValues[borderStyleIndex] ?? ''
                  const borderColorValue = borderValues[borderColorIndex] ?? ''

                  const BORDER_VALUES = [
                    borderWidthValue,
                    borderStyleValue,
                    borderColorValue
                  ]

                  // existing border check
                  const borderPropValueIndex = borderProps.indexOf('border')
                  if (borderPropValueIndex !== -1) {
                    const borderPropValue = borderValues[borderPropValueIndex]

                    if (borderPropValue !== 'none') {
                      // fill missing attribute with existing border
                      if (borderWidthIndex > borderPropValueIndex) {
                        BORDER_VALUES[0] = borderWidthValue
                      } else {
                        const propValue = getValueOfTriProp(borderPropValue, 'width')
                        if (propValue) BORDER_VALUES[0] = propValue
                      }

                      if (borderProps.indexOf('border-style') > borderPropValueIndex) {
                        BORDER_VALUES[1] = borderStyleValue
                      } else {
                        const propValue = getValueOfTriProp(borderPropValue, 'style')
                        if (propValue) BORDER_VALUES[1] = propValue
                      }

                      if (borderColorIndex > borderPropValueIndex) {
                        BORDER_VALUES[2] = borderColorValue
                      } else {
                        const propValue = getValueOfTriProp(borderPropValue, 'color')
                        if (propValue) BORDER_VALUES[2] = propValue
                      }
                    } else {
                      BORDER_VALUES[0] = '0'
                      BORDER_VALUES[1] = ''
                      BORDER_VALUES[2] = ''
                    }
                  }

                  if (
                    BORDER_VALUES[0] === '' &&
                    BORDER_VALUES[1] === '' &&
                    BORDER_VALUES[2] === ''
                  ) {
                    // !!!
                  } else {
                    borderProps = [...DEFAULT_BORDER_PROPS]
                    borderValues = BORDER_VALUES
                  }

                  const declarations = rules[i].declarations

                  // check for !important
                  const hasImportant = borderValues.some((border) => /(!important)/g.test(border))

                  borderValues = borderValues.map((border) => border.replace(/(!important)/g, ''))

                  if (hasImportant) {
                    borderValues[borderValues.length - 1] += ' !important'
                  }

                  // remove any spaces from empty values
                  borderValues = borderValues.filter(Boolean)

                  // add declaration
                  const borderRuleValueIndex = declarations.findIndex(filterForBorder)

                  declarations.splice(borderRuleValueIndex, 0, {
                    type: 'declaration',
                    property: 'border',
                    value: borderValues.join(' ')
                  })

                  DECLARATION_COUNT += 1
                  SUMMARY.stats.summary.noBordersShortened += 1

                  let borderIndex

                  borderIndex = declarations.findIndex(({ property }) => property === 'border-width')
                  if (borderIndex !== -1) {
                    declarations.splice(borderIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  borderIndex = declarations.findIndex(({ property }) => property === 'border-style')
                  if (borderIndex !== -1) {
                    declarations.splice(borderIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  borderIndex = declarations.findIndex(({ property }) => property === 'border-color')
                  if (borderIndex !== -1) {
                    declarations.splice(borderIndex, 1)
                    DECLARATION_COUNT -= 1
                  }

                  // remove existing borders
                  const properties = declarations.filter(toProperty).map(toProperty)
                  const j = properties.filter((property) => property === 'border').length
                  if (j > 1) {
                    for (let i = 1; i < j; ++i) {
                      const was = properties.indexOf('border')
                      const now = properties.indexOf('border', (was + 1))
                      declarations.splice(now, 1)
                      DECLARATION_COUNT -= 1
                    }
                  }
                } // end of inherit check
              }
            }
          } // end of border

          // borderRadius
          if (SHORTEN || SHORTEN_BORDER_RADIUS) {
            const borderRadius = rules[i].declarations.filter(filterForBorderRadius)
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

                let borderTopLeftRadiusIndex = borderRadiusProps.indexOf('border-top-left-radius')
                let borderTopRightRadiusIndex = borderRadiusProps.indexOf('border-top-right-radius')
                let borderBottomLeftRadiusIndex = borderRadiusProps.indexOf('border-bottom-left-radius')
                let borderBottomRightRadiusIndex = borderRadiusProps.indexOf('border-bottom-right-radius')
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

                // existing borderRadius check
                const borderRadiusPropValueIndex = borderRadiusProps.indexOf('border-radius')
                if (borderRadiusPropValueIndex !== -1) {
                  const borderRadiusPropValue = borderRadiusValues[borderRadiusPropValueIndex]

                  if (borderTopLeftRadiusIndex > borderRadiusPropValueIndex) {
                    BORDER_RADIUS_VALUES[0] = borderTopLeftRadiusValue
                  } else {
                    const propValue = getValueOfSquareProp(borderRadiusPropValue, 'top')
                    if (propValue) BORDER_RADIUS_VALUES[0] = propValue
                  }

                  if (borderRadiusProps.indexOf('border-top-right-radius') > borderRadiusPropValueIndex) {
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

                borderRadiusProps = [...DEFAULT_BORDER_RADIUS_PROPS]
                borderRadiusValues = BORDER_RADIUS_VALUES

                // check for requirements
                borderTopLeftRadiusIndex = borderRadiusProps.indexOf('border-top-left-radius')
                borderTopRightRadiusIndex = borderRadiusProps.indexOf('border-top-right-radius')
                borderBottomLeftRadiusIndex = borderRadiusProps.indexOf('border-bottom-left-radius')
                borderBottomRightRadiusIndex = borderRadiusProps.indexOf('border-bottom-right-radius')

                if (
                  borderTopLeftRadiusIndex !== -1 &&
                  borderBottomLeftRadiusIndex !== -1 &&
                  borderBottomRightRadiusIndex !== -1 &&
                  borderTopRightRadiusIndex !== -1
                ) {
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
                    borderRadiusProps = ['border-radius']
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
                      borderRadiusProps.splice(borderTopLeftRadiusIndex, 1)
                      borderRadiusProps.splice(borderBottomLeftRadiusIndex - 1, 1)
                      // add TopBottom property - for alignment sake
                      borderRadiusProps.splice(0, 0, 'border-radius-top-bottom')

                      // remove Top Right + Bottom Right values
                      borderRadiusValues.splice(borderTopRightRadiusIndex, 1)
                      borderRadiusValues.splice(borderBottomRightRadiusIndex - 2, 1)
                      // use Top Right as Right Left value
                      borderRadiusValues.splice(1, 0, borderTopRightRadiusValue)

                      // remove Top Right + Bottom Right properties
                      borderRadiusProps.splice(borderTopRightRadiusIndex, 1)
                      borderRadiusProps.splice(borderBottomRightRadiusIndex - 2, 1)
                      // add RightLeft property - for alignment sake
                      borderRadiusProps.splice(1, 0, 'border-radius-right-left')
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
                        borderRadiusProps.splice(borderTopRightRadiusIndex, 1)
                        borderRadiusProps.splice(borderBottomRightRadiusIndex - 1, 1)
                        // add LeftRight property - for alignment sake
                        borderRadiusProps.splice(1, 0, 'border-radius-left-right')
                      }
                    }
                  }
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = borderRadiusValues.some((borderRadius) => /(!important)/g.test(borderRadius))

                borderRadiusValues = borderRadiusValues.map((borderRadius) => borderRadius.replace(/(!important)/g, ''))

                if (hasImportant) {
                  borderRadiusValues[borderRadiusValues.length - 1] += ' !important'
                }

                // remove any spaces from empty values
                borderRadiusValues = borderRadiusValues.filter(Boolean)

                // add declaration
                const borderRadiusRuleValueIndex = declarations.findIndex(filterForBorderRadius)

                declarations.splice(borderRadiusRuleValueIndex, 0, {
                  type: 'declaration',
                  property: 'border-radius',
                  value: borderRadiusValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noPaddingsShortened += 1

                let borderRadiusIndex

                // remove originals
                borderRadiusIndex = declarations.findIndex(({ property }) => property === 'border-top-left-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRadiusIndex = declarations.findIndex(({ property }) => property === 'border-top-right-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRadiusIndex = declarations.findIndex(({ property }) => property === 'border-bottom-left-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                borderRadiusIndex = declarations.findIndex(({ property }) => property === 'border-bottom-right-radius')
                if (borderRadiusIndex !== -1) {
                  declarations.splice(borderRadiusIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing borderRadiuss
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'border-radius').length
                if (j > 1) {
                  for (let i = 1; i < j; ++i) {
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
            const margin = rules[i].declarations.filter(filterForMargin)
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

                let marginTopIndex = marginProps.indexOf('margin-top')
                let marginRightIndex = marginProps.indexOf('margin-right')
                let marginBottomIndex = marginProps.indexOf('margin-bottom')
                let marginLeftIndex = marginProps.indexOf('margin-left')
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
                const marginPropValueIndex = marginProps.indexOf('margin')
                if (marginPropValueIndex !== -1) {
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
                  MARGIN_VALUES[0] === '' &&
                  MARGIN_VALUES[1] === '' &&
                  MARGIN_VALUES[2] === '' &&
                  MARGIN_VALUES[3] === ''
                ) {
                  //
                } else {
                  marginProps = [...DEFAULT_MARGIN_PROPS]
                  marginValues = MARGIN_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = marginValues.some((margin) => /(!important)/g.test(margin))

                marginValues = marginValues.map((margin) => margin.replace(/(!important)/g, ''))

                if (hasImportant) {
                  marginValues[marginValues.length - 1] += ' !important'
                }

                // check for requirements
                marginTopIndex = marginProps.indexOf('margin-top')
                marginRightIndex = marginProps.indexOf('margin-right')
                marginBottomIndex = marginProps.indexOf('margin-bottom')
                marginLeftIndex = marginProps.indexOf('margin-left')

                if (
                  marginTopIndex !== -1 &&
                  marginBottomIndex !== -1 &&
                  marginLeftIndex !== -1 &&
                  marginRightIndex !== -1
                ) {
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
                      marginRightValue == marginLeftValue
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

                // remove any spaces from empty values
                marginValues = marginValues.filter(Boolean)

                // add declaration
                const marginRuleIndex = declarations.findIndex(filterForMargin)

                declarations.splice(marginRuleIndex, 0, {
                  type: 'declaration',
                  property: 'margin',
                  value: marginValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noMarginsShortened += 1

                let marginIndex

                // remove originals
                marginIndex = declarations.findIndex(({ property }) => property === 'margin-top')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                marginIndex = declarations.findIndex(({ property }) => property === 'margin-right')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                marginIndex = declarations.findIndex(({ property }) => property === 'margin-bottom')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                marginIndex = declarations.findIndex(({ property }) => property === 'margin-left')
                if (marginIndex !== -1) {
                  declarations.splice(marginIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing margins
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'margin').length
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
            const padding = rules[i].declarations.filter(filterForPadding)
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

                let paddingTopIndex = paddingProps.indexOf('padding-top')
                let paddingRightIndex = paddingProps.indexOf('padding-right')
                let paddingBottomIndex = paddingProps.indexOf('padding-bottom')
                let paddingLeftIndex = paddingProps.indexOf('padding-left')
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
                const paddingPropValueIndex = paddingProps.indexOf('padding')
                if (paddingPropValueIndex !== -1) {
                  const paddingPropValue = paddingValues[paddingPropValueIndex]

                  // fill missing attribute with existing padding
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

                if (
                  PADDING_VALUES[0] === '' &&
                  PADDING_VALUES[1] === '' &&
                  PADDING_VALUES[2] === '' &&
                  PADDING_VALUES[3] === ''
                ) {
                  //
                } else {
                  paddingProps = [...DEFAULT_PADDING_PROPS]
                  paddingValues = PADDING_VALUES
                }

                const declarations = rules[i].declarations

                // check for !important
                const hasImportant = paddingValues.some((padding) => /(!important)/g.test(padding))

                paddingValues = paddingValues.map((padding) => padding.replace(/(!important)/g, ''))

                if (hasImportant) {
                  paddingValues[paddingValues.length - 1] += ' !important'
                }

                // check for requirements
                paddingTopIndex = paddingProps.indexOf('padding-top')
                paddingRightIndex = paddingProps.indexOf('padding-right')
                paddingBottomIndex = paddingProps.indexOf('padding-bottom')
                paddingLeftIndex = paddingProps.indexOf('padding-left')

                if (
                  paddingTopIndex !== -1 &&
                  paddingBottomIndex !== -1 &&
                  paddingLeftIndex !== -1 &&
                  paddingRightIndex !== -1
                ) {
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
                    paddingProps = ['padding']
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
                      paddingProps.splice(paddingTopIndex, 1)
                      paddingProps.splice(paddingBottomIndex - 1, 1)
                      // add TopBottom property - for alignment sake
                      paddingProps.splice(0, 0, 'paddingTopBottom')

                      // remove Right + Left values
                      paddingValues.splice(paddingRightIndex, 1)
                      paddingValues.splice(paddingLeftIndex - 2, 1)
                      // use Right as RightLeft value
                      paddingValues.splice(1, 0, paddingRightValue)

                      // remove Right + Left properties
                      paddingProps.splice(paddingRightIndex, 1)
                      paddingProps.splice(paddingLeftIndex - 2, 1)
                      // add RightLeft property - for alignment sake
                      paddingProps.splice(1, 0, 'paddingRightLeft')
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
                        paddingProps.splice(paddingRightIndex, 1)
                        paddingProps.splice(paddingLeftIndex - 1, 1)
                        // add LeftRight property - for alignment sake
                        paddingProps.splice(1, 0, 'paddingLeftRight')
                      }
                    }
                  }
                }

                // remove any spaces from empty values
                paddingValues = paddingValues.filter(Boolean)

                // add declaration
                const paddingRuleIndex = declarations.findIndex(filterForPadding)

                declarations.splice(paddingRuleIndex, 0, {
                  type: 'declaration',
                  property: 'padding',
                  value: paddingValues.join(' ')
                })

                DECLARATION_COUNT += 1
                SUMMARY.stats.summary.noPaddingsShortened += 1

                let paddingIndex

                // remove originals
                paddingIndex = declarations.findIndex(({ property }) => property === 'padding-top')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                paddingIndex = declarations.findIndex(({ property }) => property === 'padding-right')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                paddingIndex = declarations.findIndex(({ property }) => property === 'padding-bottom')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                paddingIndex = declarations.findIndex(({ property }) => property === 'padding-left')
                if (paddingIndex !== -1) {
                  declarations.splice(paddingIndex, 1)
                  DECLARATION_COUNT -= 1
                }

                // remove existing paddings
                const properties = declarations.filter(toProperty).map(toProperty)
                const j = properties.filter((property) => property === 'padding').length
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
                OPTIONS.zero_ignore_declaration.indexOf(rules[i].declarations[l].property) === -1) {
                let value = rules[i].declarations[l].value

                if (value !== undefined) {
                  // leading zeros 000
                  if (value.match(/[^#]\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm)) {
                    value = value.replace(/\b0+[^1-9a-zA-Z.,;%()\[\]\s\/\\!]/gm, '') // remove single duplicate 0

                    SUMMARY.stats.summary.noZerosShortened += 1

                    if (OPTIONS.verbose) { console.log(success('Process - Values - Zero : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }
                  }

                  // 0px, 0em, etc.
                  if (value.charAt(0) === '0' &&
                    (OPTIONS.zero_units.includes(value.substr(1, value.length)))) {
                    value = 0

                    if (OPTIONS.verbose) { console.log(success('Process - Values - Zero : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : ''))) }
                    SUMMARY.stats.summary.noZerosShortened += 1
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
                  rules[i].declarations[l].property === 'color' ||
                  rules[i].declarations[l].property === 'font' ||
                  rules[i].declarations[l].property === 'font-color' ||
                  rules[i].declarations[l].property === 'background' ||
                  rules[i].declarations[l].property === 'background-color' ||
                  rules[i].declarations[l].property === 'outline-color' ||
                  rules[i].declarations[l].property === 'box-shadow' ||
                  rules[i].declarations[l].property === 'text-shadow' ||
                  rules[i].declarations[l].property === 'border-color' ||
                  rules[i].declarations[l].property === 'border-top-color' ||
                  rules[i].declarations[l].property === 'border-right-color' ||
                  rules[i].declarations[l].property === 'border-bottom-color' ||
                  rules[i].declarations[l].property === 'border-left-color' ||
                  rules[i].declarations[l].property === 'border' ||
                  rules[i].declarations[l].property === 'border-top' ||
                  rules[i].declarations[l].property === 'border-right' ||
                  rules[i].declarations[l].property === 'border-bottom' ||
                  rules[i].declarations[l].property === 'border-left'
                )) {
                let value = rules[i].declarations[l].value

                if (value && !value.includes('Microsoft')) {
                  value = processColor(value, rules[i].declarations[l], rules[i], OPTIONS, SUMMARY)
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
          let hierarchy = []
          let hierachyKeys = []
          let hierachyLength = 0
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

                  for (let k = 0; k < classLineage.length; k++) { // depth of hierarchy
                    if (k > 0) {
                      lineageLabel = ''

                      for (let l = k; l > 0; l--) {
                        lineageLabel += classLineage[k - l] + ' '
                      }
                      lineageLabel += classLineage[k]

                      if (hierarchy[lineageLabel] === undefined) {
                        hierarchy[lineageLabel] = 0
                      }

                      hierarchy[lineageLabel] += 1
                    } else {
                      if (hierarchy[classLineage[k]] === undefined) {
                        hierarchy[classLineage[k]] = 0
                      }

                      hierarchy[classLineage[k]] += 1
                    }
                  } // end of for
                } // end of if
              } // end of for
            }
          }

          function sortHierarchy (obj) {
            const keys = Object.keys(obj)
            keys.sort(function (a, b) { return b.length - a.length })
            hierarchy = []
            for (let i = 0; i < keys.length; i++) {
              hierarchy[keys[i]] = obj[keys[i]]

              Object.keys(directParents).forEach(function (key, index, val) {
                if (this[key].length > 1) {
                  for (let j = 0; j < this[key].length; j++) {
                    if (keys[i] === this[key][j].selector) {
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
            return hierarchy
          }

          sortHierarchy(hierarchy)

          hierachyKeys = Object.keys(hierarchy)
          hierachyLength = hierachyKeys.length

          selectedHierarchyLevel = 0
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
            if (this[val].count === directParents[this[val].commonParent].length) {
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
              if (commonParentsKeys[i] !== undefined && commonParentsKeys[i].selector === key) {
                if (rules[commonParentsKeys[i].index] !== undefined && rules[commonParentsKeys[i].index].declarations !== undefined) {
                  // clone declarations
                  tmpDeclarations = rules[commonParentsKeys[i].index].declarations.slice(0) // clone
                  DECLARATION_COUNT = tmpDeclarations.length

                  for (let j = 0; j < this[key].declarations.length; j++) { // each parent declaration
                    // remove declarations
                    for (let k = 0; k < DECLARATION_COUNT; k++) { // each child declaration
                      if (this[key].declarations[j] !== undefined &&
                        this[key].declarations[j].type === 'declaration' &&
                        this[key].declarations[j].property === tmpDeclarations[k].property &&
                        this[key].declarations[j].value === tmpDeclarations[k].value) {
                        tmpDeclarations.splice(k, 1)
                        k -= 1
                        DECLARATION_COUNT -= 1
                      }
                    } // end of k loop
                  } // end of j loop

                  if (tmpDeclarations.length === 0) {
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
          hierarchy = []
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
              if (rules[i].declarations[j].value === '') {
                SUMMARY.empty_declarations.push({
                  selectors: rules[i].selectors,
                  property: rules[i].declarations[j]
                })
              }

              // remove comments in declarations - for turning off comments
              if (OPTIONS.trim_comments || OPTIONS.trim) {
                if (declarations[j] !== undefined && declarations[j].type === 'comment') {
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
            if (rules[i] !== undefined && rules[i].type === 'comment') {
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
              // && rules[i].type === 'rule'
              rules[i].selectors !== undefined &&
              rules[j] !== undefined && rules[j].selectors !== undefined) {
              // duplicate rule found
              if (rules[i].selectors.toString() === rules[j].selectors.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(success('Process - Rules - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

                // copy + reduce
                SUMMARY.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  SUMMARY.duplicate_rules.push({
                    selectors: (rules[i].type === 'page') ? '@page' : rules[i].selectors,
                    position: rules[i].position
                  })
                  rules[j].declarations = rules[j].declarations.concat(rules[i].declarations)
                  rules.splice(i, 1)
                } else {
                  SUMMARY.duplicate_rules.push({
                    selectors: (rules[j].type === 'page') ? '@page' : rules[j].selectors,
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
            if (rules[i] !== undefined && rules[i].type === 'media' &&
              rules[i].media !== undefined &&
              rules[j] !== undefined && rules[j].media !== undefined &&
              OPTIONS.bypass_media_rules !== true) {
              // duplicate rule found
              if (rules[i].media.toString() === rules[j].media.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(info('Process - Rules - @media - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

                // copy + reduce
                SUMMARY.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  SUMMARY.duplicate_rules.push({
                    selectors: '@media ' + rules[i].media,
                    position: rules[i].position
                  })
                  rules[j].rules = rules[j].rules.concat(rules[i].rules)
                  rules.splice(i, 1)
                } else {
                  SUMMARY.duplicate_rules.push({
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
            if (rules[i] !== undefined && rules[i].type === 'document' &&
              rules[i].document !== undefined &&
              rules[j] !== undefined && rules[j].document !== undefined) {
              // duplicate rule found
              if (rules[i].document.toString() === rules[j].document.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(success('Process - Rules - @document - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

                // copy + reduce
                SUMMARY.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  SUMMARY.duplicate_rules.push({
                    selectors: '@document ' + rules[i].document,
                    position: rules[i].position
                  })
                  rules[j].rules = rules[j].rules.concat(rules[i].rules)
                  rules.splice(i, 1)
                } else {
                  SUMMARY.duplicate_rules.push({
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
            if (rules[i] !== undefined && rules[i].type === 'supports' &&
              rules[i].supports !== undefined &&
              rules[j] !== undefined && rules[j].supports !== undefined) {
              // duplicate rule found
              if (rules[i].supports.toString() === rules[j].supports.toString()) {
                // remove previous comment in root
                if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                  if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
                    rules.splice(i - 1, 1)
                    i -= 1
                    j -= 1
                    RULES_COUNT -= 1
                  }
                }

                if (OPTIONS.verbose) { console.log(success('Process - Rules - @supports - Group Duplicate Rule : ' + (rules[j].supports ? rules[j].supports : ''))) }

                // copy + reduce
                SUMMARY.stats.summary.noDuplicateRules += 1
                if (j < i && (j - i) > 1) { // check comparison distance
                  SUMMARY.duplicate_rules.push({
                    selectors: '@supports ' + rules[i].supports,
                    position: rules[i].position
                  })
                  rules[j].rules = rules[j].rules.concat(rules[i].rules)
                  rules.splice(i, 1)
                } else {
                  SUMMARY.duplicate_rules.push({
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
            (rules[i].type === 'rule' || (rules[i].type === 'page' && OPTIONS.bypass_page_rules === false))) {
            declarationsNameCounts = []

            DECLARATION_COUNT = rules[i].declarations.length

            // declarations duplicate check
            for (let l = 0; l < DECLARATION_COUNT; ++l) {
              if (rules[i].declarations[l].type === 'declaration') {
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
                    rules[i].declarations[l].type === 'declaration' &&
                    rules[i].declarations[l].property === key) {
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
              if (declarationsValueCounts[key].count > 1) {
                duplicateIds = declarationsValueCounts[key].id.split(',')

                amountRemoved = 1 // shift the ids by the amount removed

                for (let l = 0; l < duplicateIds.length - 1; ++l) { // -1 to leave last behind
                  // remove previous comment above declaration to be removed
                  if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                    if (rules[i].declarations[duplicateIds[l] - 1] !== undefined && rules[i].declarations[duplicateIds[l] - 1].type === 'comment') {
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

                  SUMMARY.duplicate_declarations.push(rules[i].declarations[duplicateIds[l]])
                  SUMMARY.stats.summary.noDuplicateDeclarations += 1
                  rules[i].declarations.splice(duplicateIds[l], 1)
                  DECLARATION_COUNT -= 1

                  // adjust removal ids by amount already removed
                  if (duplicateIds[l + 1] !== undefined) {
                    duplicateIds[l + 1] -= amountRemoved // shift the ids by the amount removed

                    // shift all the ids of the declarations afterwards
                    for (const key2 in declarationsValueCounts) {
                      if (declarationsValueCounts.hasOwnProperty(key2) && (key2 !== key)) {
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
            } // end of for in

            // end of reduce according to values
            for (let k = 0; k < declarationNamesCount; ++k) {
              // declarations reduction
              for (const key in declarationsNameCounts) {
                if (declarationsNameCounts[key] > 1) {
                  for (let l = 0; l < DECLARATION_COUNT; ++l) {
                    if (rules[i].declarations[l].type === 'declaration') {
                      if (rules[i].declarations[l].property === key &&
                        declarationsNameCounts[key] > 1 // leave behind 1
                      ) {
                        // reduce according to list
                        if (rules[i].declarations[l].property === declarationNames[k]) {
                          // console.log(declarationsNameCounts[key])
                          // console.log(key)
                          // console.log(rules[i].declarations[l].property)
                          // console.log(declarationNames[k])
                          // remove previous comment above declaration to be removed
                          if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                            if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type === 'comment') {
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
                            SUMMARY.duplicate_declarations.push(rules[i].declarations[l + 1])
                            SUMMARY.stats.summary.noDuplicateDeclarations += 1
                            rules[i].declarations.splice(l + 1, 1)
                          } else {
                            SUMMARY.duplicate_declarations.push(rules[i].declarations[l])
                            SUMMARY.stats.summary.noDuplicateDeclarations += 1
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
            } // end of reduce root declarations by property name
          } // end of rule check

          // reduce root declarations by selector
          selectorPropertiesList = []
          declarationsCounts = []

          for (let k = 0; k < selectorsCount; ++k) {
            if (rules[i] !== undefined &&
              rules[i].type === 'rule') {
              if (rules[i].selectors !== undefined && rules[i].selectors.toString() === selectors[k]) {
                DECLARATION_COUNT = rules[i].declarations.length

                // detect declarations duplicates
                for (let l = 0; l < DECLARATION_COUNT; ++l) {
                  if (rules[i].declarations[l].type === 'declaration') {
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
                        if (rules[i].declarations[l].type === 'declaration') {
                          selectorPropertiesList = selectorPropertyValues[selectors[k]]

                          if (selectorPropertiesList !== undefined) { // specific in selector
                            if (rules[i].declarations[l].property === key &&
                              (selectorPropertiesList.includes(rules[i].declarations[l].property)) &&
                              declarationsCounts[key] > 1) { // leave behind 1
                              // remove previous comment above declaration to be removed
                              if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                                if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type === 'comment') {
                                  rules[i].declarations.splice(l - 1, 1)
                                  l -= 1
                                  DECLARATION_COUNT -= 1
                                }
                              }

                              if (OPTIONS.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }
                              SUMMARY.duplicate_declarations.push(rules[i].declarations[l])
                              SUMMARY.stats.summary.noDuplicateDeclarations += 1
                              rules[i].declarations.splice(l, 1)
                              l -= 1
                              DECLARATION_COUNT -= 1
                              declarationsCounts[key] -= 1
                            }
                          } else { // all in selector
                            if (rules[i].declarations[l].property === key &&
                              declarationsCounts[key] > 1) { // leave behind 1
                              // remove previous comment above declaration to be removed
                              if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
                                if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type === 'comment') {
                                  rules[i].declarations.splice(l - 1, 1)
                                  l -= 1
                                  DECLARATION_COUNT -= 1
                                }
                              }

                              if (OPTIONS.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }
                              SUMMARY.duplicate_declarations.push(rules[i].declarations[l])
                              SUMMARY.stats.summary.noDuplicateDeclarations += 1
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
          if (rules[i] != undefined && rules[i].keyframes !== undefined && rules[i].keyframes.length === 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
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
          if (rules[i] !== undefined && rules[i].type === 'media' &&
            rules[i].rules.length === 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
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
          if (rules[i] !== undefined && rules[i].type === 'document' &&
            rules[i].rules.length === 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
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
          if (rules[i] !== undefined && rules[i].type === 'supports' &&
            rules[i].rules.length === 0) {
            // remove previous comment in root
            if (OPTIONS.trim_removed_rules_previous_comment || OPTIONS.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type === 'comment') {
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
                      if (selectors.indexOf(tmpSelectors[k]) === -1) {
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
                          if (selectors.indexOf(tmpSelectors[l]) === -1) {
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
      STATS.after.totalFileSizeKB = 0
      STATS.after.noNodes = 0
      STATS.after.noRules = 0
      STATS.after.noDeclarations = 0
      STATS.after.noComments = 0
      STATS.after.noCharset = 0
      STATS.after.noCustomMedia = 0
      STATS.after.noDocument = 0
      STATS.after.noFontFace = 0
      STATS.after.noHost = 0
      STATS.after.noImport = 0
      STATS.after.noKeyframes = 0
      STATS.after.noKeyframe = 0
      STATS.after.noMedia = 0
      STATS.after.noNamespace = 0
      STATS.after.noPage = 0
      STATS.after.noSupports = 0
      STATS.after.noNodes = rulesIn.length

      rulesIn
        .filter(Boolean)
        .forEach(getSummaryStatsFor(SUMMARY.stats.after))

      SUMMARY.stats.summary.noReductions.noRules = SUMMARY.stats.before.noRules - SUMMARY.stats.after.noRules
      SUMMARY.stats.summary.noReductions.noDeclarations = SUMMARY.stats.before.noDeclarations - SUMMARY.stats.after.noDeclarations
      SUMMARY.stats.summary.noReductions.noComments = SUMMARY.stats.before.noComments - SUMMARY.stats.after.noComments
      SUMMARY.stats.summary.noReductions.noCharset = SUMMARY.stats.before.noCharset - SUMMARY.stats.after.noCharset
      SUMMARY.stats.summary.noReductions.noCustomMedia = SUMMARY.stats.before.noCustomMedia - SUMMARY.stats.after.noCustomMedia
      SUMMARY.stats.summary.noReductions.noDocument = SUMMARY.stats.before.noDocument - SUMMARY.stats.after.noDocument
      SUMMARY.stats.summary.noReductions.noFontFace = SUMMARY.stats.before.noFontFace - SUMMARY.stats.after.noFontFace
      SUMMARY.stats.summary.noReductions.noHost = SUMMARY.stats.before.noHost - SUMMARY.stats.after.noHost
      SUMMARY.stats.summary.noReductions.noImport = SUMMARY.stats.before.noImport - SUMMARY.stats.after.noImport
      SUMMARY.stats.summary.noReductions.noKeyframes = SUMMARY.stats.before.noKeyframes - SUMMARY.stats.after.noKeyframes
      SUMMARY.stats.summary.noReductions.noKeyframe = SUMMARY.stats.before.noKeyframe - SUMMARY.stats.after.noKeyframe
      SUMMARY.stats.summary.noReductions.noMedia = SUMMARY.stats.before.noMedia - SUMMARY.stats.after.noMedia
      SUMMARY.stats.summary.noReductions.noNamespace = SUMMARY.stats.before.noNamespace - SUMMARY.stats.after.noNamespace
      SUMMARY.stats.summary.noReductions.noPage = SUMMARY.stats.before.noPage - SUMMARY.stats.after.noPage
      SUMMARY.stats.summary.noReductions.noSupports = SUMMARY.stats.before.noSupports - SUMMARY.stats.after.noSupports
      SUMMARY.stats.summary.noReductions.noNodes = SUMMARY.stats.before.noNodes - SUMMARY.stats.after.noNodes

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
            // console.log(SUMMARY.stats.after.noRules)
            const noOutputFilesNeeded = Math.ceil(SUMMARY.stats.after.noRules / 4095)
            // console.log(noOutputFilesNeeded)
            if (noOutputFilesNeeded === 1) {
              outputCSS = trim(outputCSS, OPTIONS, SUMMARY)
              outputCSS = hack(outputCSS, OPTIONS, SUMMARY, getTokens())
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
              let rulesGroupsLength = 0
              const rules = ast.stylesheet.rules
              const rulesLength = rules.length
              let ruleCount = 0
              let groupCount = 0

              for (let i = 0; i < rulesLength; ++i) {
                if (rulesGroups[groupCount] === undefined) {
                  rulesGroups[groupCount] = []
                }
                rulesGroups[groupCount].push(rules[i])
                ruleCount += 1

                if (ruleCount === 4095) {
                  groupCount += 1
                }
              }

              rulesGroupsLength = rulesGroups.length
              fileSizeKB = 0

              for (let i = 0; i < rulesGroupsLength; i++) {
                outputAST = {
                  type: 'stylesheet',
                  stylesheet: {
                    rules: rulesGroups[i]
                  }
                }
                outputCSS = cssTools.stringify(outputAST)

                outputCSS = trim(outputCSS, OPTIONS, SUMMARY)
                outputCSS = hack(outputCSS, OPTIONS, SUMMARY, getTokens())
                const outputFileName = OPTIONS.css_output.substr(0, OPTIONS.css_output.length - 4) + '_' + i + '.css'
                writeFileSync(outputFileName, outputCSS)

                fileSizeKB += getFileSizeInKB(outputFileName)
              }
            }
          } else {
            outputCSS = trim(outputCSS, OPTIONS, SUMMARY)
            outputCSS = hack(outputCSS, OPTIONS, SUMMARY, getTokens())
            if (OPTIONS.css_output === null || OPTIONS.css_output === undefined || OPTIONS.css_output === '') {
              const size = getSizeInKB(outputCSS)
              fileSizeKB = size / 1000
            } else {
              writeFileSync(OPTIONS.css_output, outputCSS)
              fileSizeKB = getFileSizeInKB(OPTIONS.css_output)
            }
          }
        } catch (e) {
          console.log(error('Output file error: Something went wrong while writing the file, check your folder permissions, default_options.json and please try again.'))
          console.log(e)
          process.exit(1)
        }
      } else {
        outputCSS = trim(outputCSS, OPTIONS, SUMMARY)
        outputCSS = hack(outputCSS, OPTIONS, SUMMARY, getTokens())
        fileSizeKB = getSizeInKB(outputCSS)
      }

      SUMMARY.stats.after.totalFileSizeKB += fileSizeKB
      SUMMARY.stats.summary.savingsKB = roundTo(SUMMARY.stats.before.totalFileSizeKB - SUMMARY.stats.after.totalFileSizeKB, 4)
      SUMMARY.stats.summary.savingsPercentage = roundTo(SUMMARY.stats.summary.savingsKB / SUMMARY.stats.before.totalFileSizeKB * 100, 2)

      // write report
      if (OPTIONS.generate_report) {
        try {
          writeFileSync(REPORT_DUPLICATE_CSS, JSON.stringify(SUMMARY, null, '\t'))
        } catch (e) {
          console.log(error('Report output file error: Something went wrong while writing the file, check your folder permissions, default_options.json and please try again.'))
          console.log(e)
          process.exit(1)
        }
      }

      if (OPTIONS.verbose) {
        console.log(cool('Before: ' + SUMMARY.stats.before.totalFileSizeKB + 'KB'))
        console.log(cool('After: ' + SUMMARY.stats.after.totalFileSizeKB + 'KB'))
        console.log(cool('Saved: ' + SUMMARY.stats.summary.savingsKB + 'KB (' + SUMMARY.stats.summary.savingsPercentage + '%)'))

        console.timeEnd(logoRed('Purged ' + date + ' in'))
      }

      if (OPTIONS.css_output === null || OPTIONS.css_output === undefined || OPTIONS.css_output === '') {
        return outputCSS
      }
    }

    function processCSS (cssDataIn = null, optionsIn = null, callback = () => {}) {
      function continueCSSProcess () {
        cssPurgeEventEmitter.removeListener('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END', continueCSSProcess)

        let cssData = dataCSSIn.join('')

        if (cssDataIn !== null && cssDataIn !== undefined) {
          cssData = cssDataIn

          fileSizeKB = getSizeInKB(cssDataIn)

          STATS.before.totalFileSizeKB += fileSizeKB
        }

        if (optionsIn !== null && optionsIn !== undefined) {
          for (const key in optionsIn) {
            OPTIONS[key] = optionsIn[key]
          }
        }

        if (OPTIONS.verbose) {
          date = (OPTIONS.css_output) ? OPTIONS.css_output : new Date()

          console.time(logoRed('Purged ' + date + ' in'))
        }

        if (OPTIONS.verbose) { console.log(info('Process - CSS')) }

        const {
          _3tokenValues,
          _4tokenValues,
          _5tokenValues,
          _6tokenValues,
          _7tokenValues,
          tokenComments
        } = getTokens()

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
          STATS.summary.noInlineCommentsTrimmed += 1

          if (OPTIONS.trim_keep_non_standard_inline_comments && OPTIONS.trim_comments !== true) {
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
        if (OPTIONS.trim_comments !== true) {
          cssData = cssData.replace(/[;]([^\n][\s]*?)\/\*([\s\S]*?)\*\//gm, (match) => {
            const i = Object.keys(tokenComments).length + 1
            const k = '_cssp_sc' + i
            tokenComments[k] = match
            return '; /*_cssp_sc' + i + '*/'
          })
        }
        // tokens - end of replace side comments

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

        const rules = ast.stylesheet.rules

        SUMMARY.stats = STATS

        STATS.before.noNodes = rules.length

        rules
          .filter(Boolean)
          .forEach(getSummaryStatsFor(SUMMARY.stats.before))

        if (OPTIONS.verbose) { console.log(info('Process - Rules - Base')) }

        processRules(rules)
        processRulesReset()

        let rulesLength = rules.length

        for (let g = 0; g < rulesLength; ++g) {
          if (rules[g] !== undefined) {
            // console.log(g, rulesLength)
            // @media rules
            if (rules[g] !== undefined &&
              rules[g].type === 'media'
              // && OPTIONS.bypass_media_rules === false
            ) {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - @media ' + (rules[g].media ? rules[g].media : ''))) }

              processRules(rules[g].rules)
              processRulesReset()
              processValues(rules[g].rules)
            }

            // @document rules
            if (rules[g] !== undefined &&
              rules[g].type === 'document' &&
              OPTIONS.bypass_document_rules === false) {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - @document ' + (rules[g].document ? rules[g].document : ''))) }

              processRules(rules[g].rules)
              processRulesReset()
              processValues(rules[g].rules)
            }

            // @supports rules
            if (rules[g] !== undefined &&
              rules[g].type === 'supports' &&
              OPTIONS.bypass_supports_rules === false) {
              if (OPTIONS.verbose) { console.log(info('Process - Rules - @supports ' + (rules[g].supports ? rules[g].supports : ''))) }

              processRules(rules[g].rules)
              processRulesReset()
              processValues(rules[g].rules)
            }

            /// /charset
            if (rules[g] !== undefined &&
              rules[g].type === 'charset' &&
              OPTIONS.bypass_charset === false) {
              if (OPTIONS.verbose) { console.log(info('Process - Charset')) }

              const charset1 = rules[g].charset
              let x = rules.length

              for (let h = g + 1; h < x; ++h) {
                const rule = rules[h]

                if (rule) {
                  const charset2 = rule.charset

                  if (charset1 === charset2) {
                    // remove charset
                    if (rule.type === 'charset') {
                      rules.splice(h, 1)
                      g -= 1
                      h -= 1
                      x -= 1
                      rulesLength -= 1

                      // remove side comment
                      const i = h + 1
                      const nextSiblingRule = rules[i]
                      if (nextSiblingRule) {
                        if (
                          nextSiblingRule.type === 'comment' &&
                          nextSiblingRule.comment.includes('_cssp_sc')
                        ) {
                          rules.splice(i, 1)
                          g -= 1
                          rulesLength -= 1
                        }
                      }
                    }
                  }
                }
              } // end of h

              if (!charset1.startsWith('"') || !charset1.endsWith('"')) {
                const rule = rules[g]
                if (rule) {
                  // remove charset
                  if (rule.type === 'charset') {
                    rules.splice(g, 1)
                    g -= 1
                    rulesLength -= 1

                    // remove side comment
                    const h = g + 1
                    const nextSiblingRule = rules[h]
                    if (nextSiblingRule) {
                      if (
                        nextSiblingRule.type === 'comment' &&
                        nextSiblingRule.comment.includes('_cssp_sc')
                      ) {
                        rules.splice(h, 1)
                        g -= 1
                        rulesLength -= 1
                      }
                    }
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
          const rulesLength = rules.length
          for (let i = 0; i < rulesLength; ++i) {
            if (rules[i] !== undefined &&
              rules[i].selectors !== undefined &&
              rules[i].selectors.toString().includes('html')) {
              hasHTML = true
              for (let j = 0; j < rules[i].declarations.length; ++j) {
                if (rules[i].declarations !== undefined) {
                  if (rules[i].declarations[j].property === 'font-size') {
                    htmlHasFontSize = true
                    break
                  }
                }
              }

              if (htmlHasFontSize === false) { // create font-size
                rules[i].declarations.unshift({
                  type: 'declaration',
                  property: 'font-size',
                  value: ((parseInt(OPTIONS.special_convert_rem_px) / parseInt(OPTIONS.special_convert_rem_default_px)) * 100) + '%'
                })
              }

              // move to top
              const value = rules[i]
              rules.splice(i, 1)
              rules.unshift(value)

              break
            }
          } // end of for

          if (hasHTML === false) { // create html with font-size
            rules.unshift({
              type: 'rule',
              selectors: ['html'],
              declarations: [{
                type: 'declaration',
                property: 'font-size',
                value: ((parseInt(OPTIONS.special_convert_rem_px) / parseInt(OPTIONS.special_convert_rem_default_px)) * 100) + '%'
              }]
            })
          }
        } // end of rems - html check

        processValues(rules)

        /// /charset first check
        if (!OPTIONS.bypass_charset) {
          if (rules.length >= 2) {
            const [
              RULE_ONE,
              RULE_TWO
            ] = rules

            if (
              RULE_ONE.type === 'comment' &&
              RULE_TWO.type === 'charset'
            ) {
              rules.splice(0, 1)
            }
          }
        }
        /// /end of charset first check

        // after
        STATS.after.noNodes = rules.length

        rules
          .filter(Boolean)
          .forEach(getSummaryStatsFor(SUMMARY.stats.after))

        SUMMARY.stats.summary.noReductions.noRules = SUMMARY.stats.before.noRules - SUMMARY.stats.after.noRules
        SUMMARY.stats.summary.noReductions.noDeclarations = SUMMARY.stats.before.noDeclarations - SUMMARY.stats.after.noDeclarations
        SUMMARY.stats.summary.noReductions.noComments = SUMMARY.stats.before.noComments - SUMMARY.stats.after.noComments
        SUMMARY.stats.summary.noReductions.noCharset = SUMMARY.stats.before.noCharset - SUMMARY.stats.after.noCharset
        SUMMARY.stats.summary.noReductions.noCustomMedia = SUMMARY.stats.before.noCustomMedia - SUMMARY.stats.after.noCustomMedia
        SUMMARY.stats.summary.noReductions.noDocument = SUMMARY.stats.before.noDocument - SUMMARY.stats.after.noDocument
        SUMMARY.stats.summary.noReductions.noFontFace = SUMMARY.stats.before.noFontFace - SUMMARY.stats.after.noFontFace
        SUMMARY.stats.summary.noReductions.noHost = SUMMARY.stats.before.noHost - SUMMARY.stats.after.noHost
        SUMMARY.stats.summary.noReductions.noImport = SUMMARY.stats.before.noImport - SUMMARY.stats.after.noImport
        SUMMARY.stats.summary.noReductions.noKeyframes = SUMMARY.stats.before.noKeyframes - SUMMARY.stats.after.noKeyframes
        SUMMARY.stats.summary.noReductions.noKeyframe = SUMMARY.stats.before.noKeyframe - SUMMARY.stats.after.noKeyframe
        SUMMARY.stats.summary.noReductions.noMedia = SUMMARY.stats.before.noMedia - SUMMARY.stats.after.noMedia
        SUMMARY.stats.summary.noReductions.noNamespace = SUMMARY.stats.before.noNamespace - SUMMARY.stats.after.noNamespace
        SUMMARY.stats.summary.noReductions.noPage = SUMMARY.stats.before.noPage - SUMMARY.stats.after.noPage
        SUMMARY.stats.summary.noReductions.noSupports = SUMMARY.stats.before.noSupports - SUMMARY.stats.after.noSupports
        SUMMARY.stats.summary.noReductions.noNodes = SUMMARY.stats.before.noNodes - SUMMARY.stats.after.noNodes

        // prepare output
        const outputAST = {
          type: 'stylesheet',
          stylesheet: {
            rules
          }
        }
        let outputCSS = cssTools.stringify(outputAST)

        // Detect via JS
        // Detect via HTML
        if (OPTIONS.special_reduce_with_html && (OPTIONS.html !== undefined && OPTIONS.html !== '')) {
          if (OPTIONS.verbose) { console.log(info('Process - HTML')) }

          const ast = cssTools.parse(outputCSS, { source: fileLocation })

          const rules = ast.stylesheet.rules

          let selectors = []

          rules
            .forEach((rule) => {
              if (rule) {
                switch (rule.type) {
                  case 'rule':
                    getSelectors(rule, selectors, OPTIONS.special_reduce_with_html_ignore_selectors)
                    break
                  case 'media':
                  case 'document':
                  case 'supports':
                    rule.rules
                      .forEach((rule) => {
                        getSelectors(rule, selectors, OPTIONS.special_reduce_with_html_ignore_selectors)
                      })

                    break
                  case 'charset':
                    break
                }
              }
            })

          // remove duplicates
          selectors = Array.from(new Set(selectors))

          // process selectors returned from processing HTML
          cssPurgeEventEmitter.on('HTML_RESULTS_END', (selectorsRemoved) => {
            SUMMARY.selectors_removed = selectorsRemoved

            outputCSS = processHTMLResults(rules, selectors)

            callback(null, completeOutput(outputCSS))
          })

          processHTML(selectors)
        } else { // end of special_reduce_with_html
          callback(null, completeOutput(outputCSS))
        } // end of special_reduce_with_html
      }

      cssPurgeEventEmitter.on('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END', continueCSSProcess) // end of event

      if (!cssDataIn) cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_REDUCE_PROPS_END')

      if (!hasReadReduceDeclarations && optionsIn !== null && !existsSync(OPTIONS.reduce_declarations_file_location)) {
        if (optionsIn !== null && (optionsIn.reduceDeclarations === undefined || optionsIn.reduceDeclarations === null)) {
          // default process settings
          const defaultReduceDeclarations = {
            declaration_names: [
              ...DEFAULT_DECLARATION_NAMES
            ]
          }

          optionsIn.reduceDeclarations = defaultReduceDeclarations

          readReduceDeclarations(defaultReduceDeclarations)
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
