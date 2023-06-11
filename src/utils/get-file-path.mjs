import {
  extname,
  join
} from 'node:path'

import {
  lstatSync,
  readdirSync
} from 'node:fs'

import validUrl from 'valid-url'

import cliColor from 'cli-color'

const error = cliColor.red
// const errorLine = cliColor.redBright

function handleStatsReadError (e, value) {
  console.log(error(`Stats read error at "${value}"`))
  console.log(e)
  process.exit(1)
}

function handleFileReadError (e, value) {
  console.log(error(`File read error at "${value}"`))
  console.log(e)
  process.exit(1)
}

function handleDirectoryReadError (e, value) {
  console.log(error(`Directory read error at "${value}"`))
  console.log(e)
  process.exit(1)
}

export default function getFilePath (value = '', exts = ['.css'], collector) {
  if (validUrl.isUri(value)) {
    collector.push(value)
  } else {
    let stats

    try {
      stats = lstatSync(value)
    } catch (e) {
      handleStatsReadError(e, value)
    }

    if (stats.isFile()) { // `value` is a file path
      try {
        if (exts.some((ext) => extname(value) === ext)) {
          collector.push(value)
        } else {
          if (extname(value) === '') {
            getFilePath(value, exts, collector)
          }
        }
      } catch (e) {
        handleFileReadError(e, value)
      }
    } else {
      if (stats.isDirectory()) { // `value` is a directory path
        try {
          readdirSync(value)
            .forEach((fileName) => {
              if (exts.some((ext) => extname(fileName) === ext)) {
                collector.push(join(value, fileName))
              } else {
                if (extname(fileName) === '') {
                  getFilePath(join(value, fileName), exts, collector)
                }
              }
            })
        } catch (e) {
          handleDirectoryReadError(e, value)
        }
      }
    }
  } // end of url check
} // end of getFilePath
