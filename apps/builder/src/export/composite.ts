// Export-side support for the composite fields (two-handle range slider,
// date range, multiple dates): their stylesheet rules and helpers shared
// by the targets. The slider rules are framework-neutral, so Tailwind and
// Bootstrap exports embed them as they are (vanilla already has them).

import {
  COUNTRY_DIAL_CODES,
  DATES_TYPE,
  DATE_RANGE_TYPE,
  MATRIX_TYPE,
  RANGE_SLIDER_TYPE,
  hasCountrySelect,
  initialPhoneCountry,
  phoneCountries,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'
import type { ExportField } from './structure'
import type { CssFrameworkAdapter } from './css/types'

/** Mirrors the renderer's "Composite fields" block (styles.css). */
export const COMPOSITE_CSS = `/* Composite fields (two-handle slider, date range, multiple dates).
   Framework-neutral: the exports embed the slider rules as they are. */
.fg-dual { position: relative; height: 1.5rem; margin-block: 0.25rem; }
.fg-dual-track { position: absolute; inset-inline: 0; top: 50%; height: 0.375rem; transform: translateY(-50%); border-radius: 999px; background: var(--fg-color-border, var(--bs-border-color, #d1d5db)); }
.fg-dual-fill { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: var(--fg-color-primary, var(--bs-primary, #4f46e5)); }
.fg-dual input[type='range'] { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: none; pointer-events: none; -webkit-appearance: none; appearance: none; }
.fg-dual input[type='range']::-webkit-slider-runnable-track { height: 1.5rem; background: none; border: none; }
.fg-dual input[type='range']::-moz-range-track { background: none; border: none; }
.fg-dual input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 1.125rem; height: 1.125rem; margin-top: 0.1875rem; border-radius: 50%; background: var(--fg-color-primary, var(--bs-primary, #4f46e5)); border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25); cursor: pointer; }
.fg-dual input[type='range']::-moz-range-thumb { pointer-events: auto; width: 1.125rem; height: 1.125rem; border-radius: 50%; background: var(--fg-color-primary, var(--bs-primary, #4f46e5)); border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25); cursor: pointer; }
.fg-dual input[type='range']:focus-visible { outline: none; }
.fg-dual input[type='range']:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--fg-color-primary, var(--bs-primary, #4f46e5)); outline-offset: 2px; }
.fg-dual input[type='range']:focus-visible::-moz-range-thumb { outline: 2px solid var(--fg-color-primary, var(--bs-primary, #4f46e5)); outline-offset: 2px; }
.fg-pair { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.fg-pair > .fg-input { flex: 1 1 10rem; inline-size: auto; }
.fg-pair-button { flex: none; white-space: nowrap; }
.fg-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-block-start: 0.5rem; }
.fg-phone-country { flex: 0 1 16rem; inline-size: auto; }
.fg-matrix-scroll { overflow-x: auto; }
.fg-matrix { inline-size: 100%; border-collapse: collapse; font-size: 0.875rem; }
.fg-matrix th, .fg-matrix td { padding: 0.5rem; text-align: center; }
.fg-matrix thead th { font-weight: 600; color: var(--fg-color-muted, var(--bs-secondary-color, #6b7280)); }
.fg-matrix tbody th { text-align: start; font-weight: 500; }
.fg-matrix tbody tr:nth-child(odd) { background: var(--fg-color-surface, var(--bs-tertiary-bg, #f9fafb)); }
`

/** The two-handle slider rules alone (the rest maps to framework classes). */
export const DUAL_RANGE_CSS = `.fg-dual { position: relative; height: 1.5rem; margin-block: 0.25rem; }
.fg-dual-track { position: absolute; inset-inline: 0; top: 50%; height: 0.375rem; transform: translateY(-50%); border-radius: 999px; background: var(--fg-color-border, var(--bs-border-color, #d1d5db)); }
.fg-dual-fill { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: var(--fg-color-primary, var(--bs-primary, #4f46e5)); }
.fg-dual input[type='range'] { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: none; pointer-events: none; -webkit-appearance: none; appearance: none; }
.fg-dual input[type='range']::-webkit-slider-runnable-track { height: 1.5rem; background: none; border: none; }
.fg-dual input[type='range']::-moz-range-track { background: none; border: none; }
.fg-dual input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 1.125rem; height: 1.125rem; margin-top: 0.1875rem; border-radius: 50%; background: var(--fg-color-primary, var(--bs-primary, #4f46e5)); border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25); cursor: pointer; }
.fg-dual input[type='range']::-moz-range-thumb { pointer-events: auto; width: 1.125rem; height: 1.125rem; border-radius: 50%; background: var(--fg-color-primary, var(--bs-primary, #4f46e5)); border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25); cursor: pointer; }
.fg-dual input[type='range']:focus-visible { outline: none; }
.fg-dual input[type='range']:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--fg-color-primary, var(--bs-primary, #4f46e5)); outline-offset: 2px; }
.fg-dual input[type='range']:focus-visible::-moz-range-thumb { outline: 2px solid var(--fg-color-primary, var(--bs-primary, #4f46e5)); outline-offset: 2px; }
`

export function treeHasType(nodes: ElementNode[], type: string): boolean {
  return nodes.some((node) => node.type === type || treeHasType(node.children ?? [], type))
}

export const hasRangeSlider = (schema: FormSchema): boolean => treeHasType(schema.tree, RANGE_SLIDER_TYPE)
export const hasDateRange = (schema: FormSchema): boolean => treeHasType(schema.tree, DATE_RANGE_TYPE)
export const hasDates = (schema: FormSchema): boolean => treeHasType(schema.tree, DATES_TYPE)
export const hasMatrix = (schema: FormSchema): boolean => treeHasType(schema.tree, MATRIX_TYPE)

/** Phone fields showing the country selector (repeater items never do). */
export function phoneCountryFields(fields: ExportField[]): ExportField[] {
  return fields.filter((f) => hasCountrySelect(f.node))
}

/** ISO → calling code for every country the form's phone selectors offer. */
export function dialCodes(fields: ExportField[], locale: string): Record<string, string> {
  const codes: Record<string, string> = {}
  for (const f of phoneCountryFields(fields)) {
    for (const c of phoneCountries(f.node, locale)) codes[c.code] = COUNTRY_DIAL_CODES[c.code]!
  }
  return Object.fromEntries(Object.entries(codes).sort(([a], [b]) => a.localeCompare(b)))
}

/** Starting country per phone field, keyed by `key(field)`. */
export function phoneDefaults(fields: ExportField[], locale: string, key: (f: ExportField) => string): Record<string, string> {
  return Object.fromEntries(phoneCountryFields(fields).map((f) => [key(f), initialPhoneCountry(f.node, locale)]))
}

/** Phone helpers for the JS targets (`ts` adds type annotations). */
export function phoneHelpers(fields: ExportField[], locale: string, ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `${ts ? 'const' : 'var'} FG_DIAL${t(': Record<string, string>')} = ${JSON.stringify(dialCodes(fields, locale))}
// The number part of "+<code> <number>" for the selected country.
function fgPhoneNumber(value${t(': string')}, country${t(': string')})${t(': string')} {
  var prefix = '+' + FG_DIAL[country] + ' '
  return value.indexOf(prefix) === 0 ? value.slice(prefix.length) : value
}
function fgComposePhone(country${t(': string')}, number${t(': string')})${t(': string')} {
  return number.trim() === '' ? '' : '+' + FG_DIAL[country] + ' ' + number
}`
}

/** The target's stylesheet, plus the slider rules where the framework lacks them. */
export function exportStylesheet(css: CssFrameworkAdapter, schema: FormSchema): string | undefined {
  const base = css.stylesheet?.(schema.meta.theme)
  if (css.id === 'vanilla' || !hasRangeSlider(schema)) return base
  return `${base ?? ''}${base ? '\n' : ''}/* Two-handle range slider */\n${DUAL_RANGE_CSS}`
}

/** Typed helpers for the slider in the Vue and React exports. */
export const DUAL_RANGE_HELPERS_TS = `type FgRangeValue = { from: number; to: number }
function fgDualClamp(v: FgRangeValue, side: 'from' | 'to', n: number): FgRangeValue {
  return side === 'from' ? { from: Math.min(n, v.to), to: v.to } : { from: v.from, to: Math.max(n, v.from) }
}
function fgDualFill(v: FgRangeValue, min: number, max: number): { insetInlineStart: string; insetInlineEnd: string } {
  const pct = (n: number): number => (max > min ? ((n - min) / (max - min)) * 100 : 0)
  return { insetInlineStart: pct(v.from) + '%', insetInlineEnd: 100 - pct(v.to) + '%' }
}
// With both handles together, the one that can still move is on top.
function fgDualFromOnTop(v: FgRangeValue, min: number, max: number): boolean {
  return v.from === v.to && v.from > (min + max) / 2
}`

/** A list of ISO dates with the date added once, in calendar order (TS). */
export const ADD_DATE_TS = `function fgWithDate(list: string[], date: string): string[] {
  return /^\\d{4}-\\d{2}-\\d{2}$/.test(date) && !list.includes(date) ? [...list, date].sort() : list
}`
