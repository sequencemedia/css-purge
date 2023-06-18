export default function escape (value) {
  return (
    value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  )
}
