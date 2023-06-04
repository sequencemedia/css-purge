import {
  Transform
} from 'node:stream'

import cssPurge from './css-purge.mjs'

function transform (buffer, encoding, next) {
  cssPurge.purgeCSS(buffer.toString(), {
    trim: true,
    shorten: true,
    verbose: false
  }, function (e, result) {
    if (e) console.log(e)

    this.push(result)

    next()
  })
}

function flush (done) {
  done()
}

process.stdin.pipe(new Transform({ transform, flush, objectMode: true })).pipe(process.stdout)
