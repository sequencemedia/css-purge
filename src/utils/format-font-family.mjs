import formatFont from './format-font.mjs'

export default function formatFontFamily (fontFamily) {
  return (
    fontFamily.split(',').map(formatFont).join(',')
  )
}
