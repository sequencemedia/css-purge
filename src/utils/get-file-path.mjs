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

export default function getFilePath (value = '', exts = ['.css'], collector) {
  if (validUrl.isUri(value)) {
    collector.push(value)
  } else {
    let stats

    try {
      stats = lstatSync(value)
    } catch (e) {
      console.log(error(`Read error: Error while reading "${value}"`))
      console.log(e)
      process.exit(1)
    }

    if (stats.isDirectory()) { // `value` is a directory path
      // traverse directory
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
        console.log(error(`Directory read error: Error while reading the directory "${value}"`))
        console.log(e)
        process.exit(1)
      }
    } else {
      if (stats.isFile()) { // `value` is a file path
        if (exts.some((ext) => extname(value) === ext)) {
          collector.push(value)
        } else {
          if (extname(value) === '') {
            getFilePath(value, exts, collector)
          }
        }
      }
    }
  } // end of url check
} // end of getFilePath
