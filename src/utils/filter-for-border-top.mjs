export default function filterForBorderTop ({ property }) {
  return (
    property === 'border-top-width' ||
    property === 'border-top-style' ||
    property === 'border-top-color' ||
    property === 'border-top'
  )
}
