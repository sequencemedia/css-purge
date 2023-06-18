import debug from 'debug'

import path from 'node:path'
import {
  writeFileSync,
  createReadStream,
  existsSync
} from 'node:fs'
import EventEmitter from 'node:events'

import clc from 'cli-color'
import cssTools from '@adobe/css-tools'

import validUrl from 'valid-url'

import jsdom from 'jsdom'

import ROOT from '#where-am-i'

import trim from '#css/trim'
import hack from '#css/hack'

import hasHtml from '#utils/selectors/has-html'

import hasTypeMedia from '#utils/declarations/has-type-media'
import hasTypeDocument from '#utils/declarations/has-type-document'
import hasTypeSupports from '#utils/declarations/has-type-supports'
import hasTypeComment from '#utils/declarations/has-type-comment'

import getTokens from '#utils/get-tokens'
import getSelectors from '#utils/get-selectors'
import getFilePath from '#utils/get-file-path'
import getFileSizeInKB from '#utils/get-file-size-in-kb'
import getSizeInKB from '#utils/get-size-in-kb'
import roundTo from '#utils/round-to'

import DEFAULT_OPTIONS from './default_options.json' assert { type: 'json' }
import DEFAULT_DECLARATION_NAMES from './default-declaration-names.json' assert { type: 'json' }

import removeUnused from './remove-unused.mjs'
import processRules from './process-rules.mjs'
import processValues from './process-values.mjs'

const log = debug('@sequencemedia/css-purge')

const {
  JSDOM
} = jsdom

const info = clc.xterm(123)
const error = clc.red
const time = clc.xterm(197)

const DEFAULT_FILE_LOCATION = './default.css'
const DEFAULT_OPTIONS_FILE_LOCATION = './default_options.json'

function toTrim (value) {
  return String(value).trim()
}

function getSummaryStatsFor (collector) {
  return function getSummaryStats ({ declarations, type }) {
    if (Array.isArray(declarations)) {
      collector.noComments = declarations.filter(hasTypeComment).length
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

function toGroups (rules, groupSize = 4095) {
  const {
    groups
  } = rules.reduce(({ groups, count }, rule) => {
    const group = groups[count] ?? (groups[count] = [])

    group.push(rule)

    if (group.length === groupSize) count += 1

    return { groups, count }
  }, { groups: [], count: 0 })

  return groups
}

function handleCssParseError (e) {
  console.log(error('Error parsing CSS'))
  console.table({
    Reason: e.reason,
    Line: e.line,
    Column: e.column,
    File: e.filename
  })
  process.exit(1)
}

function handleOptionsFileReadError (e, filePath) {
  console.log(error(`Options file read error at "${filePath}"`))
  console.log(e)
  process.exit(1)
}

function handleOptionsFileWriteError (e, filePath) {
  console.log(error(`Options file write error at "${filePath}"`))
  console.log(e)
  process.exit(1)
}

function handleCssFileReadError (e, filePath) {
  console.log(error(`CSS file read error at "${filePath}"`))
  console.log(e)
  process.exit(1)
}

function handleCssFileWriteError (e, filePath) {
  console.log(error(`CSS file write error at "${filePath}"`))
  console.log(e)
  process.exit(1)
}

function handleHtmlFileReadError (e, filePath) {
  console.log(error(`HTML file read error at "${filePath}"`))
  console.log(e)
  process.exit(1)
}

class CSSPurge {
  constructor () {
    let timeKey = new Date()

    const eventEmitter = new EventEmitter()

    const INITIAL_OPTIONS = {
      ...DEFAULT_OPTIONS
    }

    const OPTIONS = {
      ...INITIAL_OPTIONS
    }

    // let FILE_LOCATION
    let OPTIONS_FILE_LOCATION

    // summary
    const SUMMARY = {
      files: {
        output_css: [],
        input_css: [],
        input_html: []
      },
      options: {
        ...INITIAL_OPTIONS
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
        html: []
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
        noEmptyDeclarations: 0,
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

    const {
      report_file_location: REPORT_FILE_LOCATION,
      reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION
    } = DEFAULT_OPTIONS

    let DEFAULT_OPTIONS_REPORT_FILE_LOCATION = path.join(ROOT, REPORT_FILE_LOCATION)
    let DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION = path.join(ROOT, REDUCE_DECLARATIONS_FILE_LOCATION)

    let HAS_READ_REDUCE_DECLARATIONS = false

    const PARAMS = {
      selector_properties: new Map(),
      selectors: [],
      declaration_names: [
        ...DEFAULT_DECLARATION_NAMES
      ]
    }

    function readOptions (options = {}) {
      const {
        css_file_location: CSS_FILE_LOCATION,
        report_file_location: REPORT_FILE_LOCATION = DEFAULT_OPTIONS_REPORT_FILE_LOCATION,
        reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION = DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION
      } = options

      if (CSS_FILE_LOCATION) SUMMARY.files.output_css.push(CSS_FILE_LOCATION)

      DEFAULT_OPTIONS_REPORT_FILE_LOCATION = REPORT_FILE_LOCATION
      DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION = REDUCE_DECLARATIONS_FILE_LOCATION

      Object.assign(INITIAL_OPTIONS, Object.assign(OPTIONS, options))

      SUMMARY.options = {
        ...OPTIONS
      }

      eventEmitter.emit('DEFAULT_OPTIONS_READ_END', OPTIONS)
    } // end of readOptions

    function readOptionsFileLocation (fileLocation = DEFAULT_OPTIONS_FILE_LOCATION) {
      let defaultOptions = ''

      const readStream = createReadStream(fileLocation, 'utf8')

      readStream
        .on('data', (chunk) => {
          defaultOptions += chunk
        })
        .on('end', () => {
          if (defaultOptions !== '') {
            let options
            try {
              options = JSON.parse(defaultOptions)
            } catch (e) {
              eventEmitter.emit('DEFAULT_OPTIONS_READ_ERROR')
              handleOptionsFileReadError(e, DEFAULT_OPTIONS_FILE_LOCATION)
            }

            const {
              css_file_location: CSS_FILE_LOCATION,
              report_file_location: REPORT_FILE_LOCATION = DEFAULT_OPTIONS_REPORT_FILE_LOCATION,
              reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION = DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION
            } = options

            if (CSS_FILE_LOCATION) SUMMARY.files.output_css.push(CSS_FILE_LOCATION)

            DEFAULT_OPTIONS_REPORT_FILE_LOCATION = REPORT_FILE_LOCATION
            DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION = REDUCE_DECLARATIONS_FILE_LOCATION

            Object.assign(INITIAL_OPTIONS, Object.assign(OPTIONS, options))

            SUMMARY.options = {
              ...OPTIONS
            }
          }

          eventEmitter.emit('DEFAULT_OPTIONS_READ_END', OPTIONS)
        })
        .on('error', (e) => {
          eventEmitter.emit('DEFAULT_OPTIONS_READ_ERROR')
          handleOptionsFileReadError(e, DEFAULT_OPTIONS_FILE_LOCATION)
        })

      return readStream
    } // end of readOptionsFileLocation

    function readReduceDeclarations (reduceDeclarations = {}) {
      const {
        declaration_names: declarationNames = [],
        selectors = {}
      } = reduceDeclarations

      const SELECTOR_PROPERTIES = new Map()
      let SELECTORS = []
      let DECLARATION_NAMES = [
        ...DEFAULT_DECLARATION_NAMES
      ]

      switch (typeof selectors) {
        case 'object':
          Object
            .entries(selectors)
            .forEach(([selector, properties]) => {
              SELECTOR_PROPERTIES.set(selector, properties.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean))
            })

          SELECTORS = Array.from(SELECTOR_PROPERTIES.keys())
          break
        case 'string':
          SELECTORS = (
            selectors.length
              ? selectors.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean)
              : []
          )
          break
      }

      // by name
      if (typeof declarationNames === 'string') {
        DECLARATION_NAMES = declarationNames.replace(/^\s+|\s+$/g, '').split(',').map(toTrim).filter(Boolean)
      } else {
        if (Array.isArray(declarationNames)) {
          DECLARATION_NAMES = declarationNames.map(toTrim).filter(Boolean)
        }
      }

      PARAMS.selector_properties = SELECTOR_PROPERTIES
      PARAMS.selectors = SELECTORS
      PARAMS.declaration_names = DECLARATION_NAMES

      HAS_READ_REDUCE_DECLARATIONS = true

      eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', OPTIONS)
    } // end of readReduceDeclarations

    function readReduceDeclarationsFileLocation (fileLocation = DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION) {
      let reduceDeclarations = ''

      const readStream = createReadStream(fileLocation, 'utf8')

      readStream
        .on('data', (chunk) => {
          reduceDeclarations += chunk
        })
        .on('end', () => {
          let declarations
          try {
            declarations = JSON.parse(reduceDeclarations)
          } catch (e) {
            eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_ERROR')
            handleOptionsFileReadError(e, fileLocation)
          }

          const {
            declaration_names: declarationNames = [],
            selectors = {}
          } = declarations

          const SELECTOR_PROPERTIES = new Map()
          let SELECTORS = []
          let DECLARATION_NAMES = [
            ...DEFAULT_DECLARATION_NAMES
          ]

          switch (typeof selectors) {
            case 'object':
              Object
                .entries(selectors)
                .forEach(([selector, properties]) => {
                  SELECTOR_PROPERTIES.set(selector, properties.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean))
                })

              SELECTORS = Array.from(SELECTOR_PROPERTIES.keys())
              break
            case 'string':
              SELECTORS = (
                selectors.length
                  ? selectors.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean)
                  : []
              )
              break
          }

          // by name
          if (typeof declarationNames === 'string') {
            DECLARATION_NAMES = declarationNames.replace(/^\s+|\s+$/g, '').split(',').map(toTrim).filter(Boolean)
          } else {
            if (Array.isArray(declarationNames)) {
              DECLARATION_NAMES = declarationNames.map(toTrim).filter(Boolean)
            }
          }

          PARAMS.selector_properties = SELECTOR_PROPERTIES
          PARAMS.selectors = SELECTORS
          PARAMS.declaration_names = DECLARATION_NAMES

          HAS_READ_REDUCE_DECLARATIONS = true

          eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', OPTIONS)
        })
        .on('error', (e) => {
          eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_ERROR', OPTIONS)
          handleOptionsFileReadError(e, DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION)
        })
    } // end of readReduceDeclarationsFileLocation

    function prepareSelectorsForHTML (selectors = [], html = null, options = null) {
      if (options) Object.assign(OPTIONS.html, options)

      if (OPTIONS.verbose) { console.log(info('Prepare - HTML')) }

      html = html ?? OPTIONS.fileData.join('')
      delete OPTIONS.fileData

      let results = []
      let matches

      // find values in ids
      matches = html.match(/\bid\b[=](["'])(?:(?=(\\?))\2.)*?\1/gm)
      if (matches) {
        results = results.concat(
          Array.from(
            new Set(
              matches
                .filter(Boolean)
                .map((match) => match.split('=')[1].replace(/['"]+/g, ''))
            )
          )
        )
      }

      // find values in classes
      matches = html.match(/\bclass\b[=](["'])(?:(?=(\\?))\2.)*?\1/gm)
      if (matches) {
        results = results.concat(
          Array.from(
            new Set(
              matches
                .filter(Boolean)
                .map((match) => match.split('=')[1].replace(/['"]+/g, ''))
            )
          )
        )
      }

      // find values in internal selectors
      matches = html.match(/<style([\S\s]*?)>([\S\s]*?)<\/style>/gi)
      if (matches) {
        results = results.concat(
          Array.from(
            new Set(
              matches
                .filter(Boolean)
                .map((match) => match.split('</')[0].split('>')[1])
                .map((match) => match.match(/([#}.])([^0-9])([\S\s]*?){/g))
                .filter(Boolean)
                .map((match) => match.replace(/\r?\n|\r|\s/g, '').replace('{', '').replace('}', ''))
                .map((match) => match.split(',').map(toTrim).filter(Boolean))
            )
          )
        )
      }

      // find values in the dom
      const {
        window: {
          document
        }
      } = new JSDOM(html, { contentType: 'text/html' })

      selectors
        .forEach((selector, i) => {
          results
            .forEach((result) => {
              if (selector === result) selectors.splice(i, 1)
            })
        })

      selectors
        .forEach((selector, i) => {
          if (document.querySelector(selector)) selectors.splice(i, 1)
        })

      return selectors
    } // end of prepareSelectorsForHTML

    function processSelectorsForHTML (rules = [], selectors = []) {
      if (OPTIONS.verbose) { console.log(info('Process - HTML')) }

      removeUnused(rules, selectors)

      if (OPTIONS.verbose) { console.log(info('Process - HTML - Rules')) }

      processRules(rules, OPTIONS, SUMMARY, PARAMS)

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

      return cssTools.stringify({
        type: 'stylesheet',
        stylesheet: {
          rules
        }
      })
    } // end of processSelectorsForHTML

    async function processHTML (selectors = [], html = null, options = null) {
      // read html files
      if (OPTIONS.html && OPTIONS.special_reduce_with_html) {
        let {
          html: htmlFiles
        } = OPTIONS

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
              let collection = htmlFiles.replace(/ /g, '') // comma delimited list - filename1.html, filename2.html
              if (collection.includes(',')) {
                collection = collection.replace(/^\s+|\s+$/g, '').split(',').map(toTrim).filter(Boolean)

                const collector = []

                collection
                  .forEach((member) => {
                    getFilePath(member, ['.html', '.htm'], collector)
                  })

                if (collector.length) {
                  htmlFiles = collector
                }
              } else {
                const collector = []

                // string path
                getFilePath(collection, ['.html', '.htm'], collector)

                if (collector.length) {
                  htmlFiles = collector
                }
              }
            }
            break
        } // end of switch

        eventEmitter
          .on('HTML_READ_AGAIN', async (fileIndex, fileData) => {
            prepareSelectorsForHTML(selectors, html, { ...options, fileData })

            await readHTMLFiles(htmlFiles, fileIndex, fileData)
          })
          .on('HTML_READ_END', (fileData) => {
            prepareSelectorsForHTML(selectors, html, { ...options, fileData })

            eventEmitter.emit('HTML_RESULTS_END', selectors)
          })

        await readHTMLFiles(htmlFiles)
      } // end of html files check
    } // end of processHTML

    async function readHTMLFiles (files = [], fileIndex = 0, fileData = []) {
      const file = files[fileIndex]

      if (OPTIONS.verbose) { console.log(info('Input - HTML File : ' + file)) }

      if (validUrl.isUri(file)) {
        try {
          const response = await fetch(file)
          const content = await response.text()
          const fileSizeKB = getSizeInKB(content)

          STATS.files.html.push({
            fileName: file,
            fileSizeKB
          })

          SUMMARY.files.input_html.push(file)

          fileData.push(content)

          const nextFileIndex = fileIndex + 1

          if (nextFileIndex < files.length) {
            eventEmitter.emit('HTML_READ_AGAIN', nextFileIndex, fileData)
          } else {
            eventEmitter.emit('HTML_READ_END', fileData)
          }
        } catch (e) {
          eventEmitter.emit('HTML_READ_ERROR')
          handleHtmlFileReadError(e, file)
        }
      } else {
        const fileSizeKB = getFileSizeInKB(file)

        STATS.files.html.push({
          fileName: file,
          fileSizeKB
        })

        SUMMARY.files.input_html.push(file)

        const readHTMLStream = createReadStream(file, 'utf8')

        readHTMLStream
          .on('data', (chunk) => {
            fileData.push(chunk)
          })
          .on('end', () => {
            const nextFileIndex = fileIndex + 1

            if (nextFileIndex < files.length) {
              eventEmitter.emit('HTML_READ_AGAIN', nextFileIndex, fileData)
            } else {
              eventEmitter.emit('HTML_READ_END', fileData)
            }
          })
          .on('error', (e) => {
            eventEmitter.emit('HTML_READ_ERROR')
            handleHtmlFileReadError(e, file)
          })
      }
    } // end of readHTMLFiles

    function processCSS (css = null, options = null, complete = () => {}) {
      function handleDefaultOptionReduceDeclarationsEnd () {
        eventEmitter.removeListener('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionReduceDeclarationsEnd)

        if (css) {
          const fileSizeKB = getSizeInKB(css)

          STATS.before.totalFileSizeKB += fileSizeKB
        }

        // options
        if (options) Object.assign(OPTIONS, options)

        if (!OPTIONS.css) {
          const {
            file_path: FILE_PATH = DEFAULT_FILE_LOCATION
          } = OPTIONS

          OPTIONS.css = [FILE_PATH]
        }

        if (OPTIONS.verbose) {
          timeKey = (OPTIONS.css_file_location) ? OPTIONS.css_file_location : new Date()

          console.time(time(`Purged "${timeKey}" in`))
        }

        if (OPTIONS.verbose) { console.log(info('Process - CSS')) }

        css = css ?? OPTIONS.fileData.join('')
        delete OPTIONS.fileData

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

        const {
          file_path: FILE_PATH = DEFAULT_FILE_LOCATION
        } = OPTIONS

        let ast
        try {
          ast = cssTools.parse(css, { source: FILE_PATH })
        } catch (e) {
          handleCssParseError(e)
        }

        const {
          stylesheet: {
            rules
          }
        } = ast

        SUMMARY.stats = STATS

        STATS.before.noNodes = rules.length

        rules
          .filter(Boolean)
          .forEach(getSummaryStatsFor(SUMMARY.stats.before))

        if (OPTIONS.verbose) { console.log(info('Process - Rules - Base')) }

        processRules(rules, OPTIONS, SUMMARY, PARAMS)
        processValues(rules, OPTIONS, SUMMARY)

        // @media rules
        rules
          .filter(Boolean)
          .filter(hasTypeMedia)
          .forEach(({ rules, media }) => {
            log(`@media ${media}`)

            processRules(rules, OPTIONS, SUMMARY, PARAMS)
            processValues(rules, OPTIONS, SUMMARY)
          })

        // @document rules
        if (!OPTIONS.bypass_document_rules) {
          rules
            .filter(Boolean)
            .filter(hasTypeDocument)
            .forEach(({ rules, document }) => {
              log(`@document ${document}`)

              processRules(rules, OPTIONS, SUMMARY, PARAMS)
              processValues(rules, OPTIONS, SUMMARY)
            })
        }

        // @supports rules
        if (!OPTIONS.bypass_supports_rules) {
          rules
            .filter(Boolean)
            .filter(hasTypeSupports)
            .forEach(({ rules, supports }) => {
              log(`@supports ${supports}`)

              processRules(rules, OPTIONS, SUMMARY, PARAMS)
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

          const {
            file_path: FILE_PATH = DEFAULT_FILE_LOCATION
          } = OPTIONS

          let ast
          try {
            ast = cssTools.parse(outputCSS, { source: FILE_PATH })
          } catch (e) {
            handleCssParseError(e)
          }

          const {
            stylesheet: {
              rules
            }
          } = ast

          let selectors = []

          const {
            special_reduce_with_html_ignore_selectors: SPECIAL_REDUCE_WITH_HTML_IGNORE_SELECTORS
          } = OPTIONS

          rules
            .filter(Boolean)
            .forEach((rule) => {
              const { type } = rule
              if (type === 'rule') {
                getSelectors(rule, selectors, SPECIAL_REDUCE_WITH_HTML_IGNORE_SELECTORS)
              } else {
                if (
                  type === 'media' ||
                  type === 'document' ||
                  type === 'supports'
                ) {
                  rule.rules
                    .forEach((rule) => {
                      getSelectors(rule, selectors, SPECIAL_REDUCE_WITH_HTML_IGNORE_SELECTORS)
                    })
                }
              }
            })

          // remove duplicates
          selectors = Array.from(new Set(selectors))

          // process selectors returned from processing HTML
          eventEmitter
            .on('HTML_RESULTS_END', (selectorsRemoved) => {
              SUMMARY.selectors_removed = selectorsRemoved

              const css = processSelectorsForHTML(rules, selectors)

              complete(null, writeCSSFiles(css))

              const {
                report: REPORT
              } = OPTIONS

              if (REPORT) {
                const {
                  report_file_location: REPORT_FILE_LOCATION = DEFAULT_OPTIONS_REPORT_FILE_LOCATION
                } = OPTIONS

                try {
                  SUMMARY.options = (
                    Object.fromEntries(
                      Object
                        .entries(OPTIONS)
                        .sort(([alpha], [omega]) => alpha.localeCompare(omega))
                    )
                  )

                  writeFileSync(REPORT_FILE_LOCATION, JSON.stringify(SUMMARY, null, 2))
                } catch (e) {
                  handleOptionsFileWriteError(e, REPORT_FILE_LOCATION)
                }
              }

              const {
                verbose: VERBOSE
              } = OPTIONS

              if (VERBOSE) {
                console.table({
                  Before: {
                    KB: roundTo(SUMMARY.stats.before.totalFileSizeKB, 4)
                  },
                  After: {
                    KB: roundTo(SUMMARY.stats.after.totalFileSizeKB, 4)
                  },
                  Saved: {
                    KB: roundTo(SUMMARY.stats.summary.savingsKB, 4),
                    '%': roundTo(SUMMARY.stats.summary.savingsPercentage, 2)
                  }
                })
              }
            })

          processHTML(selectors)
        } else { // end of special_reduce_with_html
          complete(null, writeCSSFiles(outputCSS))

          const {
            report: REPORT
          } = OPTIONS

          if (REPORT) {
            const {
              report_file_location: REPORT_FILE_LOCATION = DEFAULT_OPTIONS_REPORT_FILE_LOCATION
            } = OPTIONS

            try {
              SUMMARY.options = (
                Object.fromEntries(
                  Object
                    .entries(OPTIONS)
                    .sort(([alpha], [omega]) => alpha.localeCompare(omega))
                )
              )

              writeFileSync(REPORT_FILE_LOCATION, JSON.stringify(SUMMARY, null, 2))
            } catch (e) {
              handleOptionsFileWriteError(e, REPORT_FILE_LOCATION)
            }
          }

          const {
            verbose: VERBOSE
          } = OPTIONS

          if (VERBOSE) {
            console.table({
              Before: {
                KB: roundTo(SUMMARY.stats.before.totalFileSizeKB, 4)
              },
              After: {
                KB: roundTo(SUMMARY.stats.after.totalFileSizeKB, 4)
              },
              Saved: {
                KB: roundTo(SUMMARY.stats.summary.savingsKB, 4),
                '%': roundTo(SUMMARY.stats.summary.savingsPercentage, 2)
              }
            })
          }
        } // end of special_reduce_with_html
      }

      eventEmitter.on('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionReduceDeclarationsEnd) // end of event

      if (!css) eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END')

      if (!HAS_READ_REDUCE_DECLARATIONS) {
        const {
          reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION
        } = OPTIONS

        const fileLocation = (
          DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION === path.join(ROOT, REDUCE_DECLARATIONS_FILE_LOCATION)
            ? DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION
            : REDUCE_DECLARATIONS_FILE_LOCATION
        )

        if (existsSync(fileLocation)) {
          readReduceDeclarationsFileLocation(fileLocation)
        } else {
          if (options && !options.reduce_declarations) {
            const reduceDeclarations = {
              declaration_names: [
                ...DEFAULT_DECLARATION_NAMES
              ]
            }

            options.reduce_declarations = reduceDeclarations

            readReduceDeclarations(reduceDeclarations)
          } else {
            readReduceDeclarationsFileLocation(DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION)
          }
        }
      }
    } // end of processCSS

    function processCSSFiles (options = INITIAL_OPTIONS, fileLocation = DEFAULT_OPTIONS_FILE_LOCATION, complete) {
      async function handleDefaultOptionsReadEnd () {
        eventEmitter.removeListener('DEFAULT_OPTIONS_READ_END', handleDefaultOptionsReadEnd)

        // options (css files)
        if (!OPTIONS.css) OPTIONS.css = INITIAL_OPTIONS.css

        // options
        if (options) Object.assign(OPTIONS, options)

        let {
          css: cssFiles
        } = OPTIONS

        if (cssFiles) {
          // check for file or files
          switch (typeof cssFiles) {
            case 'array':
              {
                const collector = []

                cssFiles
                  .forEach((file) => {
                    getFilePath(file, ['.css'], collector)
                  })

                if (collector.length) {
                  cssFiles = collector
                }
              }

              break
            case 'string':
              {
                // formats
                let collection = cssFiles.replace(/ /g, '')
                if (collection.includes(',')) { // comma delimited list - filename1.css, filename2.css
                  collection = collection.split(',').map(toTrim).filter(Boolean)

                  const collector = []

                  collection
                    .forEach((member) => {
                      getFilePath(member, ['.css'], collector)
                    })

                  if (collector.length) {
                    cssFiles = collector
                  }
                } else {
                  const collector = []

                  // string path
                  getFilePath(collection, ['.css'], collector)

                  if (collector.length) {
                    cssFiles = collector
                  }
                }
              }

              break
          } // end of switch

          fileLocation = cssFiles.toString()

          eventEmitter
            .on('CSS_READ_AGAIN', async (fileIndex, fileData) => {
              await readCSSFiles(cssFiles, fileIndex, fileData)
            })
            .on('CSS_READ_END', (fileData) => {
              processCSS(null, { ...OPTIONS, fileData }, complete)
            })

          await readCSSFiles(cssFiles)
        }
      }

      function handleDefaultOptionsReduceDeclarationsEnd () {
        eventEmitter.removeListener('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionsReduceDeclarationsEnd)

        if (OPTIONS_FILE_LOCATION !== fileLocation) { // don't read same config
          eventEmitter.on('DEFAULT_OPTIONS_READ_END', handleDefaultOptionsReadEnd) // end of config read
        }

        OPTIONS_FILE_LOCATION = fileLocation

        if (fileLocation !== 'cmd_default') {
          readOptionsFileLocation(fileLocation)
        } else {
          if (fileLocation === 'cmd_default') {
            readOptions(options)
          }
        }
      }

      eventEmitter.on('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', handleDefaultOptionsReduceDeclarationsEnd) // end of reduce config read

      if (!HAS_READ_REDUCE_DECLARATIONS) {
        const {
          reduce_declarations_file_location: REDUCE_DECLARATIONS_FILE_LOCATION
        } = OPTIONS

        const fileLocation = (
          DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION === path.join(ROOT, REDUCE_DECLARATIONS_FILE_LOCATION)
            ? DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION
            : REDUCE_DECLARATIONS_FILE_LOCATION
        )

        if (existsSync(fileLocation)) {
          readReduceDeclarationsFileLocation(fileLocation)
        } else {
          if (options && !options.reduce_declarations) {
            const reduceDeclarations = {
              declaration_names: [
                ...DEFAULT_DECLARATION_NAMES
              ]
            }

            options.reduce_declarations = reduceDeclarations

            readReduceDeclarations(reduceDeclarations)
          } else {
            readReduceDeclarationsFileLocation(DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION)
          }
        }
      }
    } // end of processCSSFiles

    async function readCSSFiles (files = [], fileIndex = 0, fileData = []) {
      const file = files[fileIndex]

      if (OPTIONS.verbose) { console.log(info('Input - CSS File : ' + file)) }

      if (validUrl.isUri(file)) {
        try {
          const response = await fetch(file)
          const content = await response.text()
          const fileSizeKB = getSizeInKB(content)

          STATS.files.css.push({
            fileName: file,
            fileSizeKB
          })
          STATS.before.totalFileSizeKB += fileSizeKB

          SUMMARY.files.input_css.push(file)

          fileData.push(content)

          const nextFileIndex = fileIndex + 1

          if (nextFileIndex < files.length) {
            eventEmitter.emit('CSS_READ_AGAIN', nextFileIndex, fileData)
          } else {
            eventEmitter.emit('CSS_READ_END', fileData)
          }
        } catch (e) {
          eventEmitter.emit('CSS_READ_ERROR')
          handleCssFileReadError(e, file)
        }
      } else {
        const fileSizeKB = getFileSizeInKB(file)

        STATS.files.css.push({
          fileName: file,
          fileSizeKB
        })
        STATS.before.totalFileSizeKB += fileSizeKB

        SUMMARY.files.input_css.push(file)

        const readStream = createReadStream(file, 'utf8')

        readStream
          .on('data', (chunk) => {
            fileData.push(chunk)
          })
          .on('end', () => {
            const nextFileIndex = fileIndex + 1

            if (nextFileIndex < files.length) {
              eventEmitter.emit('CSS_READ_AGAIN', nextFileIndex, fileData)
            } else {
              eventEmitter.emit('CSS_READ_END', fileData)
            }
          })
          .on('error', (e) => {
            eventEmitter.emit('CSS_READ_ERROR')
            handleCssFileReadError(e, file)
          })
      }
    } // end of readCSSFiles

    function writeCSSFiles (css = '') {
      const {
        css_file_location: CSS_FILE_LOCATION
      } = OPTIONS

      let fileSizeKB = 0

      if (CSS_FILE_LOCATION) {
        const directoryPath = path.dirname(CSS_FILE_LOCATION)
        const {
          name
        } = path.parse(CSS_FILE_LOCATION)

        try {
          const {
            format_group_size: FORMAT_GROUP_SIZE
          } = OPTIONS

          if (FORMAT_GROUP_SIZE) {
            if (Math.ceil(SUMMARY.stats.after.noRules / FORMAT_GROUP_SIZE) > 1) {
              let ast
              try {
                ast = cssTools.parse(css, { source: CSS_FILE_LOCATION })
              } catch (e) {
                handleCssParseError(e)
              }

              const {
                stylesheet: {
                  rules
                }
              } = ast

              toGroups(rules, FORMAT_GROUP_SIZE)
                .forEach((rules, i) => {
                  /**
                   *  Redeclared so as not to modify `css` in scope
                   */
                  let css = cssTools.stringify({
                    type: 'stylesheet',
                    stylesheet: {
                      rules
                    }
                  })
                  css = trim(css, OPTIONS, SUMMARY)
                  css = hack(css, OPTIONS, SUMMARY, getTokens())
                  const filePath = path.join(directoryPath, `${name}_${i}.css`)
                  writeFileSync(filePath, css)
                  fileSizeKB += getFileSizeInKB(filePath)
                })
            } else {
              css = trim(css, OPTIONS, SUMMARY)
              css = hack(css, OPTIONS, SUMMARY, getTokens())
              const filePath = path.join(directoryPath, name + '.css')
              writeFileSync(filePath, css)
              fileSizeKB = getFileSizeInKB(filePath)
            }
          } else {
            css = trim(css, OPTIONS, SUMMARY)
            css = hack(css, OPTIONS, SUMMARY, getTokens())
            const filePath = path.join(directoryPath, name + '.css')
            writeFileSync(filePath, css)
            fileSizeKB = getFileSizeInKB(filePath)
          }
        } catch (e) {
          handleCssFileWriteError(e, CSS_FILE_LOCATION)
        }
      } else {
        css = trim(css, OPTIONS, SUMMARY)
        css = hack(css, OPTIONS, SUMMARY, getTokens())
        fileSizeKB = getSizeInKB(css) // getSizeInKB(css) / 1000
      }

      SUMMARY.stats.after.totalFileSizeKB += fileSizeKB
      SUMMARY.stats.summary.savingsKB = roundTo(SUMMARY.stats.before.totalFileSizeKB - SUMMARY.stats.after.totalFileSizeKB, 4)
      SUMMARY.stats.summary.savingsPercentage = roundTo(SUMMARY.stats.summary.savingsKB / SUMMARY.stats.before.totalFileSizeKB * 100, 2)

      return css
    } // end of writeCSSFiles

    this.purgeCSS = function purgeCSS (css, options, complete) {
      processCSS(css, options, complete)
    }

    this.purgeCSSFiles = function purgeCSSFiles (options, fileLocation, complete) {
      processCSSFiles(options, fileLocation, complete)
    }
  }
} // end of CSSPurge

export default new CSSPurge()
