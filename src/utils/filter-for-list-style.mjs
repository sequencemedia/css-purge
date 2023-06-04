export default function filterForListStyle ({ property }) {
  return (
    property === 'list-style-type' ||
    property === 'list-style-position' ||
    property === 'list-style-image' ||
    property === 'list-style'
  )
}
