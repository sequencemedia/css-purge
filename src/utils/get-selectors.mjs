export default function getSelectors ({ selectors }, collector = [], ignoreSelectors = []) {
  const hasSelectors = Array.isArray(selectors)
    ? ignoreSelectors.some((selector) => selectors.includes(selector))
    : false

  if (!hasSelectors) {
    selectors
      .forEach((selector) => {
        collector.push(selector)
      })
  }
}
