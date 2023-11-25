// imports - move imports to start of file
function moveImports (css) {
  let imports = ''
  css = css.replace(/@import.*(([\n\r\t]*)(\s*)\/\*(_cssp_sc).\*\/)?([\n\r\t])+/gm, (match) => {
    imports += match.substring(0, match.length - 1)
    return ''
  })
  return (
    imports + css
  )
}

// charset - move charset to start of file
function moveCharset (css) {
  let charset = ''
  css = css.replace(/@charset.*(([\n\r\t]*)(\s*)\/\*(_cssp_sc).\*\/)?([\n\r\t])+/gm, (match) => {
    charset += match
    return ''
  })
  return (
    charset + css
  )
}

export default function trim (css, OPTIONS, SUMMARY) {
  css = moveImports(css)
  css = moveCharset(css)

  if (OPTIONS.trim_breaklines || OPTIONS.trim) {
    // remove any carriage returns
    css = css.replace(/\r?\n|\r/g, '')
  }

  if (OPTIONS.trim_whitespace || OPTIONS.trim_comments || OPTIONS.trim) {
    // remove any left over comments and tabs
    css = css.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\t]+/g, '')
  }

  if (OPTIONS.trim_whitespace || OPTIONS.trim) {
    // remove single adjacent spaces
    css = (
      css
        .replace(/ {2,}/g, ' ')
        .replace(/ ([{:}]) /g, '$1')
        .replace(/([{:}]) /g, '$1')
        .replace(/([;,]) /g, '$1')
        .replace(/\(\s*/g, '(')
        .replace(/\s*\)/g, ')')
        .replace(/ !/g, '!')
    )
  }

  if (OPTIONS.trim_last_semicolon || OPTIONS.trim) {
    css = css.replace(/{([^}]*)}/gm, function (match, capture) {
      SUMMARY.stats.summary.noLastSemiColonsTrimmed += 1
      // "{" + capture + "}";' was not found
      return `{${capture.replace(/\;(?=[^;]*$)/, '')}}` // eslint-disable-line no-useless-escape
    })
  }

  return css
}
