// An element on the clipboard (phase 46): plain text holding a tagged JSON
// envelope, so a copied element travels between builder tabs, browsers and
// machines, and a bare node pasted from a schema file works too. What comes
// back is parsed by the renderer's own parser before it enters a form.

import { parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { getElement } from '@/registry'

export const ELEMENT_CLIPBOARD_TAG = 'formsgen/element'

/** Every type in the subtree is one this builder registers. */
function knownTypes(node: ElementNode): boolean {
  return getElement(node.type) !== undefined && (node.children ?? []).every(knownTypes)
}

/** The text to put on the clipboard for a node. */
export function elementToClipboard(node: ElementNode): string {
  return JSON.stringify({ formsgen: ELEMENT_CLIPBOARD_TAG, node }, null, 2)
}

/**
 * The node in clipboard text (the envelope, or a bare node object), or null
 * when the text is not one or the node would not parse as part of a form
 * (the store decides where it may go; a section on its own goes nowhere).
 */
export function elementFromClipboard(text: string): ElementNode | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const candidate = record['formsgen'] === ELEMENT_CLIPBOARD_TAG ? record['node'] : typeof record['type'] === 'string' ? record : null
  if (!candidate || typeof candidate !== 'object') return null
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'clipboard', locale: 'en', dir: 'ltr' }, tree: [candidate] })
  if (!result.ok) return null
  const node = result.schema.tree[0]
  return node && knownTypes(node) ? node : null
}
