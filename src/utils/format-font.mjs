export default function formatFont (font) {
  const v = font.trim()

  return (
    v.includes(' ') && !(v.startsWith('"') || v.endsWith('"'))
      ? `"${v}"`
      : v
  )
}
