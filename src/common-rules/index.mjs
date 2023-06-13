import hasSelectors from '../utils/selectors/has-selectors.mjs'

function getCommonSelectorsFor (selectorLineage) {
  return function reduceCommonSelectorsFor (commonSelectors, s, i) {
    if (i) {
      let p = ''

      let n = i
      do {
        const j = i - n
        p += selectorLineage[j] + ' '
      } while (--n) // n = n - 1

      p += s

      if (!commonSelectors[p]) commonSelectors[p] = 0
      commonSelectors[p] += 1
    } else {
      if (!commonSelectors[s]) commonSelectors[s] = 0
      commonSelectors[s] += 1
    }

    return commonSelectors
  }
}

function getCommonSelectorsForSelectorLineage (commonSelectors, selectorLineage) {
  return (
    selectorLineage
      .reduce(getCommonSelectorsFor(selectorLineage), commonSelectors)
  )
}

const hasSelectorLineage = (selector) => selector.trim().includes(' ')

const getSelectorLineage = (selector) => selector.trim().split(' ')

const hasParentSelector = (selector) => selector.trim().includes(' ')

function getParentSelector (selector) {
  const parentSelector = [
    ...selector.trim().split(' ')
  ]
  parentSelector.pop() // remove last item
  return (
    parentSelector.join(' ').trim()
  )
}

function getCommonParentRulesFor (parentSelector) {
  return function reduceCommonParentRulesFor (commonParentRules, { selector, index }) {
    return commonParentRules.concat({
      selector: parentSelector,
      index,
      childSelector: selector
    })
  }
}

function hasCommonSelectorFor (commonSelector) {
  return function hasCommonSelector ({ selector }) {
    return selector === commonSelector
  }
}

function getCommonSelectorsForRule (commonSelectors, { selectors }, i) {
  return (
    selectors
      .filter(hasSelectorLineage)
      .map(getSelectorLineage)
      .reduce(getCommonSelectorsForSelectorLineage, commonSelectors)
  )
}

function getChildRules (index) {
  return function reduceChildRules (parentRules, selector) {
    const parentSelector = getParentSelector(selector)

    if (parentSelector) {
      if (!parentRules[parentSelector]) parentRules[parentSelector] = []
      const childRules = parentRules[parentSelector]
      childRules
        .push({
          selector,
          index
        })
    }

    return parentRules
  }
}

function getParentRulesForRule (parentRules, { selectors }, i) {
  return (
    selectors
      .filter(hasParentSelector)
      .reduce(getChildRules(i), parentRules)
  )
}

export function getCommonSelectors (rules) {
  return (
    rules
      .filter(hasSelectors)
      .reduce(getCommonSelectorsForRule, {})
  )
}

export function getParentRules (rules) {
  return (
    rules
      .filter(hasSelectors)
      .reduce(getParentRulesForRule, {})
  )
}

function getCommonParentRulesFromChildRules (commonSelector, parentSelector, childRules, commonParentRules) {
  if (childRules.length > 1) {
    return (
      childRules
        .filter(hasCommonSelectorFor(commonSelector))
        .reduce(getCommonParentRulesFor(parentSelector), commonParentRules)
    )
  }

  return commonParentRules
}

function getCommonParentRulesForParentSelector (commonSelector) {
  return function reduceCommonParentRulesForParentSelector (commonParentRules, [parentSelector, childRules]) {
    return getCommonParentRulesFromChildRules(commonSelector, parentSelector, childRules, commonParentRules)
  }
}

function getCommonParentRulesFromParentEntries (parentEntries, commonSelector, commonParentRules = []) {
  return (
    parentEntries
      .reduce(getCommonParentRulesForParentSelector(commonSelector), commonParentRules)
  )
}

function getCommonParentRulesForCommonSelector (parentEntries) {
  return function reduceCommonParentRulesForCommonSelector (commonParentRules, [commonSelector]) {
    return getCommonParentRulesFromParentEntries(parentEntries, commonSelector, commonParentRules)
  }
}

function getCommonParentRulesFromCommonEntries (commonEntries, parentEntries, commonParentRules = []) {
  return (
    commonEntries
      .reduce(getCommonParentRulesForCommonSelector(parentEntries), commonParentRules)
  )
}

export function getCommonParentRules (commonSelectors, parentRules) {
  const commonEntries = Object.entries(commonSelectors).sort(([alpha], [omega]) => omega.localeCompare(alpha)) // "omega - alpha" not "alpha - omega"
  const parentEntries = Object.entries(parentRules)

  return (
    getCommonParentRulesFromCommonEntries(commonEntries, parentEntries)
  )
}

function getCommonParentDeclarationsFor (commonParentRule, rule) {
  return function getCommonParentDeclarations (commonParentDeclarations, declaration) {
    const {
      property,
      value
    } = declaration

    const key = property + '_' + value
    let commonParentDeclaration = commonParentDeclarations[key]

    if (commonParentDeclaration) {
      commonParentDeclaration.count += 1
    } else {
      commonParentDeclaration = {
        property,
        value,
        count: 1,
        selector: rule.selectors,
        selectorIndex: commonParentRule.index,
        parentSelector: commonParentRule.selector
      }

      commonParentDeclarations[key] = commonParentDeclaration
    }

    return commonParentDeclarations
  }
}

export function getCommonParentDeclarations (commonParentRules, rules) {
  return (
    commonParentRules // get declarations
      .reduce((commonParentDeclarations, commonParentRule) => {
        const {
          index
        } = commonParentRule

        const rule = rules[index]

        const {
          declarations
        } = rule

        if (Array.isArray(declarations)) {
          return (
            declarations
              .reduce(getCommonParentDeclarationsFor(commonParentRule, rule), commonParentDeclarations)
          )
        }

        return commonParentDeclarations
      }, {})
  )
}

function getParentDeclarationsForCommonParentDeclaration (parentDeclarations, commonParentDeclaration) {
  const {
    parentSelector,
    property,
    value
  } = commonParentDeclaration

  let parentDeclaration = parentDeclarations[parentSelector]

  const declaration = {
    type: 'declaration',
    property,
    value
  }

  if (parentDeclaration) {
    parentDeclaration.declarations.push(declaration)
  } else {
    const {
      selectorIndex
    } = commonParentDeclaration

    parentDeclaration = {
      declarations: [
        declaration
      ],
      selectorIndex
    }

    parentDeclarations[parentSelector] = parentDeclaration
  }

  return parentDeclarations
}

function hasCommonParentDeclarationFor (parentRules) {
  return function hasCommonParentDeclaration ({ count, parentSelector }) {
    return (count === parentRules[parentSelector].length)
  }
}

export function getParentDeclarations (commonParentDeclarations, parentRules) {
  return (
    Object
      .values(commonParentDeclarations)
      .filter(hasCommonParentDeclarationFor(parentRules))
      .reduce(getParentDeclarationsForCommonParentDeclaration, {})
  )
}
