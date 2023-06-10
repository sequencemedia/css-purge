export default function hasPropertyBorder ({ property }) {
  return (
    property === 'border' ||
    property === 'border-width' ||
    property === 'border-style' ||
    property === 'border-color'
  )
}
