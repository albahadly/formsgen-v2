// Reopening exports: each exported code file can carry the project (the
// FormsGen schema) in a comment at its end, so the builder's Open can read
// the form back from the file, or from an export ZIP (which also holds
// <name>.formsgen.json). The schema is base64 (UTF-8 JSON), so no comment
// terminator ("-->", "*/", "*@") can ever appear inside the block.

import type { FormSchema } from '@albahadly/formsgen-renderer'
import type { ExportedFile } from './targets'

export const PROJECT_MARKER = 'formsgen-project:v1'
const NOTE = 'FormsGen project: to change this form, open this file in the FormsGen builder (Open).'

function toBase64(text: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(base64: string): string {
  const binary = atob(base64)
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

type CommentStyle = 'markup' | 'js' | 'razor'

/** The comment syntax for an exported file, or null when it carries no project (CSS, JSON, docs). */
function commentStyle(path: string): CommentStyle | null {
  if (/\.(html|vue)$/.test(path)) return 'markup'
  if (/\.(tsx?|jsx?)$/.test(path)) return 'js'
  if (/\.razor$/.test(path)) return 'razor'
  return null
}

export function projectBlock(schema: FormSchema, style: CommentStyle): string {
  const data = toBase64(JSON.stringify(schema))
  const lines = [NOTE, PROJECT_MARKER, ...(data.match(/.{1,100}/g) ?? [])].map((line) => `  ${line}`)
  const [open, close] = style === 'markup' ? ['<!--', '-->'] : style === 'js' ? ['/*', '*/'] : ['@*', '*@']
  return `${open}\n${lines.join('\n')}\n${close}\n`
}

/** The files with the project appended to each code file. */
export function withProject(files: ExportedFile[], schema: FormSchema): ExportedFile[] {
  return files.map((file) => {
    const style = file.project === false ? null : commentStyle(file.path)
    if (!style) return file
    const content = file.content.endsWith('\n') ? file.content : `${file.content}\n`
    return { ...file, content: `${content}\n${projectBlock(schema, style)}` }
  })
}

/** The project JSON carried by an exported file, or null when it has none. */
export function readProject(text: string): unknown {
  const at = text.indexOf(PROJECT_MARKER)
  if (at === -1) return null
  const data: string[] = []
  for (const line of text.slice(at + PROJECT_MARKER.length).split(/\r?\n/).slice(1)) {
    const part = line.trim()
    if (!/^[A-Za-z0-9+/=]+$/.test(part)) break
    data.push(part)
  }
  try {
    return JSON.parse(fromBase64(data.join('')))
  } catch {
    return null
  }
}
