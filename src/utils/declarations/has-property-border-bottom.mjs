export default function hasPropertyBorderBottom ({ property }) {
  return (
    property === 'border-bottom-width' ||
    property === 'border-bottom-style' ||
    property === 'border-bottom-color' ||
    property === 'border-bottom'
  )
}
