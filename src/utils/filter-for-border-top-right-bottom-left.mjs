export default function filterForBorderTopRightBottomLeft ({ property }) {
  return (
    property === 'border-top' ||
    property === 'border-right' ||
    property === 'border-bottom' ||
    property === 'border-left' ||
    property === 'border-top-width' ||
    property === 'border-right-width' ||
    property === 'border-bottom-width' ||
    property === 'border-left-width'
  )
}
