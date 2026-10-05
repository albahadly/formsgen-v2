// Generated upload helpers per target: picking files (appending when the
// field allows several), removing one, image thumbnails, readable sizes.
// Tables are keyed by template path; item paths map back with fgTpl.

import { FILE_TYPES, fileLimits, type MessageCatalog } from '@formsgen/renderer'
import type { ExportField } from './structure'

export function uploadFields(fields: ExportField[]): ExportField[] {
  return fields.filter((f) => FILE_TYPES.has(f.node.type))
}

function multipleMap(fields: ExportField[]): string {
  return `{ ${uploadFields(fields)
    .map((f) => `'${f.path}': ${fileLimits(f.node).multiple}`)
    .join(', ')} }`
}

function commonTs(messages: MessageCatalog): string {
  return `const fgThumbs = new WeakMap<File, string>()
function fgThumb(file: File): string {
  let url = fgThumbs.get(file)
  if (!url) {
    url = URL.createObjectURL(file)
    fgThumbs.set(file, url)
  }
  return url
}
function fgReleaseThumb(file: File): void {
  const url = fgThumbs.get(file)
  if (url) URL.revokeObjectURL(url)
  fgThumbs.delete(file)
}
function fgFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'
}
function fgRemoveFileLabel(name: string): string {
  return ${JSON.stringify(messages.removeFile)}.split('{name}').join(name)
}`
}

/** Vue standalone: module-level helpers over the reactive `form`. */
export function vueUploadRuntime(fields: ExportField[], messages: MessageCatalog): string {
  if (uploadFields(fields).length === 0) return ''
  return `${commonTs(messages)}
const fgFileMultiple: Record<string, boolean> = ${multipleMap(fields)}
function fgFileList(path: string): File[] {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form) as File[]
}
function fgSetFiles(path: string, files: File[]): void {
  const keys = path.split('.')
  const last = keys.pop()!
  const target = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, form as unknown as Record<string, unknown>)
  target[last] = files
}
function fgPickFiles(path: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (picked.length === 0) return
  fgSetFiles(path, fgFileMultiple[fgTpl(path)] ? [...fgFileList(path), ...picked] : picked.slice(0, 1))
  touch(path)
}
function fgRemoveFile(path: string, index: number): void {
  const list = fgFileList(path)
  const file = list[index]
  if (file) fgReleaseThumb(file)
  fgSetFiles(path, list.filter((_, i) => i !== index))
  touch(path)
}`
}

/** React: module-level pure helpers (thumbnails, sizes, labels). */
export function reactUploadModule(fields: ExportField[], messages: MessageCatalog): string {
  if (uploadFields(fields).length === 0) return ''
  return `${commonTs(messages)}

const FG_FILE_MULTIPLE: Record<string, boolean> = ${multipleMap(fields)}

function fgFileList(data: FormData, path: string): File[] {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], data) as File[]
}`
}

/** React: handlers inside the component (state through setField). */
export function reactUploadHandlers(fields: ExportField[]): string {
  if (uploadFields(fields).length === 0) return ''
  return `  function fgPickFiles(path: string, input: HTMLInputElement): void {
    const picked = Array.from(input.files ?? [])
    input.value = ''
    if (picked.length === 0) return
    touched.current.add(path)
    setField(path, FG_FILE_MULTIPLE[fgTpl(path)] ? [...fgFileList(form, path), ...picked] : picked.slice(0, 1))
  }

  function fgRemoveFile(path: string, index: number): void {
    const list = fgFileList(form, path)
    const file = list[index]
    if (file) fgReleaseThumb(file)
    touched.current.add(path)
    setField(path, list.filter((_, i) => i !== index))
  }`
}
