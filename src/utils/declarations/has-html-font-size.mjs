import filterForFontSize from '../filter-for-font-size.mjs'

export default function hasHtmlFontSize (rule) {
  const {
    selectors = []
  } = rule

  return selectors.some((selector) => {
    if (selector.includes('html')) {
      const {
        declarations = []
      } = rule

      return declarations.some(filterForFontSize)
    }

    return false
  })
}
