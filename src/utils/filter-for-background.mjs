export default function filterForBackground ({ property }) {
  return (
    property === 'background-color' ||
    property === 'background-image' ||
    property === 'background-repeat' ||
    property === 'background-attachment' ||
    property === 'background-position' ||
    property === 'background'
  )
}
