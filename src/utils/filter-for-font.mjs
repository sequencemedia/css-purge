export default function filterForFont ({ property }) {
  return (
    property === 'font-style' ||
    property === 'font-variant' ||
    property === 'font-weight' ||
    property === 'font-stretch' ||
    property === 'font-size' ||
    property === 'line-height' ||
    property === 'font-family' ||
    property === 'font'
  )
}
