import {
  getCommonSelectors,
  getParentRules,
  getCommonParentRules,
  getCommonParentDeclarations,
  getParentDeclarations,
  removeParentDeclarationsFromCommonParentRules,
  addParentDeclarationsToRules
} from './common-rules/index.mjs'

import hasTypeComment from './utils/declarations/has-type-comment.mjs'

function toDeclaration ({ selectors = [] }, property) {
  return {
    selectors,
    property
  }
}

function toDuplicate ({ type, selectors, position }) {
  return {
    selectors: (type === 'page') ? '@page' : selectors,
    position
  }
}

function toDuplicateMedia ({ media, position }) {
  return {
    selectors: `@media ${media}`,
    position
  }
}

function toDuplicateDocument ({ media, position }) {
  return {
    selectors: `@document ${media}`,
    position
  }
}

function toDuplicateSupports ({ media, position }) {
  return {
    selectors: `@supports ${media}`,
    position
  }
}

function getPropertyMapFor (declarations = []) {
  const propertyMap = new Map()

  declarations
    .forEach((declaration) => {
      const {
        type
      } = declaration

      if (type === 'declaration') {
        const {
          property
        } = declaration

        const count = (
          propertyMap.has(property)
            ? propertyMap.get(property) + 1
            : 1
        )
        propertyMap.set(property, count)
      }
    })

  return propertyMap
}

export default function processRules (rules, OPTIONS, SUMMARY, DECLARATION_NAMES, SELECTORS, SELECTOR_PROPERTIES) {
  console.log('ENTER PROCESS')

  if (rules) {
    const {
      move_common_declarations_into_parent: MOVE_COMMON_DECLARATIONS_INTO_PARENT
    } = OPTIONS

    // reduce common declarations amongst children into parent
    if (MOVE_COMMON_DECLARATIONS_INTO_PARENT) {
      const commonSelectors = getCommonSelectors(rules)

      const parentRules = getParentRules(rules)

      const commonParentRules = getCommonParentRules(commonSelectors, parentRules)

      const commonParentDeclarations = getCommonParentDeclarations(commonParentRules, rules)

      const parentDeclarations = getParentDeclarations(commonParentDeclarations, parentRules)

      removeParentDeclarationsFromCommonParentRules(commonParentRules, rules, parentDeclarations)

      addParentDeclarationsToRules(parentDeclarations, rules)
    } // end of reduce common declarations amongst children into parent

    rules
      .filter(Boolean)
      .forEach((rule) => {
        const {
          declarations = []
        } = rule

        declarations
          .forEach((declaration, i) => {
            const {
              value = ''
            } = declaration

            if (value === '') {
              SUMMARY.empty_declarations.push(toDeclaration(rule, declaration))
              SUMMARY.stats.summary.noEmptyDeclarations += 1
              declarations.splice(i, 1)
            }
          })
      })

    const {
      trim: TRIM,
      trim_comments: TRIM_COMMENTS,
      trim_removed_rules_previous_comment: TRIM_REMOVED_RULES_PREVIOUS_COMMENT
    } = OPTIONS

    if (TRIM || TRIM_COMMENTS) {
      rules
        .filter(Boolean)
        .forEach(({ declarations = [] }) => {
          declarations
            .filter(hasTypeComment)
            .forEach((declarations, declaration, i) => {
              declarations.splice(i, 1)
            })
        })
    }

    if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
      /**
       *  This gets adjacent rules (before and after) which means lots of conditions.
       *  It's simpler not to filter but to just roll with the conditions
       */
      rules
        .forEach((alpha, i) => {
          if (alpha) {
            if (alpha.selectors) {
              const j = i + 1
              rules.slice(j)
                .forEach((omega) => {
                  if (omega) {
                    if (omega.selectors) {
                      const ALPHA = alpha.selectors.toString()
                      const OMEGA = omega.selectors.toString()
                      if (ALPHA === OMEGA) {
                        const n = i - 1
                        const delta = rules[n]
                        if (delta) {
                          if (delta.type === 'comment') rules.splice(n, 1)
                        }
                      }
                    }
                  }
                })
            }
          }
        })

      rules
        .forEach((alpha, i) => {
          if (alpha) {
            if (alpha.selectors) {
              const j = i + 1
              rules.slice(j)
                .forEach((omega, m) => {
                  if (omega) {
                    if (omega.selectors) {
                      const ALPHA = alpha.selectors.toString()
                      const OMEGA = omega.selectors.toString()
                      if (ALPHA === OMEGA) {
                        SUMMARY.duplicate_rules.push(toDuplicate(omega))
                        SUMMARY.stats.summary.noDuplicateRules += 1

                        alpha.declarations = (
                          alpha.declarations
                            .concat(omega.declarations)
                        )

                        const n = j + m // rules.findIndex((rule) => rule === omega)
                        rules.splice(n, 1)
                      }
                    }
                  }
                })
            }
          }
        })

      const {
        bypass_media_rules: BYPASS_MEDIA_RULES
      } = OPTIONS

      if (!BYPASS_MEDIA_RULES) {
        rules
          .forEach((alpha, i) => {
            if (alpha) {
              if (alpha.type === 'media' && alpha.media) {
                const j = i + 1
                rules.slice(j)
                  .forEach((omega) => {
                    if (omega) {
                      if (omega.media) {
                        const ALPHA = alpha.media.toString()
                        const OMEGA = omega.media.toString()
                        if (ALPHA === OMEGA) {
                          const n = i - 1
                          const delta = rules[n]
                          if (delta) {
                            if (delta.type === 'comment') rules.splice(n, 1)
                          }
                        }
                      }
                    }
                  })
              }
            }
          })

        rules
          .forEach((alpha, i) => {
            if (alpha) {
              if (alpha.type === 'media' && alpha.media) {
                const j = i + 1
                rules.slice(j)
                  .forEach((omega, m) => {
                    if (omega) {
                      if (omega.media) {
                        const ALPHA = alpha.media.toString()
                        const OMEGA = omega.media.toString()
                        if (ALPHA === OMEGA) {
                          SUMMARY.duplicate_rules.push(toDuplicateMedia(omega))
                          SUMMARY.stats.summary.noDuplicateRules += 1

                          alpha.rules = (
                            alpha.rules
                              .concat(omega.rules)
                          )

                          const n = j + m // rules.findIndex((rule) => rule === omega)
                          rules.splice(n, 1)
                        }
                      }
                    }
                  })
              }
            }
          })
      }

      rules
        .forEach((alpha, i) => {
          if (alpha) {
            if (alpha.type === 'document' && alpha.document) {
              const j = i + 1
              rules.slice(j)
                .forEach((omega) => {
                  if (omega) {
                    if (omega.document) {
                      const ALPHA = alpha.document.toString()
                      const OMEGA = omega.document.toString()
                      if (ALPHA === OMEGA) {
                        const n = i - 1
                        const delta = rules[n]
                        if (delta) {
                          if (delta.type === 'comment') rules.splice(n, 1)
                        }
                      }
                    }
                  }
                })
            }
          }
        })

      rules
        .forEach((alpha, i) => {
          if (alpha) {
            if (alpha.type === 'document' && alpha.document) {
              const j = i + 1
              rules.slice(j)
                .forEach((omega, m) => {
                  if (omega) {
                    if (omega.document) {
                      const ALPHA = alpha.document.toString()
                      const OMEGA = omega.document.toString()
                      if (ALPHA === OMEGA) {
                        SUMMARY.duplicate_rules.push(toDuplicateDocument(omega))
                        SUMMARY.stats.summary.noDuplicateRules += 1

                        alpha.rules = (
                          alpha.rules
                            .concat(omega.rules)
                        )

                        const n = j + m // rules.findIndex((rule) => rule === omega)
                        rules.splice(n, 1)
                      }
                    }
                  }
                })
            }
          }
        })

      rules
        .forEach((alpha, i) => {
          if (alpha) {
            if (alpha.type === 'supports' && alpha.supports) {
              const j = i + 1
              rules.slice(j)
                .forEach((omega) => {
                  if (omega) {
                    if (omega.supports) {
                      const ALPHA = alpha.supports.toString()
                      const OMEGA = omega.supports.toString()
                      if (ALPHA === OMEGA) {
                        const n = i - 1
                        const delta = rules[n]
                        if (delta) {
                          if (delta.type === 'comment') rules.splice(n, 1)
                        }
                      }
                    }
                  }
                })
            }
          }
        })

      rules
        .forEach((alpha, i) => {
          if (alpha) {
            if (alpha.type === 'supports' && alpha.supports) {
              const j = i + 1
              rules.slice(j)
                .forEach((omega, m) => {
                  if (omega) {
                    if (omega.supports) {
                      const ALPHA = alpha.supports.toString()
                      const OMEGA = omega.supports.toString()
                      if (ALPHA === OMEGA) {
                        SUMMARY.duplicate_rules.push(toDuplicateSupports(omega))
                        SUMMARY.stats.summary.noDuplicateRules += 1

                        alpha.rules = (
                          alpha.rules
                            .concat(omega.rules)
                        )

                        const n = j + m // rules.findIndex((rule) => rule === omega)
                        rules.splice(n, 1)
                      }
                    }
                  }
                })
            }
          }
        })
    }

    const {
      bypass_page_rules: BYPASS_PAGE_RULES
    } = OPTIONS

    rules
      .forEach((rule) => {
        if (rule) {
          if (rule.type === 'rule' || (rule.type === 'page' && !BYPASS_PAGE_RULES)) {
            const {
              declarations = []
            } = rule

            const propertyMap = getPropertyMapFor(declarations)

            const declarationMap = new Map()

            propertyMap
              .forEach((count, alpha) => {
                if (!DECLARATION_NAMES.includes(alpha)) {
                  declarations
                    .forEach((declaration) => {
                      const {
                        type
                      } = declaration

                      if (type === 'declaration') {
                        const {
                          property: omega
                        } = declaration

                        if (alpha === omega) {
                          const {
                            value
                          } = declaration

                          const properties = declarationMap.get(omega) ?? new Map()
                          const values = properties.get(value) ?? new Set()
                          declarationMap.set(omega, properties.set(value, values.add(declaration)))
                        }
                      }
                    })
                }
              })

            if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
              declarationMap
                .forEach((properties) => {
                  properties
                    .forEach((values) => {
                      values
                        .forEach((declaration) => {
                          if (declarations.includes(declaration)) {
                            const n = declarations.indexOf(declaration) - 1
                            const delta = declarations[n]
                            if (delta) {
                              if (delta.type === 'comment') declarations.splice(n, 1)
                            }
                          }
                        })
                    })
                })
            }

            declarationMap
              .forEach((properties) => {
                properties
                  .forEach((values) => {
                    values
                      .forEach((declaration) => {
                        if (values.size > 1) {
                          if (declarations.includes(declaration)) {
                            SUMMARY.duplicate_declarations.push(declaration)
                            SUMMARY.stats.summary.noDuplicateDeclarations += 1

                            const i = declarations.indexOf(declaration)
                            declarations.splice(i, 1)
                          }

                          values.delete(declaration)
                        }
                      })
                  })
              })

            if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
              DECLARATION_NAMES
                .forEach((DECLARATION_NAME) => {
                  propertyMap
                    .forEach((count, property) => {
                      /**
                       *  Do nothing if the initial count is 1
                       */
                      if (count > 1) {
                        declarations
                          .forEach((declaration, i) => {
                            if (declaration.type === 'declaration' && declaration.property === property) {
                              if (declaration.property === DECLARATION_NAME) {
                                const n = i - 1
                                const omega = declarations[n]
                                if (omega) {
                                  if (omega.type === 'comment') declarations.splice(n, 1)
                                }
                              }
                            }
                          })
                      }
                    })
                })
            }

            DECLARATION_NAMES
              .forEach((DECLARATION_NAME) => {
                propertyMap
                  .forEach((count, property) => {
                    /**
                     *  Do nothing if the initial count is 1
                     */
                    if (count > 1) {
                      declarations
                        .forEach((alpha, i) => {
                          if (alpha.type === 'declaration' && alpha.property === property) {
                            /**
                             *  Do nothing if the current count is 1
                             */
                            const count = propertyMap.get(property)
                            if (count > 1) {
                              if (alpha.property === DECLARATION_NAME) {
                                if (alpha.value.includes('!important')) {
                                  const n = i + 1
                                  const omega = declarations[n]
                                  if (omega) {
                                    SUMMARY.duplicate_declarations.push(omega)
                                    SUMMARY.stats.summary.noDuplicateDeclarations += 1
                                    declarations.splice(n, 1)
                                  }
                                } else {
                                  SUMMARY.duplicate_declarations.push(alpha)
                                  SUMMARY.stats.summary.noDuplicateDeclarations += 1
                                  declarations.splice(i, 1)
                                }
                                propertyMap.set(property, count - 1)
                              }
                            }
                          }
                        })
                    }
                  })
              })
          }
        }
      })

    if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
      rules
        .forEach((rule, i) => {
          if (rule.keyframes && !rule.keyframes.length) {
            const n = i - 1
            const delta = rules[n]
            if (delta) {
              if (delta.type === 'comment') rules.splice(n, 1)
            }
          }
        })
    }

    rules
      .forEach((rule, i) => {
        if (rule.keyframes && !rule.keyframes.length) rules.splice(i, 1)
      })

    if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
      rules
        .forEach((rule, i) => {
          if (rule.type === 'media' && !rule.rules.length) {
            const n = i - 1
            const delta = rules[n]
            if (delta) {
              if (delta.type === 'comment') rules.splice(n, 1)
            }
          }
        })
    }

    rules
      .forEach((rule, i) => {
        if (rule.type === 'media' && !rule.rules.length) rules.splice(i, 1)
      })

    if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
      rules
        .forEach((rule, i) => {
          if (rule.type === 'document' && !rule.rules.length) {
            const n = i - 1
            const delta = rules[n]
            if (delta) {
              if (delta.type === 'comment') rules.splice(n, 1)
            }
          }
        })
    }

    rules
      .forEach((rule, i) => {
        if (rule.type === 'document' && !rule.rules.length) rules.splice(i, 1)
      })

    if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
      rules
        .forEach((rule, i) => {
          if (rule.type === 'supports' && !rule.rules.length) {
            const n = i - 1
            const delta = rules[n]
            if (delta) {
              if (delta.type === 'comment') rules.splice(n, 1)
            }
          }
        })
    }

    rules
      .forEach((rule, i) => {
        if (rule.type === 'supports' && !rule.rules.length) rules.splice(i, 1)
      })

    if (TRIM || TRIM_REMOVED_RULES_PREVIOUS_COMMENT) {
      rules
        .forEach((rule) => {
          if (rule) {
            if (rule.type === 'rule') {
              if (rule.selectors) {
                const ALPHA = rule.selectors.toString()

                SELECTORS
                  .forEach((OMEGA) => {
                    if (ALPHA === OMEGA) {
                      if (SELECTOR_PROPERTIES.has(OMEGA)) {
                        const {
                          declarations = []
                        } = rule

                        const propertyMap = getPropertyMapFor(declarations)

                        propertyMap
                          .forEach((count) => { // (count, property) => {
                            if (count > 1) {
                              declarations
                                .forEach((declaration, i) => {
                                  if (declaration.type === 'declaration' && declaration.property === OMEGA) {
                                    const properties = SELECTOR_PROPERTIES.get(OMEGA)
                                    if (properties.includes(declaration.property)) {
                                      const count = propertyMap.get(OMEGA)
                                      if (count > 1) {
                                        const n = i - 1
                                        const delta = declarations[n]
                                        if (delta) {
                                          if (delta.type === 'comment') declarations.splice(n, 1)
                                        }
                                      }
                                    }
                                  }
                                })
                            }
                          })
                      }
                    }
                  })
              }
            }
          }
        })
    }

    rules
      .forEach((rule) => {
        if (rule) {
          if (rule.type === 'rule') {
            if (rule.selectors) {
              const ALPHA = rule.selectors.toString()

              SELECTORS
                .forEach((OMEGA) => {
                  if (ALPHA === OMEGA) {
                    if (SELECTOR_PROPERTIES.has(OMEGA)) {
                      const {
                        declarations = []
                      } = rule

                      const propertyMap = getPropertyMapFor(declarations)

                      propertyMap
                        .forEach((count) => { // (count, property) => {
                          if (count > 1) {
                            declarations
                              .forEach((declaration, i) => {
                                if (declaration.type === 'declaration' && declaration.property === OMEGA) {
                                  const properties = SELECTOR_PROPERTIES.get(OMEGA)
                                  if (properties.includes(declaration.property)) {
                                    const count = propertyMap.get(OMEGA)
                                    if (count > 1) {
                                      SUMMARY.duplicate_declarations.push(declaration)
                                      SUMMARY.stats.summary.noDuplicateDeclarations += 1
                                      declarations.splice(i, 1)
                                    }
                                  }
                                }
                              })
                          }
                        })
                    }
                  }
                })
            }
          }
        }
      })

    /*
    let RULES_COUNT = rules.length

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
        if (
          rules[i] !== undefined && rules[i].type === 'media' &&
          rules[i].media !== undefined &&
          rules[j] !== undefined &&
          rules[j].media !== undefined &&
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
        if (
          rules[i] !== undefined && rules[i].type === 'document' &&
          rules[i].document !== undefined &&
          rules[j] !== undefined &&
          rules[j].document !== undefined) {
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
        if (
          rules[i] !== undefined && rules[i].type === 'supports' &&
          rules[i].supports !== undefined &&
          rules[j] !== undefined &&
          rules[j].supports !== undefined) {
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

      if (
        rules[i] !== undefined &&
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
                  // console.log(key)
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
              const duplicateIds = declarationsValueCounts[key].id.split(',').map(toTrim).filter(Boolean)

              console.log(duplicateIds)

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

        // console.log({ DECLARATION_NAMES })

        // end of reduce according to values

          const declarationNamesCount = DECLARATION_NAMES.length

          for (let k = 0; k < declarationNamesCount; ++k) {
          // declarations reduction
            for (const key in declarationsNameCounts) {

              // console.log(2, key)

              if (declarationsNameCounts[key] > 1) {
                for (let l = 0; l < DECLARATION_COUNT; ++l) {
                  if (rules[i].declarations[l].type === 'declaration') {
                    if (rules[i].declarations[l].property === key &&
                    declarationsNameCounts[key] > 1 // leave behind 1
                    ) {
                    // reduce according to list

                      // console.log(2, DECLARATION_NAMES[k])

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
                          console.log(rules[i].declarations[l])

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
      for (let k = 0; k < SELECTORS_COUNT; ++k) {
        if (rules[i] !== undefined &&
          rules[i].type === 'rule') {
          if (rules[i].selectors !== undefined && rules[i].selectors.toString() === selectors[k]) {
            let DECLARATION_COUNT = rules[i].declarations.length

            const declarationsCounts = []

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
                      if (SELECTOR_PROPERTIES.has(key)) {
                        const selectorPropertiesList = SELECTOR_PROPERTIES.get(key)
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
    */

    console.log('EXIT PROCESS')
  } // end of undefined
} // end of processRules
