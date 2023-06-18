import escape from '#utils/escape'

function has (collection) {
  return function match (member) {
    return collection.includes(member)
  }
}

function getRemoveUnusedSelectors (rules, selectors, i) {
  return function removeUnusedSelectors (rule) {
    selectors
      .forEach(getRemoveUnusedSelector(rules, selectors, rule, i))
  }
}

function getRemoveUnusedSelector (rules, selectors, rule, i) {
  return function removeUnusedSelector (selector) {
    const pattern = `^(.${selector}|${selector})$`
    const regExp = (
      selector.includes('[') ||
      selector.includes('*')
    )
      ? new RegExp(escape(pattern, 'gm'))
      : new RegExp(pattern, 'gm')

    const {
      selectors: SELECTORS
    } = rule

    if (SELECTORS.join(',').match(regExp)) {
      if (SELECTORS.length > 1) {
        if (!SELECTORS.some(has(selectors))) rules.splice(i, 1)
      } else {
        rules.splice(i, 1)
      }
    }
  }
}

function getRemoveUnusedSelectorsForRules (rules, selectors) {
  return function removeUnusedSelectorsForRules (rule, i) {
    const {
      type
    } = rule

    if (type === 'rule') {
      selectors
        .forEach(getRemoveUnusedSelector(rules, selectors, rule, i))
    } else {
      if (
        type === 'document' ||
        type === 'supports' ||
        type === 'media'
      ) {
        const {
          rules
        } = rule

        if (Array.isArray(rules)) {
          rules
            .forEach(getRemoveUnusedSelectors(rules, selectors, i))
        }
      }
    }
  }
}

export default function removeUnused (rules, selectors) {
  rules
    .forEach(getRemoveUnusedSelectorsForRules(rules, selectors))
}
