import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { CliError, exportCommand, packageFiles, readSchema, targetsCommand, validateCommand } from './commands'
import { HELP, run } from './run'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const KITCHEN = join(ROOT, 'fixtures/kitchen-sink.formsgen.json')
const PREFILL = join(ROOT, 'tools/proof/demos/prefill.json')
const PROJECT_MARKER = 'formsgen-project:v1'

const temps: string[] = []
const temp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'fg-cli-'))
  temps.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** run() with its output captured. */
function cli(argv: string[]): { code: number; out: string; err: string } {
  const out: string[] = []
  const err: string[] = []
  const code = run(argv, { log: (l) => out.push(l), error: (l) => err.push(l) })
  return { code, out: out.join('\n'), err: err.join('\n') }
}

describe('reading a project file', () => {
  it('parses a valid one and describes it', () => {
    expect(readSchema(KITCHEN).meta.name).toBe('kitchen_sink')
    const info = validateCommand(PREFILL)
    expect(info).toEqual({ name: 'prefill_demo', title: 'Prefill', elements: 12 })
  })

  it('says what is wrong with a bad one', () => {
    const dir = temp()
    const notJson = join(dir, 'a.json')
    writeFileSync(notJson, '{ nope')
    expect(() => readSchema(notJson)).toThrow(/is not JSON/)
    const invalid = join(dir, 'b.json')
    writeFileSync(invalid, JSON.stringify({ $schema: 'formsgen/v2', meta: { name: 'x', locale: 'en', dir: 'sideways' }, tree: [] }))
    expect(() => readSchema(invalid)).toThrow(/meta\.dir/)
    expect(() => readSchema(join(dir, 'missing.json'))).toThrow(CliError)
  })
})

describe('a package for one target', () => {
  const schema = readSchema(PREFILL)

  it('holds the generated files with the project, the project file and a README, like the builder ZIP', () => {
    const files = packageFiles(schema, 'html', 'vanilla', { project: true, server: false })
    expect(files.map((f) => f.path)).toEqual(['prefill_demo.html', 'prefill_demo.formsgen.json', 'README.md'])
    expect(files[0]!.content).toContain(PROJECT_MARKER)
    expect(JSON.parse(files[1]!.content).meta.name).toBe('prefill_demo')
    expect(files[2]!.content).toContain('## Change this form later')
    expect(files[2]!.content).toContain('(or the generated file)')
  })

  it('without the project the generated file is clean and the README says so', () => {
    const files = packageFiles(schema, 'react', 'tailwind', { project: false, server: false })
    expect(files[0]!.content).not.toContain(PROJECT_MARKER)
    expect(files.at(-1)!.content).not.toContain('(or the generated file)')
  })

  it('the sample server joins a code export on request, never the JSON one', () => {
    const paths = (id: string, server: boolean) => packageFiles(schema, id, 'vanilla', { project: true, server }).map((f) => f.path)
    expect(paths('vue-standalone', true)).toContain('server/server.mjs')
    expect(paths('json', true)).toEqual(['prefill_demo.formsgen.json', 'README.md'])
    expect(paths('validation', false)).toEqual(['prefill_demo.zod.ts', 'prefill_demo.schema.json', 'prefill_demo.formsgen.json', 'README.md'])
  })

  it('refuses an unknown target or flavour', () => {
    expect(() => packageFiles(schema, 'svelte', 'vanilla', { project: true, server: false })).toThrow(/unknown target "svelte"/)
    expect(() => packageFiles(schema, 'html', 'bulma' as never, { project: true, server: false })).toThrow(/unknown CSS flavour "bulma"/)
  })
})

describe('formsgen export', () => {
  it('writes one target into the folder', () => {
    const dir = temp()
    const { code, out } = cli(['export', PREFILL, '--out', dir])
    expect(code).toBe(0)
    expect(out).toMatch(/^3 files written to /)
    expect(readdirSync(dir).sort()).toEqual(['README.md', 'prefill_demo.formsgen.json', 'prefill_demo.html'])
    expect(readFileSync(join(dir, 'prefill_demo.html'), 'utf8')).toContain('<!doctype html>')
  })

  it('writes every target into its own sub-folder with "all"', () => {
    const dir = temp()
    const { written } = exportCommand(KITCHEN, { target: 'all', css: 'bootstrap5', out: dir, project: true, server: false })
    expect(readdirSync(dir).sort()).toEqual(['blazor-bootstrap5', 'html-bootstrap5', 'json', 'react-bootstrap5', 'validation', 'vue-lib', 'vue-standalone-bootstrap5'])
    expect(written).toContain('html-bootstrap5/kitchen_sink.html')
    expect(written).toContain('validation/kitchen_sink.zod.ts')
    expect(readFileSync(join(dir, 'html-bootstrap5/kitchen_sink.html'), 'utf8')).toContain('bootstrap')
  })

  it('reports a bad file or option with exit code 1 or 2', () => {
    const dir = temp()
    expect(cli(['export', join(dir, 'nope.json'), '--out', dir])).toMatchObject({ code: 1, err: expect.stringContaining('cannot read') })
    expect(cli(['export', PREFILL, '--target', 'svelte', '--out', dir])).toMatchObject({ code: 1, err: expect.stringContaining('unknown target') })
    expect(cli(['export'])).toMatchObject({ code: 1, err: expect.stringContaining('needs a project file') })
    expect(cli(['export', PREFILL, '--bogus'])).toMatchObject({ code: 2 })
    expect(cli(['dance'])).toMatchObject({ code: 1, err: expect.stringContaining('unknown command') })
  })
})

describe('formsgen validate, targets, help', () => {
  it('validate describes a good file and rejects a bad one', () => {
    expect(cli(['validate', PREFILL])).toMatchObject({ code: 0, out: expect.stringContaining('valid FormsGen project "Prefill" (prefill_demo), 12 elements') })
    const dir = temp()
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, '[]')
    expect(cli(['validate', bad])).toMatchObject({ code: 1, err: expect.stringContaining('not a valid FormsGen project') })
  })

  it('targets lists the seven targets and the flavours', () => {
    const text = targetsCommand()
    for (const id of ['json', 'vue-lib', 'vue-standalone', 'react', 'blazor', 'html', 'validation']) expect(text).toContain(`  ${id}`)
    expect(text).toContain('vanilla, tailwind, bootstrap5')
    expect(cli(['targets']).code).toBe(0)
  })

  it('help and version', () => {
    expect(cli(['--help'])).toMatchObject({ code: 2, out: HELP })
    expect(cli(['export', '--help'])).toMatchObject({ code: 0 })
    expect(cli(['--version']).out).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
