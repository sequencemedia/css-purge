export default function hasBody ({ selectors = [] }) {
  return selectors.some((selector) => selector.includes('body'))
}
