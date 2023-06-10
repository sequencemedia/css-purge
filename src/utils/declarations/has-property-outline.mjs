export default function hasPropertyOutline ({ property }) {
  return (
    property === 'outline-width' ||
    property === 'outline-style' ||
    property === 'outline-color' ||
    property === 'outline'
  )
}
