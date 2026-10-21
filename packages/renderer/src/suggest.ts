// Address suggestions (phase 45b): an `address` field is a text input with
// a datalist filled from a provider as people type. The provider is a URL
// template with `{q}`; its JSON answer is read loosely (a list of strings
// or of objects with display_name / label / name, or a `features`,
// `results` or `items` list of those), so Nominatim, Photon and most
// geocoders work without an adapter.
import type { ElementNode } from './schema'

export const DEFAULT_SUGGEST_URL = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&q={q}'
export const SUGGEST_MAX = 8

/** props.suggestUrl when it is an http(s) template with `{q}`; the default provider otherwise. */
export function suggestUrl(node: ElementNode): string {
  const raw = node.props['suggestUrl']
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim()) && raw.includes('{q}') ? raw.trim() : DEFAULT_SUGGEST_URL
}

/** props.minChars within 1..10; 3 by default. */
export function suggestMinChars(node: ElementNode): number {
  const raw = Math.round(Number(node.props['minChars']))
  return Number.isFinite(raw) ? Math.min(10, Math.max(1, raw)) : 3
}

function textOf(item: unknown): string | null {
  if (typeof item === 'string') return item.trim() || null
  if (!item || typeof item !== 'object') return null
  const record = item as Record<string, unknown>
  const inner = record['properties']
  if (inner && typeof inner === 'object') return textOf(inner)
  for (const key of ['display_name', 'label', 'name', 'text', 'address']) {
    const v = record[key]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

/** Up to SUGGEST_MAX distinct suggestion texts from a provider's JSON. */
export function suggestionTexts(data: unknown): string[] {
  let list: unknown = data
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    const record = list as Record<string, unknown>
    list = record['features'] ?? record['results'] ?? record['items'] ?? []
  }
  if (!Array.isArray(list)) return []
  const out: string[] = []
  for (const item of list) {
    const text = textOf(item)
    if (text && !out.includes(text)) out.push(text)
    if (out.length === SUGGEST_MAX) break
  }
  return out
}
