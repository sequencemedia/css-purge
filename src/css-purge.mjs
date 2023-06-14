import debug from 'debug'

import path from 'node:path'
import {
  writeFileSync,
  createReadStream,
  existsSync
} from 'node:fs'
import EventEmitter from 'node:events'
import crypto from 'node:crypto'

import clc from 'cli-color'
import cssTools from '@adobe/css-tools'

import validUrl from 'valid-url'

import jsdom from 'jsdom'

import DEFAULT_OPTIONS from './default_options.json' assert { type: 'json' }
import DEFAULT_DECLARATION_NAMES from './default-declaration-names.json' assert { type: 'json' }

import processValues from './process-values.mjs'

import trim from './css/trim.mjs'
import hack from './css/hack.mjs'

import {
  getCommonSelectors,
  getParentRules,
  getCommonParentRules,
  getCommonParentDeclarations,
  getParentDeclarations,
  removeParentDeclarationsFromCommonParentRules,
  addParentDeclarationsToRules
} from './common-rules/index.mjs'

import hasHtml from './utils/selectors/has-html.mjs'

import hasTypeMedia from './utils/declarations/has-type-media.mjs'
import hasTypeDocument from './utils/declarations/has-type-document.mjs'
import hasTypeSupports from './utils/declarations/has-type-supports.mjs'
import hasTypeComment from './utils/declarations/has-type-comment.mjs'

import getTokens from './utils/get-tokens.mjs'
import getSelectors from './utils/get-selectors.mjs'
import getFilePath from './utils/get-file-path.mjs'
import getFileSizeInKB from './utils/get-file-size-in-kb.mjs'
import getSizeInKB from './utils/get-size-in-kb.mjs'
import roundTo from './utils/round-to.mjs'
import escape from './utils/escape.mjs'

const log = debug('@sequencemedia/css-purge')

const { JSDOM } = jsdom

const success = clc.greenBright
// const success2 = clc.green
const info = clc.xterm(123)
const error = clc.red
// const errorLine = clc.redBright
// const warning = clc.yellow
// const awesome = clc.magentaBright
const logoRed = clc.xterm(197)
// const cool = clc.xterm(105)

// const read = fs.readFileSync
// const write = fs.writeFileSync
// const appendToFileSync = fs.appendFileSync

let hash

const DEFAULT_FILE_LOCATION = './default_options_css.css'
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

    let {
      report_file_location: DEFAULT_OPTIONS_REPORT_FILE_LOCATION,
      reduce_declarations_file_location: DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION
    } = DEFAULT_OPTIONS

    let HAS_READ_REDUCE_DECLARATIONS = false

    const selectors = ''
    let SELECTORS_COUNT = 0

    const SELECTOR_PROPERTY_MAP = new Map()

    let DECLARATION_NAMES = [
      ...DEFAULT_DECLARATION_NAMES
    ]

    // const fileLocation = 'demo/test1.css'

    function processRules (rules) {
      if (rules) {
        let RULES_COUNT = rules.length
        let DECLARATION_COUNT = 0

        let declarations
        let declarationsNameCounts
        let declarationsCounts
        let declarationsValueCounts

        let duplicateIds
        let amountRemoved
        let selectorPropertiesList

        // reduce common declarations amongst children into parent
        if (OPTIONS.move_common_declarations_into_parent) {
          const commonSelectors = getCommonSelectors(rules)

          const parentRules = getParentRules(rules)

          const commonParentRules = getCommonParentRules(commonSelectors, parentRules)

          const commonParentDeclarations = getCommonParentDeclarations(commonParentRules, rules)

          const parentDeclarations = getParentDeclarations(commonParentDeclarations, parentRules)

          removeParentDeclarationsFromCommonParentRules(commonParentRules, rules, parentDeclarations)

          addParentDeclarationsToRules(parentDeclarations, rules)

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
              if (!DECLARATION_NAMES.includes(key)) { // only properties not in list
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
                duplicateIds = declarationsValueCounts[key].id.split(',').map(toTrim).filter(Boolean)

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
                          duplicateIds = declarationsValueCounts[key2].id.split(',').map(toTrim).filter(Boolean)
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
            const declarationNamesCount = DECLARATION_NAMES.length

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
                        if (rules[i].declarations[l].property === DECLARATION_NAMES[k]) {
                          // console.log(declarationsNameCounts[key])
                          // console.log(key)
                          // console.log(rules[i].declarations[l].property)
                          // console.log(DECLARATION_NAMES[k])
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

          for (let k = 0; k < SELECTORS_COUNT; ++k) {
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
      let {
        declaration_names: declarationNames = [],
        selectors = {}
      } = reduceDeclarations

      switch (typeof selectors) {
        case 'string':
          if (selectors.length) {
            selectors = selectors.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean)
            SELECTORS_COUNT = selectors.length
          }

          break
        case 'object':
          Object
            .entries(selectors)
            .forEach(([key, value]) => {
              SELECTOR_PROPERTY_MAP.set(key, value.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean))
            })

          SELECTORS_COUNT = Object.keys(selectors).length
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

          let {
            declaration_names: declarationNames = [],
            selectors = {}
          } = declarations

          switch (typeof selectors) {
            case 'string':
              if (selectors.length) {
                selectors = selectors.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean)
                SELECTORS_COUNT = selectors.length
              }

              break
            case 'object':
              Object
                .entries(selectors)
                .forEach(([key, value]) => {
                  SELECTOR_PROPERTY_MAP.set(key, value.replace(/^\s+|\s+$/g, '').replace(/\r?\n|\r/g, '').split(',').map(toTrim).filter(Boolean))
                })

              SELECTORS_COUNT = Object.keys(selectors).length
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

          HAS_READ_REDUCE_DECLARATIONS = true
          eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_END', OPTIONS)
        })
        .on('error', (e) => {
          eventEmitter.emit('DEFAULT_OPTIONS_REDUCE_DECLARATIONS_ERROR', OPTIONS)
          handleOptionsFileReadError(e, DEFAULT_OPTIONS_REDUCE_DECLARATIONS_FILE_LOCATION)
        })
    } // end of readReduceDeclarationsFileLocation

    function processSelectorsForHTMLStart (selectors = [], html = null, options = null) {
      if (options) {
        for (const key in options) {
          OPTIONS.html[key] = options[key]
        }
      }

      if (OPTIONS.verbose) { console.log(info('Process - HTML - Determine Rules to Remove')) }

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

      for (let i = 0, selectorsLength = selectors.length; i < selectorsLength; ++i) {
        for (let j = 0, resultsLength = results.length; j < resultsLength; ++j) {
          if (selectors[i] === results[j]) {
            selectors.splice(i, 1)
            selectorsLength -= 1
            i -= 1
            break
          }
        }

        if (document.querySelector(selectors[i]) !== null) {
          selectors.splice(i, 1)
          selectorsLength -= 1
          i -= 1
        }
      }

      return selectors
    } // end of processSelectorsForHTMLStart

    function processSelectorsForHTMLEnd (rules = [], selectors = []) {
      if (OPTIONS.verbose) { console.log(info('Process - HTML - Remove Unused Rules')) }

      // remove unused selectors
      let foundInnocent = false
      let tmpSelectors = ''
      let findSelector = null
      for (let i = 0, RULES_COUNT = rules.length; i < RULES_COUNT; ++i) {
        if (rules[i] !== undefined) {
          switch (rules[i].type) {
            case 'rule':
              for (let j = 0, rulesCount2 = selectors.length; j < rulesCount2; ++j) {
                tmpSelectors = rules[i].selectors

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
                      rules.splice(i, 1)
                      i -= 1
                      RULES_COUNT -= 1
                    }
                  } else {
                    // remove rule
                    rules.splice(i, 1)
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

              for (let j = 0, rulesCount2 = rules[i].rules.length; j < rulesCount2; ++j) {
                if (rules[i].rules[j] !== undefined) {
                  for (let k = 0, rulesCount3 = selectors.length; k < rulesCount3; ++k) {
                    tmpSelectors = rules[i].rules[j].selectors

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
                          rules[i].rules.splice(j, 1)
                          j -= 1
                          rulesCount3 -= 1
                        }
                      } else {
                        // remove rule
                        rules[i].rules.splice(j, 1)
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

      processRules(rules)

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
    } // end of processSelectorsForHTMLEnd

    async function processHTML (selectors = [], html = null, options = null) {
      // read html files
      if (OPTIONS.html && OPTIONS.special_reduce_with_html) {
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
              if (htmlFiles.includes(',')) {
                htmlFiles = htmlFiles.replace(/^\s+|\s+$/g, '').split(',').map(toTrim).filter(Boolean)

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

        eventEmitter
          .on('HTML_READ_AGAIN', async (fileIndex, fileData) => {
            processSelectorsForHTMLStart(selectors, html, { ...options, fileData })

            await readHTMLFiles(htmlFiles, fileIndex, fileData)
          })
          .on('HTML_READ_END', (fileData) => {
            processSelectorsForHTMLStart(selectors, html, { ...options, fileData })

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

        if (options) {
          for (const key in options) {
            OPTIONS[key] = options[key]
          }
        }

        if (!OPTIONS.css) {
          const {
            file_path: FILE_PATH = DEFAULT_FILE_LOCATION
          } = OPTIONS

          OPTIONS.css = [FILE_PATH]
        }

        if (OPTIONS.verbose) {
          timeKey = (OPTIONS.css_file_location) ? OPTIONS.css_file_location : new Date()

          console.time(logoRed(`Purged "${timeKey}" in`))
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

        processRules(rules)
        processValues(rules, OPTIONS, SUMMARY)

        // @media rules
        rules
          .filter(Boolean)
          .filter(hasTypeMedia)
          .forEach(({ rules, media }) => {
            log('@media', media)

            processRules(rules)
            processValues(rules, OPTIONS, SUMMARY)
          })

        // @document rules
        if (!OPTIONS.bypass_document_rules) {
          rules
            .filter(Boolean)
            .filter(hasTypeDocument)
            .forEach(({ rules, document }) => {
              log('@document', document)

              processRules(rules)
              processValues(rules, OPTIONS, SUMMARY)
            })
        }

        // @supports rules
        if (!OPTIONS.bypass_supports_rules) {
          rules
            .filter(Boolean)
            .filter(hasTypeSupports)
            .forEach(({ rules, supports }) => {
              log('@supports', supports)

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
          eventEmitter
            .on('HTML_RESULTS_END', (selectorsRemoved) => {
              SUMMARY.selectors_removed = selectorsRemoved

              const css = processSelectorsForHTMLEnd(rules, selectors)

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

        if (existsSync(REDUCE_DECLARATIONS_FILE_LOCATION)) {
          readReduceDeclarationsFileLocation(REDUCE_DECLARATIONS_FILE_LOCATION)
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

        let cssFiles = OPTIONS.css

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
                cssFiles = cssFiles.replace(/ /g, '')
                if (cssFiles.includes(',')) { // comma delimited list - filename1.css, filename2.css
                  cssFiles = cssFiles.split(',').map(toTrim).filter(Boolean)

                  const collector = []

                  cssFiles
                    .forEach((file) => {
                      getFilePath(file, ['.css'], collector)
                    })

                  if (collector.length) {
                    cssFiles = collector
                  }
                } else {
                  const collector = []

                  // string path
                  getFilePath(cssFiles, ['.css'], collector)

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

        if (existsSync(REDUCE_DECLARATIONS_FILE_LOCATION)) {
          readReduceDeclarationsFileLocation(REDUCE_DECLARATIONS_FILE_LOCATION)
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
