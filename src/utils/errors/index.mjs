import debug from 'debug'

const error = debug('@sequencemedia/css-purge:error')

export function handleCssParseError (e) {
  error('Error parsing CSS')
  console.table({
    Reason: e.reason,
    Line: e.line,
    Column: e.column,
    File: e.filename
  })
  process.exit(1)
}

export function handleCssParseFontError (position) {
  error('Error parsing CSS font')
  console.table({
    Source: position.source,
    Line: position.start.line,
    Column: position.start.column
  })
  process.exit(1)
}

export function handleCssFontError (position, required) {
  error('Error parsing CSS font')
  console.table({
    Source: position.source,
    Line: position.start.line,
    Column: position.start.column,
    Required: required
  })
  process.exit(1)
}

export function handleOptionsFileReadError (e, filePath) {
  error(`Options file read error at "${filePath}"`)
  error(e)
  process.exit(1)
}

export function handleOptionsFileWriteError (e, filePath) {
  error(`Options file write error at "${filePath}"`)
  error(e)
  process.exit(1)
}

export function handleCssFileReadError (e, filePath) {
  error(`CSS file read error at "${filePath}"`)
  error(e)
  process.exit(1)
}

export function handleCssFileWriteError (e, filePath) {
  error(`CSS file write error at "${filePath}"`)
  error(e)
  process.exit(1)
}

export function handleHtmlFileReadError (e, filePath) {
  error(`HTML file read error at "${filePath}"`)
  error(e)
  process.exit(1)
}

export function handleStatsReadError (e, value) {
  error(`Stats read error at "${value}"`)
  error(e)
  process.exit(1)
}

export function handleFileReadError (e, value) {
  error(`File read error at "${value}"`)
  error(e)
  process.exit(1)
}

export function handleDirectoryReadError (e, value) {
  error(`Directory read error at "${value}"`)
  error(e)
  process.exit(1)
}
