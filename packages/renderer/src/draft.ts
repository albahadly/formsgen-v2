// Save and continue later (meta.saveDraft): the visitor's answers are kept
// in their own browser (localStorage) while they fill the form, restored
// when they come back, and removed once the form is sent or when they
// choose "Clear saved answers". Files are never kept (they can't be stored
// this way), so a form with upload fields says so.
//
// Stored under `formsgen:<meta.name>:draft` as {"v": version, "data": …}.
// The version is a fingerprint of the form's fields (names, types,
// nesting) plus the code that wrote it (the renderer or an export target),
// so a draft saved before the form changed, or by another kind of export,
// is ignored instead of being forced into a different shape.

import { getCoreElement } from './elements'
import { FILE_TYPES, isFile } from './files'
import { isRepeater } from './repeater'
import type { ElementNode } from './schema'

/** The parts of Storage a draft needs (localStorage, or an in-memory stand-in). */
export interface DraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function draftKey(formName: string): string {
  return `formsgen:${formName}:draft`
}

/** The form's data shape as text: names, types and nesting (as buildDefaultData). */
function shapeOf(nodes: ElementNode[]): string {
  const parts: string[] = []
  for (const node of nodes) {
    const core = getCoreElement(node.type)
    if (!core) continue
    if (isRepeater(node)) {
      if (node.name) parts.push(`${node.name}[${shapeOf(node.children ?? [])}]`)
    } else if (core.isContainer) {
      const inner = shapeOf(node.children ?? [])
      if (node.name) parts.push(`${node.name}{${inner}}`)
      else if (inner) parts.push(inner)
    } else if (core.hasValue && node.name) {
      parts.push(`${node.name}:${node.type}${node.props['multiple'] === true ? '*' : ''}`)
    }
  }
  return parts.join(',')
}

/** FNV-1a (32-bit) as 8 hex digits. */
function hash(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** Draft version for this form written by `writer` ('lib', 'vue', 'react', 'html', 'blazor'). */
export function draftVersion(tree: ElementNode[], writer: string): string {
  return `${hash(shapeOf(tree))}-${writer}`
}

/** The answers as stored: files left out (a file list becomes empty). */
export function draftJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, (_key, value: unknown) =>
    Array.isArray(value) ? value.filter((v) => !isFile(v)) : isFile(value) ? undefined : value,
  )
}

/** Does the form hold upload fields (whose files aren't kept)? */
export function draftDropsFiles(tree: ElementNode[]): boolean {
  return tree.some((node) => FILE_TYPES.has(node.type) || draftDropsFiles(node.children ?? []))
}

/** The saved answers of this version, or null (none, unreadable, other version). */
export function readDraft(storage: DraftStorage | null, formName: string, version: string): Record<string, unknown> | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(draftKey(formName))
    if (raw === null) return null
    const saved = JSON.parse(raw) as { v?: unknown; data?: unknown }
    const data = saved.data
    return saved.v === version && typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Stores the answers (already as draftJson); false when storage refused. */
export function writeDraft(storage: DraftStorage | null, formName: string, version: string, json: string): boolean {
  if (!storage) return false
  try {
    storage.setItem(draftKey(formName), `{"v":${JSON.stringify(version)},"data":${json}}`)
    return true
  } catch {
    return false
  }
}

export function removeDraft(storage: DraftStorage | null, formName: string): void {
  try {
    storage?.removeItem(draftKey(formName))
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

/** The browser's localStorage, or null where it can't be used (private modes, SSR). */
export function browserStorage(): DraftStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

/** An in-memory storage (the builder's preview: nothing outlives the page). */
export function memoryStorage(): DraftStorage {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}
