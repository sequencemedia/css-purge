export default function hasPropertyBorderRadius ({ property }) {
  return (
    property === 'border-top-left-radius' ||
    property === 'border-top-right-radius' ||
    property === 'border-bottom-left-radius' ||
    property === 'border-bottom-right-radius' ||
    property === 'border-radius'
  )
}
