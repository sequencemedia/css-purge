import {
  statSync
} from 'node:fs'

export default function getFileSizeInKiloBytes (filePath) {
  const {
    size
  } = statSync(filePath)

  return (size || 0) / 1000
}
