export default function hasPropertyMargin ({ property }) {
  return (
    property === 'margin-top' ||
    property === 'margin-right' ||
    property === 'margin-bottom' ||
    property === 'margin-left' ||
    property === 'margin'
  )
}
