// Generated upload helpers per target: picking files (appending when the
// field allows several), removing one, image thumbnails, readable sizes.
// Tables are keyed by template path; item paths map back with fgTpl.

import { FILE_TYPES, fileLimits, type FormSchema, type MessageCatalog } from '@formsgen/renderer'
import type { CssFrameworkAdapter } from './css/types'
import type { ExportField } from './structure'

/** Bootstrap has no dashed border, drop highlight or pointer utilities. */
export const BOOTSTRAP_UPLOAD_CSS = `.fg-file-drop { min-block-size: 4.5rem; border-style: dashed !important; }
.fg-file-drop:hover, .fg-file-drop[data-fg-dragging] { color: var(--bs-body-color) !important; border-color: var(--bs-primary) !important; }
.fg-file-drop:has(:focus-visible) { box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25); }
.fg-file-drop > input { cursor: pointer; }
`

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
}
// Marks the drop zone (the input's parent) while files are dragged over it.
function fgDrag(input: EventTarget | null, on: boolean): void {
  ;(input as HTMLElement | null)?.parentElement?.toggleAttribute('data-fg-dragging', on)
}
${dropFirstHelper(messages, true)}`
}

/**
 * Several files dropped on a field that takes one (browsers reject such a
 * drop): the first becomes the input's file and a change event runs the
 * usual pick; returns the note to show ('' when the drop was left alone).
 */
export function dropFirstHelper(messages: MessageCatalog, ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `function fgDropFirst(input${t(': HTMLInputElement')}, event${t(': { dataTransfer: DataTransfer | null; preventDefault(): void }')})${t(': string')} {
  var dropped = event.dataTransfer ? event.dataTransfer.files : null
  if (input.multiple || !dropped || dropped.length < 2) return ''
  event.preventDefault()
  var first = dropped[0]${t('!')}
  var keep = new DataTransfer()
  keep.items.add(first)
  input.files = keep.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
  return ${JSON.stringify(messages.oneFileOnly)}.split('{name}').join(first.name)
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
// "Only one file fits here, …" per field path, until its next change.
const fgFileNotes = reactive<Record<string, string>>({})
function fgDropFiles(path: string, event: DragEvent): void {
  fgDrag(event.currentTarget, false)
  const note = fgDropFirst(event.currentTarget as HTMLInputElement, event)
  if (!note) return
  fgFileNotes[path] = note
  fgAnnounce(note)
}
function fgPickFiles(path: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  if (picked.length === 0) return
  delete fgFileNotes[path]
  fgSetFiles(path, fgFileMultiple[fgTpl(path)] ? [...fgFileList(path), ...picked] : picked.slice(0, 1))
  touch(path)
}
function fgRemoveFile(path: string, index: number): void {
  const list = fgFileList(path)
  const file = list[index]
  if (file) fgReleaseThumb(file)
  delete fgFileNotes[path]
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
  return `  // "Only one file fits here, …" per field path, until its next change.
  const [fgFileNotes, setFgFileNotes] = useState<Record<string, string>>({})
  function fgFileNote(path: string, note: string): void {
    setFgFileNotes((notes) => {
      const next = { ...notes }
      if (note) next[path] = note
      else delete next[path]
      return next
    })
  }

  function fgDropFiles(path: string, event: React.DragEvent<HTMLInputElement>): void {
    fgDrag(event.currentTarget, false)
    const note = fgDropFirst(event.currentTarget, event)
    if (!note) return
    fgFileNote(path, note)
    fgAnnounce(note)
  }

  function fgPickFiles(path: string, input: HTMLInputElement): void {
    const picked = Array.from(input.files ?? [])
    input.value = ''
    if (picked.length === 0) return
    fgFileNote(path, '')
    touched.current.add(path)
    setField(path, FG_FILE_MULTIPLE[fgTpl(path)] ? [...fgFileList(form, path), ...picked] : picked.slice(0, 1))
  }

  function fgRemoveFile(path: string, index: number): void {
    const list = fgFileList(form, path)
    const file = list[index]
    if (file) fgReleaseThumb(file)
    fgFileNote(path, '')
    touched.current.add(path)
    setField(path, list.filter((_, i) => i !== index))
  }`
}

/**
 * Forms with upload fields and a submit URL send through fgSend (Blazor:
 * FgProgressContent) and show a progress bar meanwhile: "Uploading… n%",
 * then "Upload complete." or the failure. Announced: started, then
 * "Form submitted." or the failure.
 */
export function postsUploads(schema: FormSchema, fields: ExportField[]): boolean {
  return Boolean(schema.meta.submit?.url) && uploadFields(fields).length > 0
}

/** Script for the JS targets: the progress text for a state and percent. */
export function uploadTextHelper(messages: MessageCatalog, ts: boolean): string {
  return `function fgUploadText(state${ts ? ': string' : ''}, percent${ts ? ': number' : ''})${ts ? ': string' : ''} {
  return state === 'done' ? ${JSON.stringify(messages.uploadDone)} : ${JSON.stringify(messages.uploading)}.split('{n}').join(String(percent))
}`
}

const escText = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** Progress markup reading the state ('' | 'uploading' | 'done' | 'failed') and percent. */
export function uploadStatusMarkup(
  target: 'vue' | 'react' | 'html' | 'blazor',
  css: CssFrameworkAdapter,
  messages: MessageCatalog,
): string {
  const c = (slot: Parameters<CssFrameworkAdapter['classes']>[0]): string => css.classes(slot)
  const cls = target === 'react' ? 'className' : 'class'
  const num = (n: number): string => (target === 'react' ? `{${n}}` : `"${n}"`)
  const bar = (now: string, width: string): string =>
    `<div ${cls}="${c('progress')}" role="progressbar" aria-label="${escText(messages.uploadProgress)}" aria-valuemin=${num(0)} aria-valuemax=${num(100)} ${now}>
        <div ${cls}="${c('progressBar')}" ${width}></div>
      </div>`
  const failed = escText(messages.uploadFailed)
  if (target === 'vue') {
    return `<div v-if="fgUpload.state" class="${c('upload')}">
    <template v-if="fgUpload.state !== 'failed'">
      ${bar(':aria-valuenow="fgUpload.percent"', `:style="{ width: fgUpload.percent + '%' }"`)}
      <p class="${c('progressText')}">{{ fgUploadText(fgUpload.state, fgUpload.percent) }}</p>
    </template>
    <p v-else class="${c('error')}">${failed}</p>
  </div>`
  }
  if (target === 'react') {
    return `{fgUpload.state !== '' && (
        <div className="${c('upload')}">
          {fgUpload.state !== 'failed' ? (
            <>
              ${bar('aria-valuenow={fgUpload.percent}', "style={{ width: fgUpload.percent + '%' }}")}
              <p className="${c('progressText')}">{fgUploadText(fgUpload.state, fgUpload.percent)}</p>
            </>
          ) : (
            <p className="${c('error')}">{${JSON.stringify(messages.uploadFailed)}}</p>
          )}
        </div>
      )}`
  }
  if (target === 'html') {
    return `<div class="${c('upload')}" data-fg-upload hidden>
      ${bar('aria-valuenow="0" data-fg-upload-track', 'data-fg-upload-bar style="width: 0%"')}
      <p class="${c('progressText')}" data-fg-upload-text></p>
      <p class="${c('error')}" data-fg-upload-failed hidden>${failed}</p>
    </div>`
  }
  return `@if (fgUploadState != "")
    {
        <div class="${c('upload')}">
            @if (fgUploadState != "failed")
            {
                ${bar('aria-valuenow="@fgUploadPercent"', 'style="width: @(fgUploadPercent)%"')}
                <p class="${c('progressText')}">@FgUploadText()</p>
            }
            else
            {
                <p class="${c('error')}">${failed}</p>
            }
        </div>
    }`
}
