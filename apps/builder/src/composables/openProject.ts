// Reads a project for the toolbar's Open: a .formsgen.json file, an export
// ZIP (its .formsgen.json, else a code file carrying the project) or an
// exported code file (HTML, Vue, React, Blazor) carrying the project.

import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import JSZip from 'jszip'
import { readProject } from '@/export/project'

export type OpenResult =
  | { ok: true; schema: FormSchema }
  | { ok: false; reason: 'unreadable' | 'no-project' | 'invalid'; detail?: string }

/** FileReader works in every browser (and in test environments without Blob.text). */
function read(file: Blob, as: 'text' | 'buffer'): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string | ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    if (as === 'text') reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  })
}

function check(raw: unknown): OpenResult {
  const result = parseFormSchema(raw)
  return result.ok ? { ok: true, schema: result.schema } : { ok: false, reason: 'invalid', detail: result.errors[0] ?? '' }
}

async function fromZip(file: Blob): Promise<OpenResult> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await read(file, 'buffer'))
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  const entries = Object.values(zip.files).filter((entry) => !entry.dir)
  const json = entries.find((entry) => entry.name.endsWith('.formsgen.json'))
  if (json) {
    try {
      return check(JSON.parse(await json.async('string')))
    } catch {
      return { ok: false, reason: 'unreadable' }
    }
  }
  for (const entry of entries) {
    const project = readProject(await entry.async('string'))
    if (project) return check(project)
  }
  return { ok: false, reason: 'no-project' }
}

export async function openProjectFile(file: File): Promise<OpenResult> {
  if (/\.zip$/i.test(file.name) || file.type === 'application/zip') return fromZip(file)
  let text: string
  try {
    text = (await read(file, 'text')) as string
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  const embedded = readProject(text)
  if (embedded) return check(embedded)
  if (/\.json$/i.test(file.name) || text.trimStart().startsWith('{')) {
    try {
      return check(JSON.parse(text))
    } catch {
      return { ok: false, reason: 'unreadable' }
    }
  }
  return { ok: false, reason: 'no-project' }
}
