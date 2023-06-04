export default function processRules (rules, options) {
  if (rules !== undefined) {
    let TOTAL_RULES = rules.length

    // reduce common declarations amongst children into parent
    if (options.new_reduce_common_into_parent) {
      let directParents = []
      let hierachy = []
      let hierachyKeys = []
      let hierachyLen = 0
      let selectedHierachyLevel = 0
      const commonParentsIdx = -1
      let commonParentsKeys = []
      let commonParents = []
      let commonParentsLen = 0
      const commonParent = ''
      const commonParent2 = ''
      const commonParentTotal = 0
      let commonParentDeclarations = []
      const commonLineage = ''
      let newParentDeclarations = []
      let processedCommonParentsChildren = []
      let classLineage = ''
      let parentClassLineage = ''
      let lineageLabel = ''
      let tmpDeclarations = []

      // let declarationsNameCounts //  = []
      // const selectorPropertiesList = []
      // const declarationsCounts = []
      // let DECLARATION_COUNT

      rules.forEach((rule) => {
        if (rule.selectors !== undefined) {
          rule.selectors.forEach((selector) => {
            if (selector.includes('.')) {
              const classLineage = selector.split(' ')
              const parentClassLineage = classLineage.slice(0) // clone
              parentClassLineage.pop()
              parentClassLineage = parentClassLineage.join(' ')

              if (parentClassLineage) {
                if (Array.isArray(directParents[parentClassLineage])) {
                  directParents[parentClassLineage].push({
                    selector,
                    index: i
                  })
                } else {
                  directParents[parentClassLineage] = [{
                    selector,
                    index: i
                  }]
                }
              }

              classLineage.forEach((lineageLabel, i) => {
                if (i > 0) {
                  for (let j = i; j > 0; j--) {
                    lineageLabel += classLineage[i - j] + ' '
                  }
                }

                if (!Reflect.has(hierachy, lineageLabel)) {
                  hierachy[lineageLabel] = 0
                }

                hierachy[lineageLabel] += 1
              })
            } // end of if
          })
        }
      })
      for (let i = 0; i < TOTAL_RULES; ++i) {
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
                  if (options.verbose) { console.log(success('Process - Rules - Group Common Parent Rule : ' + keys[i])) }
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
              let DECLARATION_COUNT = tmpDeclarations.length

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
      TOTAL_RULES = rules.length
    } // end of reduce common declarations amongst children into parent

    for (let i = 0; i < TOTAL_RULES; ++i) {
      /// /comments
      // checking declarations for comments
      if (rules[i] !== undefined && rules[i].declarations !== undefined) {
        declarations = rules[i].declarations
        let DECLARATION_COUNT = declarations.length

        for (let j = 0; j < DECLARATION_COUNT; ++j) {
          // check for empty properties
          if (rules[i].declarations[j].value == '') {
            summary.empty_declarations.push({
              selectors: rules[i].selectors,
              property: rules[i].declarations[j]
            })
          }

          // remove comments in declarations - for turning off comments
          if (options.trim_comments || options.trim) {
            if (declarations[j] !== undefined && declarations[j].type == 'comment') {
              if (options.verbose) { console.log(info('Process - Rules - Remove Comment')) }
              rules[i].declarations.splice(j, 1)
              j -= 1
              DECLARATION_COUNT -= 1
            }
          }
        }
      }

      // remove comments in root - for turning off comments
      if (options.trim_comments || options.trim) {
        if (rules[i] !== undefined && rules[i].type == 'comment') {
          if (options.verbose) { console.log(info('Process - Rules - Remove Comment')) }
          rules.splice(i, 1)
          i -= 1
          TOTAL_RULES -= 1
        }
      }
      /// /end of comments
      /// /rules
      // remove duplicate root rules
      for (let j = i + 1; j < TOTAL_RULES; ++j) {
        // console.log(j, TOTAL_RULES)
        // root rules
        // rule selector
        if (rules[i] !== undefined &&
          // && rules[i].type == 'rule'
          rules[i].selectors !== undefined &&
          rules[j] !== undefined && rules[j].selectors !== undefined) {
          // duplicate rule found
          if (rules[i].selectors.toString() == rules[j].selectors.toString()) {
            // remove previous comment in root
            if (options.trim_removed_rules_previous_comment || options.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                rules.splice(i - 1, 1)
                i -= 1
                j -= 1
                TOTAL_RULES -= 1
              }
            }

            if (options.verbose) { console.log(success('Process - Rules - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

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
            TOTAL_RULES -= 1
          }
        } // end of rule selector

        // media selector - it could affect evaluation sequence
        if (rules[i] !== undefined && rules[i].type == 'media' &&
          rules[i].media !== undefined &&
          rules[j] !== undefined && rules[j].media !== undefined &&
          options.bypass_media_rules != true) {
          // duplicate rule found
          if (rules[i].media.toString() == rules[j].media.toString()) {
            // remove previous comment in root
            if (options.trim_removed_rules_previous_comment || options.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                rules.splice(i - 1, 1)
                i -= 1
                j -= 1
                TOTAL_RULES -= 1
              }
            }

            if (options.verbose) { console.log(info('Process - Rules - @media - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

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
            TOTAL_RULES -= 1
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
            if (options.trim_removed_rules_previous_comment || options.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                rules.splice(i - 1, 1)
                i -= 1
                j -= 1
                TOTAL_RULES -= 1
              }
            }

            if (options.verbose) { console.log(success('Process - Rules - @document - Group Duplicate Rule : ' + (rules[j].selectors ? rules[j].selectors.join(', ') : ''))) }

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
            TOTAL_RULES -= 1
          }
        } // end of document selector

        // supports selector
        if (rules[i] !== undefined && rules[i].type == 'supports' &&
          rules[i].supports !== undefined &&
          rules[j] !== undefined && rules[j].supports !== undefined) {
          // duplicate rule found
          if (rules[i].supports.toString() == rules[j].supports.toString()) {
            // remove previous comment in root
            if (options.trim_removed_rules_previous_comment || options.trim) {
              if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
                rules.splice(i - 1, 1)
                i -= 1
                j -= 1
                TOTAL_RULES -= 1
              }
            }

            if (options.verbose) { console.log(success('Process - Rules - @supports - Group Duplicate Rule : ' + (rules[j].supports ? rules[j].supports : ''))) }

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
            TOTAL_RULES -= 1
          }
        } // end of supports selector
      } // end of j

      /// /end of rules
      /// /declarations
      // reduce root delcarations by property name and by duplicate values
      if (rules[i] !== undefined &&
        (rules[i].type == 'rule' || (rules[i].type == 'page' && options.bypass_page_rules == false))) {
        const declarationsNameCounts = []

        let DECLARATION_COUNT = rules[i].declarations.length

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
        const declarationsValueCounts = []
        let valKey = ''

        // detect duplicate values
        for (const key in declarationsNameCounts) {
          if (!declarationNames.includes(key)) { // only properties not in list
            for (let l = 0; l < DECLARATION_COUNT; ++l) {
              if (rules[i].declarations[l].type == 'declaration' &&
                rules[i].declarations[l].property == key) {
                hash = crypto.createHash('sha256')
                hash.update(rules[i].declarations[l].property + rules[i].declarations[l].value)

                valKey = hash.digest('hex')

                if (declarationsValueCounts[valKey] !== undefined) {
                  declarationsValueCounts[valKey].id += ',' + l
                  declarationsValueCounts[valKey].count += 1
                } else {
                  declarationsValueCounts[valKey] = {
                    id: l,
                    count: 1
                  }
                }
              }
            }
          }
        }

        // remove duplicate declarations by duplicate values
        const declarationsValueCountsCount = Object.keys(declarationsValueCounts).length

        let amountRemoved = 1

        for (const key in declarationsValueCounts) {
          if (declarationsValueCounts.hasOwnProperty(key)) {
            if (declarationsValueCounts[key].count > 1) {
              duplicate_ids = declarationsValueCounts[key].id.split(',')

              amountRemoved = 1 // shift the ids by the amount removed
              for (let l = 0; l < duplicate_ids.length - 1; ++l) { // -1 to leave last behind
                // remove previous comment above declaration to be removed
                if (options.trim_removed_rules_previous_comment || options.trim) {
                  if (rules[i].declarations[duplicate_ids[l] - 1] !== undefined && rules[i].declarations[duplicate_ids[l] - 1].type == 'comment') {
                    rules[i].declarations.splice(duplicate_ids[l] - 1, 1)
                    DECLARATION_COUNT -= 1

                    // adjust removal ids by amount already removed
                    if (duplicate_ids[l] !== undefined) {
                      duplicate_ids[l] -= amountRemoved // shift the ids by the amount removed
                    }
                    amountRemoved += 1
                  }
                }

                if (options.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }

                summary.duplicate_declarations.push(rules[i].declarations[duplicate_ids[l]])
                summary.stats.summary.noDuplicateDeclarations += 1
                rules[i].declarations.splice(duplicate_ids[l], 1)
                DECLARATION_COUNT -= 1

                // adjust removal ids by amount already removed
                if (duplicate_ids[l + 1] !== undefined) {
                  duplicate_ids[l + 1] -= amountRemoved // shift the ids by the amount removed

                  // shift all the ids of the declarations afterwards
                  for (const key2 in declarationsValueCounts) {
                    if (declarationsValueCounts.hasOwnProperty(key2) && (key2 != key)) {
                      if (typeof declarationsValueCounts[key2].id === 'number') {
                        duplicate_ids = []
                        duplicate_ids[0] = declarationsValueCounts[key2].id
                      } else {
                        duplicate_ids = declarationsValueCounts[key2].id.split(',')
                      }

                      for (let l = 0; l < duplicate_ids.length; ++l) {
                        if (duplicate_ids[l] !== undefined) {
                          duplicate_ids[l] -= amountRemoved
                        }
                      }
                      declarationsValueCounts[key2].id = duplicate_ids.join()
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
                        if (options.trim_removed_rules_previous_comment || options.trim) {
                          if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type == 'comment') {
                            rules[i].declarations.splice(l - 1, 1)
                            l -= 1
                            DECLARATION_COUNT -= 1
                          }
                        }

                        if (options.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }

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
      let selectorPropertiesList = []
      const declarationsCounts = []

      for (let k = 0; k < selectorsCount; ++k) {
        if (rules[i] !== undefined &&
          rules[i].type == 'rule') {
          if (rules[i].selectors !== undefined && rules[i].selectors.toString() === selectors[k]) {
            let DECLARATION_COUNT = rules[i].declarations.length

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
                          if (options.trim_removed_rules_previous_comment || options.trim) {
                            if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type == 'comment') {
                              rules[i].declarations.splice(l - 1, 1)
                              l -= 1
                              DECLARATION_COUNT -= 1
                            }
                          }

                          if (options.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }
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
                          if (options.trim_removed_rules_previous_comment || options.trim) {
                            if (rules[i].declarations[l - 1] !== undefined && rules[i].declarations[l - 1].type == 'comment') {
                              rules[i].declarations.splice(l - 1, 1)
                              l -= 1
                              DECLARATION_COUNT -= 1
                            }
                          }

                          if (options.verbose) { console.log(success('Process - Declaration - Group Duplicate Declarations : ' + (rules[i].selectors ? rules[i].selectors.join(', ') : '') + ' - ' + (rules[i].declarations[l] !== undefined ? rules[i].declarations[l].property : ''))) }
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
        if (options.trim_removed_rules_previous_comment || options.trim) {
          if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
            if (options.verbose) { console.log(info('Process - @keyframes - Remove comment : ' + (rules[i].keyframes ? rules[i].keyframes.join(', ') : ''))) }
            rules.splice(i - 1, 1)
            i -= 1
            TOTAL_RULES -= 1
          }
        }

        if (options.verbose) { console.log(info('Process - @keyframes - Remove Empty Rule : ' + (rules[i].keyframes ? rules[i].keyframes.join(', ') : ''))) }

        rules.splice(i, 1)
        i -= 1
        TOTAL_RULES -= 1
      }

      // remove empty @sign media
      if (rules[i] !== undefined && rules[i].type == 'media' &&
        rules[i].rules.length == 0) {
        // remove previous comment in root
        if (options.trim_removed_rules_previous_comment || options.trim) {
          if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
            if (options.verbose) { console.log(info('Process - @media - Remove comment : ' + (rules[i].media ? rules[i].media : ''))) }
            rules.splice(i - 1, 1)
            i -= 1
            TOTAL_RULES -= 1
          }
        }
        if (options.verbose) { console.log(info('Process - @media - Remove Empty Rule : ' + (rules[i].media ? rules[i].media : ''))) }
        rules.splice(i, 1)
        i -= 1
        TOTAL_RULES -= 1
      }

      // remove empty @sign document
      if (rules[i] !== undefined && rules[i].type == 'document' &&
        rules[i].rules.length == 0) {
        // remove previous comment in root
        if (options.trim_removed_rules_previous_comment || options.trim) {
          if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
            if (options.verbose) { console.log(info('Process - @document - Remove comment : ' + (rules[i].document ? rules[i].document : ''))) }
            rules.splice(i - 1, 1)
            i -= 1
            TOTAL_RULES -= 1
          }
        }

        if (options.verbose) { console.log(info('Process - @document - Remove Empty Rule : ' + (rules[i].document ? rules[i].document : ''))) }
        rules.splice(i, 1)
        i -= 1
        TOTAL_RULES -= 1
      }

      // remove empty @sign supports
      if (rules[i] !== undefined && rules[i].type == 'supports' &&
        rules[i].rules.length == 0) {
        // remove previous comment in root
        if (options.trim_removed_rules_previous_comment || options.trim) {
          if (rules[i - 1] !== undefined && rules[i - 1].type == 'comment') {
            if (options.verbose) { console.log(info('Process - @supports - Remove comment : ' + (rules[i].supports ? rules[i].supports : ''))) }
            rules.splice(i - 1, 1)
            i -= 1
            TOTAL_RULES -= 1
          }
        }

        if (options.verbose) { console.log(info('Process - @supports - Remove Empty Rule : ' + (rules[i].supports ? rules[i].supports : ''))) }
        rules.splice(i, 1)
        i -= 1
        TOTAL_RULES -= 1
      }
      /// /end of empty nodes
    } // end of i
  } // end of undefined
} // end of processRules
