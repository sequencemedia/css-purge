export default function getSelectors ({ selectors = [] }, collector = [], ignorable = []) {
  const hasSelectors = (
    selectors.length
      ? !ignorable.some((selector) => selectors.includes(selector))
      : false
  )

  if (hasSelectors) {
    selectors
      .forEach((selector) => {
        collector.push(selector)
      })
  }
}
