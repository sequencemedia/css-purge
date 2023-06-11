import {
  statSync
} from 'node:fs'

export default function getFileSizeInKB (filePath) {
  const {
    size
  } = statSync(filePath)

  return (size || 0) / 1000
}
