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

import DEFAULT_DECLARATION_NAMES from './default-declaration-names.mjs'

import processValues from './process-values.mjs'

import trim from './css/trim.mjs'
import hack from './css/hack.mjs'

import hasHtml from './utils/selectors/has-html.mjs'

import filterForMedia from './utils/filter-for-media.mjs'
import filterForDocument from './utils/filter-for-document.mjs'
import filterForSupports from './utils/filter-for-supports.mjs'
import filterForComment from './utils/filter-for-comment.mjs'

import getTokens from './utils/get-tokens.mjs'
import getSelectors from './utils/get-selectors.mjs'
import getFilePath from './utils/get-file-path.mjs'
import getFileSizeInKB from './utils/get-file-size-in-kilo-bytes.mjs'
import getSizeInKB from './utils/get-size-in-kilo-bytes.mjs'
import roundTo from './utils/round-to.mjs'
import escape from './utils/escape.mjs'

const { JSDOM } = jsdom

const success = clc.greenBright
// const success2 = clc.green
const info = clc.xterm(123)
const error = clc.red
// const errorLine = clc.redBright
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
      collector.noComments = declarations.filter(filterForComment).length
    }

    switch (type) {
      case 'rule':
        collector.noRules += 1

        collector.noDeclarations += declarations.length
        break
      case 'comment':
        collector.noComments += 1
        break
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

function toGroups (rules) {
  const {
    groups
  } = rules.reduce(({ groups, count }, rule) => {
    const group = groups[count] ?? (groups[count] = [])

    group.push(rule)

    if (group.length === 2) count += 1

    return { groups, count }
  }, { groups: [], count: 0 })

  return groups
}

class CSSPurgeEmitter extends EventEmitter {}

class CSSPurge {
  constructor () {
    let date = new Date()

    const cssPurgeEventEmitter = new CSSPurgeEmitter()

    let DEFAULT_OPTIONS = {
      css: ['demo/test1.css'],

      reduce_common_into_parent: false,

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

      report: false,
      report_duplicate_css_file_location: 'default_options_report_duplicate_css.json',
      verbose: false,

      zero_units: 'em, ex, %, px, cm, mm, in, pt, pc, ch, rem, vh, vw, vmin, vmax',
      zero_ignore_declaration: ['filter'],
      reduce_declarations_file_location: 'default_options_reduce_declarations.json'
    }

    const DEFAULT_OPTIONS_FILE_LOCATION = 'default_options.json'

    let OPTIONS = {
      ...DEFAULT_OPTIONS
    }

    let OPTIONS_FILE_LOCATION

    const FILE_DATA = []
    let dataHTMLIn = []
    const dataJSIn = []

    let jsDom = null
    let jsDomWindow = null
    let jsDomDoc = null

    let DEFAULT_OPTIONS_REPORT_DUPLICATE_CSS_FILE_LOCATION = DEFAULT_OPTIONS.report_duplicate_css_file_location

    // summary
    const SUMMARY = {
      files: {
        output_css: [],
        input_css: [],
        input_html: [],
        input_js: []
      },
      options: {
        ...OPTIONS
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
    let DEFAULT_OPTIONS_REDUCE_DECLARATIONS = {}
    let DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION = 'default_options_reduce_declarations.json'
    let HAS_READ_REDUCE_DECLARATIONS = false

    const selectors = ''
    let selectorsCount = 0

    const SELECTOR_PROPERTY_MAP = new Map()

    const declarationNames = [
      ...DEFAULT_DECLARATION_NAMES
    ]
    let declarationNamesCount = declarationNames.length

    let fileLocation = 'demo/test1.css'

    let readCSSFilesCount = 0
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

    function processOptions (options) {
      const {
        trim: TRIM,
        shorten: SHORTEN,
        special_reduce_with_html: SPECIAL_REDUCE_WITH_HTML,
        css_output_file_location: CSS_OUTPUT_FILE_LOCATION,
        report_duplicate_css_file_location: REPORT_DUPLICATE_CSS_FILE_LOCATION,
        reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION,
        verbose: VERBOSE
      } = options

      if (TRIM) {
        OPTIONS.trim_removed_rules_previous_comment = true
        OPTIONS.trim_comments = true
        OPTIONS.trim_whitespace = true
        OPTIONS.trim_breaklines = true
        OPTIONS.trim_last_semicolon = true
      }

      if (SHORTEN) {
        OPTIONS.shorten_zero = true
        OPTIONS.shorten_hexcolor = true
        OPTIONS.shorten_hexcolor_extended_names = true
        OPTIONS.shorten_font = true
        OPTIONS.shorten_background = true
        OPTIONS.shorten_margin = true
        OPTIONS.shorten_padding = true
        OPTIONS.shorten_list_style = true
        OPTIONS.shorten_outline = true
        OPTIONS.shorten_border = true
        OPTIONS.shorten_border_top = true
        OPTIONS.shorten_border_right = true
        OPTIONS.shorten_border_bottom = true
        OPTIONS.shorten_border_left = true
        OPTIONS.shorten_border_radius = true
      }

      if (SPECIAL_REDUCE_WITH_HTML) {
        OPTIONS.special_reduce_with_html = SPECIAL_REDUCE_WITH_HTML
      }

      if (CSS_OUTPUT_FILE_LOCATION) {
        OPTIONS.css_output_file_location = CSS_OUTPUT_FILE_LOCATION
      }

      if (VERBOSE) {
        OPTIONS.verbose = VERBOSE
      }

      SUMMARY.files.output_css.push(CSS_OUTPUT_FILE_LOCATION)
      DEFAULT_OPTIONS_REPORT_DUPLICATE_CSS_FILE_LOCATION = REPORT_DUPLICATE_CSS_FILE_LOCATION
      DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION = REDUCE_DECLARATIONS_FILE_LOCATION

      DEFAULT_OPTIONS = options
      SUMMARY.options = {
        ...OPTIONS
      }

      cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_END', OPTIONS)
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
      const file = files[readHTMLFileCount]

      if (OPTIONS.verbose) { console.log(info('Input - HTML File : ' + file)) }

      if (validUrl.isUri(file)) {
        request({
          url: file,
          method: 'GET'
        }, (e, head, body) => {
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
            fileName: file,
            fileSizeKB
          })
        })
      } else {
        const fileSizeKB = getFileSizeInKB(file)

        STATS.files.html.push({
          fileName: file,
          fileSizeKB
        })
      }

      SUMMARY.files.input_html.push(file)

      if (validUrl.isUri(file)) {
        request(file, (e, response, body) => {
          if (response === undefined) {
            // try again
            request(file, (e, response, body) => {
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
                console.log(error('HTML file read error'))
                console.log(e)
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
            console.log(error('HTML file read error'))
            console.log(e)
            process.exit(1)
          }
        })
      } else {
        const readHTMLStream = createReadStream(file, 'utf8')

        readHTMLStream
          .on('data', (chunk) => {
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
            console.log(error('HTML file read error'))
            console.log(e)
            process.exit(1)
          })
      }
    } // end of readHTMLFile

    function readReduceDeclarations (reduceDeclarations) {
      if (reduceDeclarations) {
        let {
          declaration_names: declarationNames,
          selectors
        } = reduceDeclarations

        switch (typeof selectors) {
          case 'string':
            if (selectors.length) {
              selectors = selectors.replace(/^\s+|\s+$/g, '')
              selectors = selectors.replace(/\r?\n|\r/g, '')
              selectors = selectors.split(',')
              selectorsCount = selectors.length
            }
            break
          case 'object':
            Object
              .entries(selectors)
              .forEach(([key, value]) => {
                SELECTOR_PROPERTY_MAP.set(key, value.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(','))
              })

            selectorsCount = Object.keys(selectors).length
            break
        }

        // by name
        if (declarationNames.length) {
          if (typeof declarationNames === 'string') {
            declarationNames = declarationNames.replace(/^\s+|\s+$/g, '')
            declarationNames = declarationNames.split(',').filter((declarationName) => declarationName.trim() !== '')
            declarationNamesCount = declarationNames.length
          } else {
            if (Array.isArray(declarationNames)) {
              declarationNames = declarationNames.filter((declarationName) => declarationName.trim() !== '')
              declarationNamesCount = declarationNames.length
            }
          }
        }

        HAS_READ_REDUCE_DECLARATIONS = true
        cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', OPTIONS)
      } else {
        let defaultOptionsReduceDeclarations = ''

        const readStream = createReadStream(DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION, 'utf8')

        readStream
          .on('data', (chunk) => {
            defaultOptionsReduceDeclarations += chunk
          })
          .on('end', () => {
            try {
              DEFAULT_OPTIONS_REDUCE_DECLARATIONS = JSON.parse(defaultOptionsReduceDeclarations)
            } catch (e) {
              console.log(error(`Config file read error in "${DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION}"`))
              console.log(e)
              process.exit(1)
            }

            let {
              declaration_names: declarationNames,
              selectors
            } = DEFAULT_OPTIONS_REDUCE_DECLARATIONS

            switch (typeof selectors) {
              case 'string':
                if (selectors.length) {
                  selectors = selectors.replace(/^\s+|\s+$/g, '')
                  selectors = selectors.replace(/\r?\n|\r/g, '')
                  selectors = selectors.split(',')
                  selectorsCount = selectors.length
                }
                break
              case 'object':
                Object
                  .entries(selectors)
                  .forEach(([key, value]) => {
                    SELECTOR_PROPERTY_MAP.set(key, value.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(','))
                  })

                selectorsCount = Object.keys(selectors).length
                break
            }

            // by name
            if (declarationNames.length) {
              if (typeof declarationNames === 'string') {
                declarationNames = declarationNames.replace(/^\s+|\s+$/g, '')
                declarationNames = declarationNames.split(',').filter((declarationName) => declarationName.trim() !== '')
                declarationNamesCount = declarationNames.length
              } else {
                if (Array.isArray(declarationNames)) {
                  declarationNames = declarationNames.filter((declarationName) => declarationName.trim() !== '')
                  declarationNamesCount = declarationNames.length
                }
              }
            }

            HAS_READ_REDUCE_DECLARATIONS = true
            cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', OPTIONS)
          })
          .on('error', (e) => {
            cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_ERROR', OPTIONS)
            console.log(error('Default options file read error'))
            console.log(e)
            process.exit(1)
          })
      }
    } // end of readReduceDeclarations

    function readOptions (optionsFilePath = '') {
      let defaultOptions = ''
      let readStream

      if (optionsFilePath === '') {
        readStream = createReadStream(DEFAULT_OPTIONS_FILE_LOCATION, 'utf8')
      } else {
        readStream = createReadStream(optionsFilePath, 'utf8')
      }

      readStream
        .on('data', (chunk) => {
          defaultOptions += chunk
        })
        .on('end', () => {
          if (defaultOptions !== '') {
            try {
              DEFAULT_OPTIONS = JSON.parse(defaultOptions)
            } catch (e) {
              console.log(error(`Config file read error in "${DEFAULT_OPTIONS_FILE_LOCATION}"`))
              console.log(e)
              process.exit(1)
            }

            const {
              trim: TRIM,
              shorten: SHORTEN,
              css_output_file_location: CSS_OUTPUT_FILE_LOCATION,
              report_duplicate_css_file_location: REPORT_DUPLICATE_CSS_FILE_LOCATION,
              reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION
            } = DEFAULT_OPTIONS

            if (TRIM) {
              DEFAULT_OPTIONS.trim_removed_rules_previous_comment = true
              DEFAULT_OPTIONS.trim_comments = true
              DEFAULT_OPTIONS.trim_whitespace = true
              DEFAULT_OPTIONS.trim_breaklines = true
              DEFAULT_OPTIONS.trim_last_semicolon = true
            }

            if (SHORTEN) {
              DEFAULT_OPTIONS.shorten_zero = true
              DEFAULT_OPTIONS.shorten_hexcolor = true
              DEFAULT_OPTIONS.shorten_hexcolor_extended_names = true
              DEFAULT_OPTIONS.shorten_font = true
              DEFAULT_OPTIONS.shorten_background = true
              DEFAULT_OPTIONS.shorten_margin = true
              DEFAULT_OPTIONS.shorten_padding = true
              DEFAULT_OPTIONS.shorten_list_style = true
              DEFAULT_OPTIONS.shorten_outline = true
              DEFAULT_OPTIONS.shorten_border = true
              DEFAULT_OPTIONS.shorten_border_top = true
              DEFAULT_OPTIONS.shorten_border_right = true
              DEFAULT_OPTIONS.shorten_border_bottom = true
              DEFAULT_OPTIONS.shorten_border_left = true
              DEFAULT_OPTIONS.shorten_border_radius = true
            }

            SUMMARY.files.output_css.push(CSS_OUTPUT_FILE_LOCATION)
            DEFAULT_OPTIONS_REPORT_DUPLICATE_CSS_FILE_LOCATION = REPORT_DUPLICATE_CSS_FILE_LOCATION
            DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION = REDUCE_DECLARATIONS_FILE_LOCATION

            OPTIONS = DEFAULT_OPTIONS
            SUMMARY.options = {
              ...OPTIONS
            }
          }

          cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_END', OPTIONS)
        })
        .on('error', (e) => {
          cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_READ_ERROR')
          console.log(error(`Config file read error in "${DEFAULT_OPTIONS_FILE_LOCATION}"`))
          console.log(e)
          process.exit(1)
        })

      return readStream
    } // end of readOptions

    /* read css input files */
    function processCSSFiles (options = null, optionsFilePath = '') {
      function handleDefaultOptionsReadEnd () {
        cssPurgeEventEmitter.removeListener('DEFAULT_OPTIONS_READ_END', handleDefaultOptionsReadEnd)

        // config
        if (!OPTIONS.css) OPTIONS.css = DEFAULT_OPTIONS.css

        // Options
        if (options) {
          for (const key in options) {
            OPTIONS[key] = options[key]
          }
        }

        files = OPTIONS.css

        if (files) {
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
            readCSSFiles(files)
          })

          cssPurgeEventEmitter.on('CSS_READ_END', () => {
            processCSS(null, OPTIONS)
          })

          readCSSFiles(files)
        }
      }

      function handleDefaultOptionsReduceDeclarationsEnd () {
        cssPurgeEventEmitter.removeListener('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionsReduceDeclarationsEnd)

        if (OPTIONS_FILE_LOCATION !== optionsFilePath) { // don't read same config
          cssPurgeEventEmitter.on('DEFAULT_OPTIONS_READ_END', handleDefaultOptionsReadEnd) // end of config read
        }

        OPTIONS_FILE_LOCATION = optionsFilePath

        if (optionsFilePath !== 'cmd_default') {
          readOptions(optionsFilePath)
        } else {
          if (optionsFilePath === 'cmd_default') {
            processOptions(options)
          }
        }
      }

      cssPurgeEventEmitter.on('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionsReduceDeclarationsEnd) // end of reduce config read

      if (!HAS_READ_REDUCE_DECLARATIONS) {
        if (existsSync(OPTIONS.reduce_declarations_file_location)) {
          readReduceDeclarations()
        } else {
          if (options && !options.reduceDeclarations) {
            const reduceDeclarations = {
              declaration_names: [
                ...DEFAULT_DECLARATION_NAMES
              ]
            }

            options.reduceDeclarations = reduceDeclarations

            readReduceDeclarations(reduceDeclarations)
          } else {
            readReduceDeclarations()
          }
        }
      }
    } // end of processCSSFiles

    function readCSSFiles (files = []) {
      const file = files[readCSSFilesCount]

      if (OPTIONS.verbose) { console.log(info('Input - CSS File : ' + file)) }

      if (validUrl.isUri(file)) {
        request({
          url: file,
          method: 'GET'
        }, (e, head, body) => {
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
            fileName: file,
            fileSizeKB
          })
          STATS.before.totalFileSizeKB += fileSizeKB
        })
      } else {
        const fileSizeKB = getFileSizeInKB(file)

        STATS.files.css.push({
          fileName: file,
          fileSizeKB
        })
        STATS.before.totalFileSizeKB += fileSizeKB
      }

      SUMMARY.files.input_css.push(file)

      if (validUrl.isUri(file)) {
        request(file, (e, response, body) => {
          if (response === undefined) {
            // try again
            request(file, (e, response, body) => {
              if (response.statusCode === 200) {
                FILE_DATA.push(body)

                readCSSFilesCount += 1

                if (readCSSFilesCount < files.length) {
                  cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
                } else {
                  cssPurgeEventEmitter.emit('CSS_READ_END')
                }
              } else {
                cssPurgeEventEmitter.emit('CSS_READ_ERROR')
                console.log(error('CSS file read error'))
                console.log(e)
                process.exit(1)
              }
            })
          } else if (response.statusCode === 200) {
            FILE_DATA.push(body)

            readCSSFilesCount += 1

            if (readCSSFilesCount < files.length) {
              cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
            } else {
              cssPurgeEventEmitter.emit('CSS_READ_END')
            }
          } else {
            cssPurgeEventEmitter.emit('CSS_READ_ERROR')
            console.log(error('CSS file read error'))
            console.log(e)
            process.exit(1)
          }
        })
      } else {
        const readStream = createReadStream(file, 'utf8')

        readStream
          .on('data', (chunk) => {
            FILE_DATA.push(chunk)
          })
          .on('end', () => {
            readCSSFilesCount += 1
            if (readCSSFilesCount < files.length) {
              cssPurgeEventEmitter.emit('CSS_READ_AGAIN')
            } else {
              cssPurgeEventEmitter.emit('CSS_READ_END')
            }
          })
          .on('error', (e) => {
            cssPurgeEventEmitter.emit('CSS_READ_ERROR')
            console.log(error('CSS file read error'))
            console.log(e)
            process.exit(1)
          })
      } // end of url check
    } // end of readCSSFiles

    function processRules (rules) {
      if (rules !== undefined) {
        let RULES_COUNT = rules.length

        // reduce common declarations amongst children into parent
        if (OPTIONS.reduce_common_into_parent) {
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
                          const key = selectors[k]
                          if (SELECTOR_PROPERTY_MAP.has(key)) {
                            selectorPropertiesList = SELECTOR_PROPERTY_MAP.get(key)
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

      const outputCSS = cssTools.stringify({
        type: 'stylesheet',
        stylesheet: {
          rules: rulesIn
        }
      })

      return outputCSS
    } // end of processHTMLResults

    function completeOutput (css = '') {
      const {
        css_output_file_location: CSS_OUTPUT_FILE_LOCATION
      } = OPTIONS

      if (CSS_OUTPUT_FILE_LOCATION) {
        const directoryPath = path.dirname(CSS_OUTPUT_FILE_LOCATION)
        const {
          name
        } = path.parse(CSS_OUTPUT_FILE_LOCATION)

        try {
          if (OPTIONS.format_4095_rules_legacy_limit) {
            if (Math.ceil(SUMMARY.stats.after.noRules / 4095) > 1) {
              let ast
              try {
                ast = cssTools.parse(css, { source: CSS_OUTPUT_FILE_LOCATION })
              } catch (e) {
                console.log(error('CSS parser error'))
                console.log('Reason: ' + e.reason)
                console.log('Line: ' + e.line)
                console.log('Column: ' + e.column)
                console.log('Filename: ' + e.filename)
                process.exit(1)
              }

              const {
                stylesheet: {
                  rules
                }
              } = ast

              toGroups(rules)
                .forEach((rules, i) => {
                  css = cssTools.stringify({
                    type: 'stylesheet',
                    stylesheet: {
                      rules
                    }
                  })
                  css = trim(css, OPTIONS, SUMMARY)
                  css = hack(css, OPTIONS, SUMMARY, getTokens())
                  const fileName = path.join(directoryPath, `${name}_${i}.css`)
                  writeFileSync(fileName, css)
                  fileSizeKB += getFileSizeInKB(fileName)
                })
            } else {
              css = trim(css, OPTIONS, SUMMARY)
              css = hack(css, OPTIONS, SUMMARY, getTokens())
              const fileName = path.join(directoryPath, name + '.css')
              writeFileSync(fileName, css)
              fileSizeKB = getFileSizeInKB(fileName)
            }
          } else {
            css = trim(css, OPTIONS, SUMMARY)
            css = hack(css, OPTIONS, SUMMARY, getTokens())
            const fileName = path.join(directoryPath, name + '.css')
            writeFileSync(fileName, css)
            fileSizeKB = getFileSizeInKB(fileName)
          }
        } catch (e) {
          console.log(error('Output file error'))
          console.log(e)
          process.exit(1)
        }
      } else {
        css = trim(css, OPTIONS, SUMMARY)
        css = hack(css, OPTIONS, SUMMARY, getTokens())
        const size = getSizeInKB(css)
        fileSizeKB = size / 1000
      }

      SUMMARY.stats.after.totalFileSizeKB += fileSizeKB
      SUMMARY.stats.summary.savingsKB = roundTo(SUMMARY.stats.before.totalFileSizeKB - SUMMARY.stats.after.totalFileSizeKB, 4)
      SUMMARY.stats.summary.savingsPercentage = roundTo(SUMMARY.stats.summary.savingsKB / SUMMARY.stats.before.totalFileSizeKB * 100, 2)

      // write report
      if (OPTIONS.report) {
        try {
          writeFileSync(DEFAULT_OPTIONS_REPORT_DUPLICATE_CSS_FILE_LOCATION, JSON.stringify(SUMMARY, null, 2))
        } catch (e) {
          console.log(error('Report output file error'))
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

      return css
    }

    function processCSS (css = null, options = null, complete = () => {}) {
      function handleDefaultOptionReduceDeclarationsEnd () {
        cssPurgeEventEmitter.removeListener('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionReduceDeclarationsEnd)

        if (css) {
          fileSizeKB = getSizeInKB(css)

          STATS.before.totalFileSizeKB += fileSizeKB
        }

        if (options) {
          for (const key in options) {
            OPTIONS[key] = options[key]
          }
        }

        if (OPTIONS.verbose) {
          date = (OPTIONS.css_output_file_location) ? OPTIONS.css_output_file_location : new Date()

          console.time(logoRed('Purged ' + date + ' in'))
        }

        if (OPTIONS.verbose) { console.log(info('Process - CSS')) }

        css = css ?? FILE_DATA.join('')

        const {
          _3tokenValues,
          _4tokenValues,
          _5tokenValues,
          _6tokenValues,
          _7tokenValues,
          tokenComments
        } = getTokens()

        // tokens - allow multi-keyframe selectors
        css = css.replace(/(@(-?)[a-zA-Z\-]*(keyframes)*\s[a-zA-Z\-]*(\s*,?\s*)){2,}/g, (match) => {
          _7tokenValues.push(match)
          return '@keyframes _7token_' + _7tokenValues.length + ''
        })

        // tokens - data:image
        css = css.replace(/url\(\"data:image\/([a-zA-Z]*);base64,([^\"]*)\"\)/g, (match) => {
          _6tokenValues.push(match)
          return '_6token_dataimage_' + _6tokenValues.length + ':'
        })

        // remove non-standard commented lines
        css = css.replace(/([^(:;,a-zA-Z0-9]|^)\/\/.*$/gm, (match) => {
          STATS.summary.noInlineCommentsTrimmed += 1

          if (OPTIONS.trim_keep_non_standard_inline_comments && OPTIONS.trim_comments !== true) {
            return '/*' + match.substring(3, match.length) + ' */'
          } else {
            return ''
          }
        })

        // hacks - **/
        css = css.replace(/\/\*\*\//gm, '_1token_hck')

        // hacks - *\**/
        css = css.replace(/\/\*\\\*\*\//gm, '_2token_hck')

        // hacks - (specialchar)property
        css = css.replace(/[\!\$\&\*\(\)\=\%\+\@\,\.\/\`\[\]\#\~\?\:\<\>\|\*\/]{1}([\-\_\.]?)([a-zA-Z0-9]+):((\s\S*?));/g, (match) => {
          _3tokenValues.push(match.substring(0, match.length - 1))
          return '_3token_hck_' + _3tokenValues.length + ':'
        })

        // hacks - (;
        css = css.replace(/(\(;)([\s\S]*?)(\})/g, (match) => {
          _4tokenValues.push(match)
          return '_4token_hck_' + _4tokenValues.length + ':}'
        })

        // hacks - [;
        css = css.replace(/(\[;)([\s\S]*?)(\})/g, (match) => {
          _5tokenValues.push(match)
          return '_5token_hck_' + _5tokenValues.length + ':}'
        })

        // tokens - replace side comments
        if (OPTIONS.trim_comments !== true) {
          css = css.replace(/[;]([^\n][\s]*?)\/\*([\s\S]*?)\*\//gm, (match) => {
            const i = Object.keys(tokenComments).length + 1
            const k = '_cssp_sc' + i
            tokenComments[k] = match
            return '; /*_cssp_sc' + i + '*/'
          })
        }

        let ast
        try {
          ast = cssTools.parse(css, { source: fileLocation })
        } catch (e) {
          console.log(error('CSS parser error'))
          console.log('Reason: ' + e.reason)
          console.log('Line: ' + e.line)
          console.log('Column: ' + e.column)
          console.log('Filename: ' + e.filename)
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
        processValues(rules, OPTIONS, SUMMARY)

        // @media rules
        rules
          .filter(Boolean)
          .filter(filterForMedia)
          .forEach(({ rules, media }) => {
            console.log(info('Process - Rules - @media ' + media)) // if (OPTIONS.verbose) { console.log(info('Process - Rules - @media ' + rule.media)) }

            processRules(rules)
            processValues(rules, OPTIONS, SUMMARY)
          })

        // @document rules
        if (!OPTIONS.bypass_document_rules) {
          rules
            .filter(Boolean)
            .filter(filterForDocument)
            .forEach(({ rules, document }) => {
              console.log(info('Process - Rules - @document ' + document)) // if (OPTIONS.verbose) { console.log(info('Process - Rules - @media ' + rule.media)) }

              processRules(rules)
              processValues(rules, OPTIONS, SUMMARY)
            })
        }

        // @supports rules
        if (!OPTIONS.bypass_supports_rules) {
          rules
            .filter(Boolean)
            .filter(filterForSupports)
            .forEach(({ rules, supports }) => {
              console.log(info('Process - Rules - @supports ' + supports)) // if (OPTIONS.verbose) { console.log(info('Process - Rules - @media ' + rule.media)) }

              processRules(rules)
              processValues(rules, OPTIONS, SUMMARY)
            })
        }

        // charset rules
        if (!OPTIONS.bypass_charset) {
          rules
            .forEach((rule, i) => {
              if (rule) {
                const {
                  type
                } = rule

                if (type === 'charset') {
                  const {
                    charset: ALPHA = ''
                  } = rule

                  rules.slice(i)
                    .forEach((rule, j) => {
                      if (rule) {
                        const {
                          type
                        } = rule

                        if (type === 'charset') {
                          const {
                            charset: OMEGA = ''
                          } = rule

                          if (ALPHA === OMEGA) {
                            rules.splice(j, 1) // remove charset

                            const siblingRule = rules[j] // rules.slice(j).shift()
                            if (siblingRule) {
                              const {
                                type,
                                comment
                              } = siblingRule

                              if (
                                type === 'comment' &&
                                comment.includes('_cssp_sc')
                              ) {
                                rules.splice(j, 1) // remove comment
                              }
                            }
                          }
                        }
                      }
                    })

                  if (!(ALPHA.startsWith('"') && ALPHA.endsWith('"'))) {
                    rules.splice(i, 1) // remove charset

                    const siblingRule = rules[i] // rules.slice(i).shift()
                    if (siblingRule) {
                      const {
                        type,
                        comment
                      } = siblingRule

                      if (
                        type === 'comment' &&
                        comment.includes('_cssp_sc')
                      ) {
                        rules.splice(i, 1) // remove comment
                      }
                    }
                  }
                }
              }
            })
        }

        OPTIONS.special_convert_rem = true

        const {
          special_convert_rem: SPECIAL_CONVERT_REM
        } = OPTIONS

        // rems - html check
        if (SPECIAL_CONVERT_REM) {
          const {
            special_convert_rem_px: SPECIAL_CONVERT_REM_PX,
            special_convert_rem_default_px: SPECIAL_CONVERT_REM_DEFAULT_PX
          } = OPTIONS

          const remPx = Number(SPECIAL_CONVERT_REM_PX)
          const remDefaultPx = Number(SPECIAL_CONVERT_REM_DEFAULT_PX)
          const FONT_SIZE = ((remPx / remDefaultPx) * 100) + '%'

          if (rules.some(hasHtml)) {
            rules
              .forEach((rule, i, rules) => {
                const {
                  selectors = []
                } = rule

                /**
                 *  Has
                 */
                if (selectors.some((selector) => selector.includes('html'))) {
                  const {
                    declarations = []
                  } = rule

                  /**
                   *  Has not
                   */
                  if (!declarations.some(({ property }) => property === 'font-size')) {
                    /**
                     *  Add to the start
                     */
                    declarations.unshift({
                      type: 'declaration',
                      property: 'font-size',
                      value: FONT_SIZE
                    })

                    /**
                     *  Put at the start
                     */
                    rules.unshift(rules.splice(i, 1).shift())
                  }
                }
              })
          } else {
            rules.unshift({
              type: 'rule',
              selectors: ['html'],
              declarations: [
                {
                  type: 'declaration',
                  property: 'font-size',
                  value: FONT_SIZE
                }
              ]
            })
          }
        } // end of rems - html check

        /// charset check
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
        /// end of charset check

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
        const outputCSS = cssTools.stringify({
          type: 'stylesheet',
          stylesheet: {
            rules
          }
        })

        // Detect via JS
        // Detect via HTML
        if (OPTIONS.special_reduce_with_html && OPTIONS.html) {
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
                }
              }
            })

          // remove duplicates
          selectors = Array.from(new Set(selectors))

          // process selectors returned from processing HTML
          cssPurgeEventEmitter.on('HTML_RESULTS_END', (selectorsRemoved) => {
            SUMMARY.selectors_removed = selectorsRemoved

            const outputCSS = processHTMLResults(rules, selectors)

            complete(null, completeOutput(outputCSS))
          })

          processHTML(selectors)
        } else { // end of special_reduce_with_html
          complete(null, completeOutput(outputCSS))
        } // end of special_reduce_with_html
      }

      cssPurgeEventEmitter.on('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionReduceDeclarationsEnd) // end of event

      if (!css) cssPurgeEventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END')

      if (!HAS_READ_REDUCE_DECLARATIONS) {
        if (existsSync(OPTIONS.reduce_declarations_file_location)) {
          readReduceDeclarations()
        } else {
          if (options && !options.reduceDeclarations) {
            const reduceDeclarations = {
              declaration_names: [
                ...DEFAULT_DECLARATION_NAMES
              ]
            }

            options.reduceDeclarations = reduceDeclarations

            readReduceDeclarations(reduceDeclarations)
          } else {
            readReduceDeclarations()
          }
        }
      }
    } // end of processCSS

    this.purgeCSS = function purgeCSS (css, options, complete) {
      processCSS(css, options, complete)
    }

    this.purgeCSSFiles = function purgeCSSFiles (options, optionsFilePath) {
      processCSSFiles(options, optionsFilePath)
    }
  }
} // end of CSSPurge

export default {
  purgeCSS (css, options, complete) {
    const cssPurge = new CSSPurge()

    cssPurge.purgeCSS(css, options, complete)
  },
  purgeCSSFiles (options, optionsFilePath) {
    const cssPurge = new CSSPurge()

    cssPurge.purgeCSSFiles(options, optionsFilePath)
  }
}