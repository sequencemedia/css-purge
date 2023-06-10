export default function hasPropertyBorderRight ({ property }) {
  return (
    property === 'border-right-width' ||
    property === 'border-right-style' ||
    property === 'border-right-color' ||
    property === 'border-right'
  )
}
