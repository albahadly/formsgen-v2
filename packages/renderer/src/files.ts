// File uploads: the value is a list of File objects. Size, type and count
// limits come from the field's props and report localized messages; the
// submit helpers turn a payload holding files into multipart form data
// (a `data` part with the JSON answers, then one part per file named by
// the field's data path).

import { fill, type MessageCatalog } from './messages'
import { evaluateRules, type FieldLookup } from './rules'
import type { ElementNode } from './schema'

export const FILE_TYPES: ReadonlySet<string> = new Set(['file', 'imageupload'])

export interface FileLimits {
  multiple: boolean
  /** `accept` attribute value ('' = anything). */
  accept: string
  /** Max size per file in MB (0 = no limit). */
  maxSizeMb: number
  /** Max number of files when multiple (0 = no limit). */
  maxFiles: number
}

export function fileLimits(node: ElementNode): FileLimits {
  const num = (key: string): number => {
    const value = Number(node.props[key])
    return Number.isFinite(value) && value > 0 ? value : 0
  }
  const accept = node.props['accept']
  return {
    multiple: node.props['multiple'] === true,
    accept:
      typeof accept === 'string' && accept.trim() !== ''
        ? accept.trim()
        : node.type === 'imageupload'
          ? 'image/*'
          : '',
    maxSizeMb: num('maxSizeMb'),
    maxFiles: node.props['multiple'] === true ? Math.floor(num('maxFiles')) : 1,
  }
}

/** Is it a File (or File-like Blob with a name)? */
export function isFile(value: unknown): value is File {
  return typeof Blob !== 'undefined' && value instanceof Blob && typeof (value as File).name === 'string'
}

/** Does `file` match an accept list (".pdf", "image/*", "application/pdf")? */
export function acceptsFile(file: { name: string; type: string }, accept: string): boolean {
  if (accept.trim() === '') return true
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .some((token) =>
      token.startsWith('.')
        ? name.endsWith(token)
        : token.endsWith('/*')
          ? type.startsWith(token.slice(0, -1))
          : type === token,
    )
}

/** First size/type/count problem with the chosen files, or null. */
export function fileProblem(value: unknown, limits: FileLimits, messages: MessageCatalog): string | null {
  const files = Array.isArray(value) ? value.filter(isFile) : []
  if (limits.maxFiles > 0 && files.length > limits.maxFiles) {
    return fill(messages.tooManyFiles, { n: limits.maxFiles })
  }
  for (const file of files) {
    if (!acceptsFile(file, limits.accept)) return fill(messages.fileType, { name: file.name })
    if (limits.maxSizeMb > 0 && file.size > limits.maxSizeMb * 1024 * 1024) {
      return fill(messages.fileTooLarge, { name: file.name, size: limits.maxSizeMb })
    }
  }
  return null
}

/** Deep copy of form data that keeps File objects as they are. */
export function cloneData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => cloneData(v)) as T
  if (value && typeof value === 'object' && !isFile(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneData(v)])) as T
  }
  return value
}

/** True when a payload holds at least one File anywhere. */
export function hasFiles(value: unknown): boolean {
  if (isFile(value)) return true
  if (Array.isArray(value)) return value.some(hasFiles)
  if (value && typeof value === 'object') return Object.values(value).some(hasFiles)
  return false
}

/**
 * The payload as JSON-safe data (each file → { name, size, type }) plus
 * the files with their part names: a file list's files share the field's
 * data path; elsewhere array indexes join the path ("people.0.photo").
 */
export function describeFiles(payload: unknown): { data: unknown; files: { path: string; file: File }[] } {
  const files: { path: string; file: File }[] = []
  const walk = (value: unknown, path: string): unknown => {
    if (isFile(value)) {
      files.push({ path, file: value })
      return { name: value.name, size: value.size, type: value.type }
    }
    if (Array.isArray(value)) {
      const fileList = value.length > 0 && value.every(isFile)
      return value.map((v, i) => walk(v, fileList ? path : `${path}.${i}`))
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, path ? `${path}.${k}` : k)]))
    }
    return value
  }
  return { data: walk(payload, ''), files }
}

/** True when the tree holds an upload field (at any depth). */
export function hasUploadFields(nodes: ElementNode[]): boolean {
  return nodes.some((node) => FILE_TYPES.has(node.type) || hasUploadFields(node.children ?? []))
}

/**
 * Request body for a submit: multipart form data (`data` = JSON answers,
 * then one part per file) or JSON. Pass `multipart: hasUploadFields(tree)`
 * so a form with uploads always posts multipart, as the exports do, even
 * when no file was chosen; by default multipart is used only when the
 * payload holds files.
 */
export function toSubmission(
  payload: Record<string, unknown>,
  options: { multipart?: boolean } = {},
): { body: FormData | string; headers: Record<string, string> } {
  if (!(options.multipart ?? hasFiles(payload))) return { body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }
  const { data, files } = describeFiles(payload)
  const body = new FormData()
  body.append('data', JSON.stringify(data))
  for (const { path, file } of files) body.append(path, file, file.name)
  return { body, headers: {} }
}

/**
 * A field's first error: "required" first, then file size/type/count
 * problems (upload fields), then the remaining rules.
 */
export function firstFieldError(
  node: ElementNode,
  value: unknown,
  lookup: FieldLookup,
  messages: MessageCatalog,
): string | null {
  const violations = evaluateRules(node.validation, value, lookup, messages)
  if (violations[0]?.rule === 'required') return violations[0].message
  if (FILE_TYPES.has(node.type)) {
    const problem = fileProblem(value, fileLimits(node), messages)
    if (problem) return problem
  }
  return violations[0]?.message ?? null
}
