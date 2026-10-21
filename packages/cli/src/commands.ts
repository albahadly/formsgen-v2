// The commands behind `formsgen`, as functions: what the builder's Export
// dialog does (one target's files with the project embedded, the project
// file, the README, optionally the sample server), written to a folder;
// a project file checked; the targets listed. The entry (cli.ts) only
// parses arguments and prints.

import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import { getCssAdapter, listCssAdapters, type CssFrameworkId } from '@/export/css'
import { withProject } from '@/export/project'
import { sampleServerFiles } from '@/export/submitServer'
import { getTarget, listTargets, type ExportedFile } from '@/export/targets'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** A problem the user can fix: printed as one line, exit code 1. */
export class CliError extends Error {}

export const CSS_IDS = (): CssFrameworkId[] => listCssAdapters().map((a) => a.id)

/** The project file read and checked, or a CliError saying what is wrong. */
export function readSchema(path: string): FormSchema {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    throw new CliError(`cannot read ${path}`)
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new CliError(`${path} is not JSON`)
  }
  const result = parseFormSchema(json)
  if (!result.ok) throw new CliError(`${path} is not a valid FormsGen project:\n  ${result.errors.join('\n  ')}`)
  return result.schema
}

export interface PackageOptions {
  /** Code files carry the project, so the builder can reopen them (default on). */
  project: boolean
  /** Add the sample submission server (server/) to a code export. */
  server: boolean
}

/**
 * The renderer's web-component bundle: next to the built CLI (copied there by
 * its build), else the renderer's build in this repository; null when neither
 * exists (the README then says where to get it).
 */
export function elementScript(): string | null {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [join(here, 'element/formsgen-element.js'), join(here, '../../renderer/dist/element/formsgen-element.js')]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8')
  }
  return null
}

/** The files the builder's "project package" ZIP holds for one target. */
export function packageFiles(schema: FormSchema, targetId: string, css: CssFrameworkId, options: PackageOptions): ExportedFile[] {
  const target = getTarget(targetId)
  if (!target) throw new CliError(`unknown target "${targetId}"; one of ${listTargets().map((t) => t.id).join(', ')}, or all`)
  if (!CSS_IDS().includes(css)) throw new CliError(`unknown CSS flavour "${css}"; one of ${CSS_IDS().join(', ')}`)
  const adapter = getCssAdapter(css)
  const isCode = target.id !== 'json'
  const assets = target.id === 'web-component' ? { elementScript: elementScript() } : undefined
  const generated = target.generate({ schema, css: adapter, assets })
  const files = isCode && options.project ? withProject(generated, schema) : generated
  const projectFile = `${schema.meta.name}.formsgen.json`
  const base = target.readme({ schema, css: adapter, assets })
  const readme = isCode
    ? `${base.trimEnd()}\n\n## Change this form later\n\nOpen \`${projectFile}\`${options.project ? ' (or the generated file)' : ''} in the FormsGen builder with *Open*, edit it, and export again. Exporting again replaces the generated files, so keep your own code outside them.\n`
    : base
  return [
    ...files,
    ...(isCode ? [{ path: projectFile, content: `${JSON.stringify(schema, null, 2)}\n`, language: 'json' as const }] : []),
    { path: 'README.md', content: readme, language: 'markdown' as const },
    ...(isCode && options.server ? sampleServerFiles(schema) : []),
  ]
}

export interface ExportOptions extends PackageOptions {
  /** A target id, or "all". */
  target: string
  css: CssFrameworkId
  /** The folder to write into; with "all", one sub-folder per target. */
  out: string
}

/** Writes the package(s) and returns the paths written, relative to `out`. */
export function exportCommand(schemaPath: string, options: ExportOptions): { out: string; written: string[] } {
  const schema = readSchema(schemaPath)
  const ids = options.target === 'all' ? listTargets().map((t) => t.id) : [options.target]
  const out = resolve(options.out)
  const written: string[] = []
  for (const id of ids) {
    const target = getTarget(id)
    if (!target) throw new CliError(`unknown target "${id}"; one of ${listTargets().map((t) => t.id).join(', ')}, or all`)
    const folder = ids.length > 1 ? (target.frameworkAware ? `${id}-${options.css}` : id) : ''
    for (const file of packageFiles(schema, id, options.css, options)) {
      const relative = folder ? join(folder, file.path) : file.path
      const path = join(out, relative)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, file.content)
      written.push(relative.split('\\').join('/'))
    }
  }
  return { out, written }
}

/** Checks a project file; returns a short description of the form. */
export function validateCommand(schemaPath: string): { name: string; title: string | undefined; elements: number } {
  const schema = readSchema(schemaPath)
  const count = (nodes: FormSchema['tree']): number => nodes.reduce((n, node) => n + 1 + count(node.children ?? []), 0)
  return { name: schema.meta.name, title: schema.meta.title, elements: count(schema.tree) }
}

/** The targets and CSS flavours, one per line. */
export function targetsCommand(): string {
  const rows = listTargets().map((t) => `  ${t.id.padEnd(15)} ${t.label}${t.frameworkAware ? '' : '  (no CSS flavour)'}\n${' '.repeat(18)}${t.description}`)
  return `Targets:\n${rows.join('\n')}\n\nCSS flavours (--css): ${CSS_IDS().join(', ')}\n`
}
