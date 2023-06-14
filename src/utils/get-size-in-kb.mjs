export default function getSizeInKB (data) {
  const {
    byteLength
  } = Buffer.from(data)

  return (
    byteLength / 1000
  )
}
