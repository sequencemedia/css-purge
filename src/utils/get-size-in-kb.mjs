export default function getSizeInKB (string) {
  let i = string.length - 1
  let j = string.length

  for (i; i >= 0; i--) {
    const code = string.charCodeAt(i)
    if (code > 0x7f && code <= 0x7ff) {
      j += 1
    } else {
      if (code > 0x7ff && code <= 0xffff) {
        j += 2
      }
    }

    if (code >= 0xDC00 && code <= 0xDFFF) {
      i-- // trail surrogate
    }
  }

  return (j || 0) / 1000
}
