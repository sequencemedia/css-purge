#!/usr/bin/env node
import {
  Command
} from 'commander'

import cssPurge from '#css-purge'

const {
  argv,
  env: {
    npm_package_version: version
  }
} = process

const program = new Command()

program
  .version(version)
  .option('-c, --cssinput - CSS <the css>', 'The CSS to purge')
  .option('-i, --input - CSS file(s) <input filenames, foldernames or url>', 'The CSS file(s) to parse')
  .option('-m, --inputhtml - HTML file(s) <input html filenames, foldernames or url>', 'The HTML file(s) to parse for CSS')
  .option('-o, --output - CSS file <output filename>', 'The new css filename to output as')
  .option('-f, --customconfig - <config filename> - run with custom config filename', 'Global Workflow - All options must be defined in a json file')
  .option('-d, --defaultconfig - run with default config file', 'Local Workflow - All options are defined in a config_css.json')
  .parse(argv)

let options = {}

if (program.cssinput) {
  if (program.output) {
    options = {
      css_file_location: program.output
    }

    if (program.customconfig === undefined) {
      options.trim = true
      options.shorten = true
    }

    cssPurge.purgeCSS(program.cssinput, options, function (error, result) {
      if (error) { console.log(error) } else { console.log(result) }
    })
  } else {
    options = {}

    if (program.customconfig === undefined) {
      options.trim = true
      options.shorten = true
    }

    cssPurge.purgeCSS(program.cssinput, options, function (error, result) {
      if (error) { console.log(error) } else { console.log(result) }
    })
  }
} else if (program.input && program.inputhtml && program.output) {
  options = {
    css: program.input,
    css_file_location: program.output,
    special_reduce_with_html: true,
    html: program.inputhtml
  }

  if (program.customconfig === undefined) {
    options.trim = true
    options.shorten = true
  }

  cssPurge.purgeCSSFiles(
    options,
    (program.customconfig !== undefined) ? program.customconfig : 'cmd_default'
  )
} else if (program.input && program.inputhtml) {
  options = {
    css: program.input,
    css_file_location: program.input.substr(0, program.input.lastIndexOf('.')) + '.min.css',
    special_reduce_with_html: true,
    html: program.inputhtml
  }

  if (program.customconfig === undefined) {
    options.trim = true
    options.shorten = true
  }

  cssPurge.purgeCSSFiles(
    options,
    (program.customconfig !== undefined) ? program.customconfig : 'cmd_default'
  )
} else if (program.input && program.output) {
  options = {
    css: program.input,
    css_file_location: program.output
  }

  if (program.customconfig === undefined) {
    options.trim = true
    options.shorten = true
  }

  cssPurge.purgeCSSFiles(
    options,
    (program.customconfig !== undefined) ? program.customconfig : 'cmd_default'
  )
} else if (program.input) {
  options = {
    css: program.input,
    css_file_location: program.input.substr(0, program.input.lastIndexOf('.')) + '.min.css'
  }

  if (program.customconfig === undefined) {
    options.trim = true
    options.shorten = true
  }

  cssPurge.purgeCSSFiles(
    options,
    (program.customconfig !== undefined) ? program.customconfig : 'cmd_default'
  )
} else if (program.customconfig) {
  cssPurge.purgeCSSFiles(null, '' + program.customconfig)
} else if (program.defaultconfig) {
  cssPurge.purgeCSSFiles()
} else {
  program.help()
}
