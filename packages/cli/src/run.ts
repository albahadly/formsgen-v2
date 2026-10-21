// Argument parsing and printing for `formsgen`; the work is in commands.ts.
// `run` returns the exit code and prints through `io`, so tests can drive it.

import { parseArgs } from 'node:util'
import { version } from '../package.json'
import { CliError, exportCommand, targetsCommand, validateCommand, type ExportOptions } from './commands'

export interface Io {
  log: (line: string) => void
  error: (line: string) => void
}

export const HELP = `formsgen ${version} — FormsGen from the command line

Usage:
  formsgen export <form.formsgen.json> [options]   write a target's package (files, project, README)
  formsgen validate <form.formsgen.json>           check a project file
  formsgen targets                                 list the targets and CSS flavours

Export options:
  --target <id|all>   html (default), react, vue-standalone, vue-lib, blazor, json, validation, web-component, or all
  --css <flavour>     vanilla (default), tailwind, bootstrap5
  --out <dir>         where to write (default: formsgen-export); with "all", one sub-folder per target
  --no-project        leave the project out of the generated files (the builder cannot reopen them)
  --server            add the sample submission server (server/) to a code export

  -h, --help          this text
  -v, --version       the version
`

export function run(argv: string[], io: Io): number {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        target: { type: 'string', default: 'html' },
        css: { type: 'string', default: 'vanilla' },
        out: { type: 'string', default: 'formsgen-export' },
        'no-project': { type: 'boolean', default: false },
        server: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    })
    if (values.version) {
      io.log(version)
      return 0
    }
    const [command, file] = positionals
    if (values.help || !command) {
      io.log(HELP)
      return command ? 0 : 2
    }
    switch (command) {
      case 'export': {
        if (!file) throw new CliError('export needs a project file: formsgen export <form.formsgen.json>')
        const options: ExportOptions = {
          target: values.target as string,
          css: values.css as ExportOptions['css'],
          out: values.out as string,
          project: !values['no-project'],
          server: values.server as boolean,
        }
        const { out, written } = exportCommand(file, options)
        io.log(`${written.length} file${written.length === 1 ? '' : 's'} written to ${out}`)
        for (const path of written) io.log(`  ${path}`)
        return 0
      }
      case 'validate': {
        if (!file) throw new CliError('validate needs a project file: formsgen validate <form.formsgen.json>')
        const info = validateCommand(file)
        io.log(`${file}: valid FormsGen project "${info.title ?? info.name}" (${info.name}), ${info.elements} element${info.elements === 1 ? '' : 's'}`)
        return 0
      }
      case 'targets':
        io.log(targetsCommand())
        return 0
      default:
        throw new CliError(`unknown command "${command}"; one of export, validate, targets (see --help)`)
    }
  } catch (error) {
    if (error instanceof CliError) {
      io.error(`formsgen: ${error.message}`)
      return 1
    }
    // A wrong option: Node's parser says which.
    if (error instanceof TypeError && 'code' in error && String(error.code).startsWith('ERR_PARSE_ARGS')) {
      io.error(`formsgen: ${error.message} (see --help)`)
      return 2
    }
    throw error
  }
}
