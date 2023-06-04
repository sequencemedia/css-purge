export default function filterForBorder ({ property }) {
  return (
    property === 'border' ||
    property === 'border-width' ||
    property === 'border-style' ||
    property === 'border-color'
  )
}
