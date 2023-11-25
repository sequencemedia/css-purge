export default function escape (value) {
  return (
    value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // eslint-disable-line no-useless-escape
  )
}
