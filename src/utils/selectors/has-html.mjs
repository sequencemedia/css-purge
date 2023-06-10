export default function hasHtml ({ selectors = [] }) {
  return selectors.some((selector) => selector.includes('html'))
}
