export default function filterForBorderLeft ({ property }) {
  return (
    property === 'border-left-width' ||
    property === 'border-left-style' ||
    property === 'border-left-color' ||
    property === 'border-left'
  )
}
