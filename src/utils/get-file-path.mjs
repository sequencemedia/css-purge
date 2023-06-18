import {
  extname,
  join
} from 'node:path'

import {
  lstatSync,
  readdirSync
} from 'node:fs'

import validUrl from 'valid-url'

import {
  handleStatsReadError,
  handleFileReadError,
  handleDirectoryReadError
} from './errors/index.mjs'

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
