export default function hasPropertyPadding ({ property }) {
  return (
    property === 'padding-top' ||
    property === 'padding-right' ||
    property === 'padding-bottom' ||
    property === 'padding-left' ||
    property === 'padding'
  )
}
