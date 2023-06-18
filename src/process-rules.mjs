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

export default function processRules (rules, OPTIONS, SUMMARY, PARAMS) {
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

    const {
      declaration_names: DECLARATION_NAMES
    } = PARAMS

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

    const {
      selectors: SELECTORS,
      selector_properties: SELECTOR_PROPERTIES
    } = PARAMS

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
  }
} // end of processRules
