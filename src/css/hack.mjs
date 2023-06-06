import trim from './trim.mjs'

export default function hack (css, OPTIONS, SUMMARY, {
  _3tokenValues = [],
  _4tokenValues = [],
  _5tokenValues = [],
  _6tokenValues = [],
  _7tokenValues = [],
  tokenComments = {}
} = {}) {
  // tokens
  /// /hacks
  /// **/
  css = css.replace(/(_1token_hck)/g, '/**/')

  /// *\**/
  css = css.replace(/(_2token_hck)/g, '/*\\**/')

  // (specialchar)property
  css = css.replace(/(_3token_hck_([0-9]*): ;)/g, (match) => {
    const value = _3tokenValues[match.substring(12, match.length - 3) - 1]
    return value + ';'
  })

  // (;
  css = css.replace(/(_4token_hck_)[0-9]*[:][\s]*[;]/g, (match) => {
    const value = _4tokenValues[match.substring(12, match.length - 3) - 1]
    return value.substring(0, value.length - 2)
  })

  // [;
  css = css.replace(/(_5token_hck_)[0-9]*[:][\s]*[;]/g, (match) => {
    const value = _5tokenValues[match.substring(12, match.length - 3) - 1]
    return value.substring(0, value.length - 2)
  })

  // tokens - data:image
  css = css.replace(/(_6token_dataimage_)[0-9]*[:][\s]*/g, (match) => {
    const value = _6tokenValues[match.substring(18, match.length - 1) - 1]
    return value + ';'
  })

  // tokens - allow multi-keyframe selectors
  css = css.replace(/(@keyframes _7token_)[0-9]*[\s]*/g, (match) => {
    const value = _7tokenValues[match.substring(19, match.length) - 1]
    return trim(value, OPTIONS, SUMMARY)
  })

  // tokens - replace side comments
  Object
    .entries(tokenComments)
    .forEach(([key, value]) => {
      const regExp = new RegExp(`([\\n\\r\\t]*)(\\s*)\\/\\*(${key})\\*\\/`, 'gm')
      css = css.replace(regExp, value)
    })
  // tokens - end of replace side comments

  return css
}
