// Export-side support for the composite fields (two-handle range slider,
// date range, multiple dates): their stylesheet rules and helpers shared
// by the targets. The slider rules are framework-neutral, so Tailwind and
// Bootstrap exports embed them as they are (vanilla already has them).

import { hasLocation } from './location'
import { hasRichText } from './richAnswer'
import { hasSignature } from './signature'
import {
  COUNTRY_DIAL_CODES,
  DATES_TYPE,
  DATE_RANGE_TYPE,
  MATRIX_TYPE,
  RANGE_SLIDER_TYPE,
  hasCountrySelect,
  hasUploadFields,
  matrixMultiple,
  initialPhoneCountry,
  phoneCountries,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'
import type { ExportField } from './structure'
import type { CssFrameworkAdapter } from './css/types'
import { BOOTSTRAP_UPLOAD_CSS } from './uploadRuntime'

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
.fg-pair > .fg-input { flex: 1 1 10rem; inline-size: auto; min-inline-size: 0; }
.fg-pair-button { flex: none; white-space: nowrap; }
.fg-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-block-start: 0.5rem; }
/* Capped so a long country name never pushes past the field. */
.fg-phone-country { flex: 0 1 45%; inline-size: auto; min-inline-size: 0; max-inline-size: 45%; }
.fg-matrix-scroll { overflow-x: auto; }
.fg-matrix { inline-size: 100%; border-collapse: collapse; font-size: 0.875rem; }
.fg-matrix th, .fg-matrix td { padding: 0.5rem; line-height: 1.25rem; text-align: center; }
.fg-matrix input { inline-size: 1rem; block-size: 1rem; margin: 0; vertical-align: middle; accent-color: var(--fg-color-primary, var(--bs-primary, #4f46e5)); }
.fg-matrix thead th { font-weight: 600; color: var(--fg-color-muted, var(--bs-secondary-color, #6b7280)); }
.fg-matrix tbody th { text-align: start; font-weight: 500; }
.fg-matrix tbody tr { border-block-start: 1px solid var(--fg-color-border, var(--bs-border-color, #d1d5db)); }
.fg-matrix tbody tr:nth-child(odd) { background: var(--fg-color-surface, var(--bs-tertiary-bg, #f9fafb)); }

/* Field add-ons and help tooltips (framework-neutral: exports embed them). */
.fg-affix-group { display: flex; align-items: stretch; }
.fg-affix-group > input { flex: 1 1 auto; min-inline-size: 0; inline-size: auto; }
.fg-affix-group > :not(:first-child) { margin-inline-start: -1px; border-start-start-radius: 0; border-end-start-radius: 0; }
.fg-affix-group > :not(:last-child) { border-start-end-radius: 0; border-end-end-radius: 0; }
.fg-affix { display: flex; align-items: center; padding-inline: 0.75rem; font-size: 1rem; line-height: 1.5; white-space: nowrap; color: var(--fg-color-muted, var(--bs-secondary-color, #6b7280)); background: var(--fg-color-surface, var(--bs-tertiary-bg, #f9fafb)); border: 1px solid var(--fg-color-border, var(--bs-border-color, #d1d5db)); border-radius: var(--fg-radius, 0.375rem); }
.fg-label-row { display: flex; align-items: center; gap: 0.375rem; }
/* The bubble anchors to the row holding the tip (label row, checkbox row or
   legend), from its start edge, so it never runs off a narrow screen. */
.fg-tip { display: inline-flex; vertical-align: middle; margin-inline-start: 0.25rem; }
:has(> .fg-tip) { position: relative; }
.fg-label-row > .fg-tip { margin-inline-start: 0; }
.fg-tip-button { display: inline-flex; align-items: center; justify-content: center; inline-size: 1.125rem; block-size: 1.125rem; padding: 0; font: 600 0.6875rem/1 system-ui, sans-serif; color: var(--fg-color-muted, var(--bs-secondary-color, #6b7280)); background: transparent; border: 1px solid currentColor; border-radius: 50%; cursor: help; }
.fg-tip-button:focus-visible { outline: 2px solid var(--fg-color-primary, var(--bs-primary, #4f46e5)); outline-offset: 2px; }
.fg-tip-text { position: absolute; inset-block-end: calc(100% + 0.375rem); inset-inline-start: 0; z-index: 20; inline-size: max-content; max-inline-size: min(16rem, calc(100vw - 2rem)); padding: 0.375rem 0.5rem; font-size: 0.75rem; font-weight: 400; line-height: 1.4; text-align: start; color: #ffffff; background: #111827; border-radius: 0.375rem; visibility: hidden; opacity: 0; transition: opacity 0.12s; pointer-events: none; }
.fg-tip:hover .fg-tip-text, .fg-tip-button:focus + .fg-tip-text { visibility: visible; opacity: 1; }

/* Floating labels (meta.floatingLabels): the label floats when the control is focused or filled. */
.fg-floating { position: relative; }
.fg-floating > .fg-input, .fg-floating > .fg-select { padding-block: 1.375rem 0.375rem; }
.fg-floating > .fg-floating-label { position: absolute; inset-block-start: 0; inset-inline-start: 0; padding: 0.875rem 0.75rem 0; font-size: 0.875rem; color: var(--fg-color-muted); pointer-events: none; transform-origin: 0 0; transition: transform 0.12s ease, color 0.12s ease; }
[dir='rtl'] .fg-floating > .fg-floating-label { transform-origin: 100% 0; }
.fg-floating > :focus ~ .fg-floating-label, .fg-floating > :not(:placeholder-shown) ~ .fg-floating-label, .fg-floating > select ~ .fg-floating-label { transform: translateY(-0.5rem) scale(0.8); }
.fg-floating > :focus ~ .fg-floating-label { color: var(--fg-color-primary); }
.fg-floating > :not(:focus)::placeholder { color: transparent; }
`

/** Help-tooltip rules (framework-neutral, like the slider's). */
export const TIP_CSS = `.fg-label-row { display: flex; align-items: center; gap: 0.375rem; }
/* The bubble anchors to the row holding the tip (label row, checkbox row or
   legend), from its start edge, so it never runs off a narrow screen. */
.fg-tip { display: inline-flex; vertical-align: middle; margin-inline-start: 0.25rem; }
:has(> .fg-tip) { position: relative; }
.fg-label-row > .fg-tip { margin-inline-start: 0; }
.fg-tip-button { display: inline-flex; align-items: center; justify-content: center; inline-size: 1.125rem; block-size: 1.125rem; padding: 0; font: 600 0.6875rem/1 system-ui, sans-serif; color: var(--fg-color-muted, var(--bs-secondary-color, #6b7280)); background: transparent; border: 1px solid currentColor; border-radius: 50%; cursor: help; }
.fg-tip-button:focus-visible { outline: 2px solid var(--fg-color-primary, var(--bs-primary, #4f46e5)); outline-offset: 2px; }
.fg-tip-text { position: absolute; inset-block-end: calc(100% + 0.375rem); inset-inline-start: 0; z-index: 20; inline-size: max-content; max-inline-size: min(16rem, calc(100vw - 2rem)); padding: 0.375rem 0.5rem; font-size: 0.75rem; font-weight: 400; line-height: 1.4; text-align: start; color: #ffffff; background: #111827; border-radius: 0.375rem; visibility: hidden; opacity: 0; transition: opacity 0.12s; pointer-events: none; }
.fg-tip:hover .fg-tip-text, .fg-tip-button:focus + .fg-tip-text { visibility: visible; opacity: 1; }
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

function nodesHaveMultiMatrix(nodes: ElementNode[]): boolean {
  return nodes.some((n) => (n.type === MATRIX_TYPE && matrixMultiple(n)) || nodesHaveMultiMatrix(n.children ?? []))
}
/** Vue/React: a matrix row's answers with one column ticked or unticked, in column order. */
export const MATRIX_TOGGLE_TS = `// A matrix row's answers with one column ticked or unticked, in column order.
function fgToggleCell(columns: string[], current: string[], column: string): string[] {
  return columns.filter((c) => (c === column) !== current.includes(c))
}`

/** A matrix taking several answers per row (checkboxes). */
export const hasMultiMatrix = (schema: FormSchema): boolean => nodesHaveMultiMatrix(schema.tree)

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
}
// The country whose code starts the value ("+44 …"; the field's own first), as
// for restored answers; the fallback when none does.
function fgPhoneFrom(value${t(': unknown')}, fallback${t(': string')})${t(': string')} {
  if (typeof value !== 'string' || value.indexOf('+' + FG_DIAL[fallback] + ' ') === 0) return fallback
  for (var code in FG_DIAL) if (value.indexOf('+' + FG_DIAL[code] + ' ') === 0) return code
  return fallback
}`
}

/**
 * Metrics Bootstrap's utilities cannot express (its spacing scale has no
 * 0.375rem step, its heading sizes are responsive, `.border` colours are
 * !important): the rules that give a Bootstrap export the same shape as its
 * vanilla and Tailwind flavours. Hook classes (`fg-*`) sit beside the
 * Bootstrap classes in the adapter. Shipped with every Bootstrap export.
 */
export const BOOTSTRAP_PARITY_CSS = `.fg-field { gap: 0.375rem; }
.fg-field > legend { margin-block-end: 0.375rem; }
.fg-options { gap: 0.375rem; }
.fg-required { margin-inline-start: 0.125rem; }
.fg-label, .fg-description, .fg-error { line-height: 1.25rem; }
.fg-heading { margin: 0; font-weight: 600; line-height: 1.25; }
h1.fg-heading { font-size: 1.875rem; }
h2.fg-heading { font-size: 1.5rem; }
h3.fg-heading { font-size: 1.25rem; }
h4.fg-heading { font-size: 1.125rem; }
h5.fg-heading { font-size: 1rem; }
h6.fg-heading { font-size: 0.875rem; }
.fg-option-block { cursor: pointer; gap: 0.75rem; padding-inline: 0.75rem; }
.fg-option-block:has(:checked) { border-color: var(--bs-primary) !important; box-shadow: 0 0 0 1px var(--bs-primary); }
.fg-richtext-button { min-inline-size: 2rem; --bs-btn-line-height: 1.25rem; --bs-btn-border-radius: 0.375rem; }
.fg-option-button { --bs-btn-font-size: 0.875rem; --bs-btn-line-height: 1.25rem; --bs-btn-padding-y: 0.5rem; --bs-btn-padding-x: 1rem; --bs-btn-font-weight: 600; }
.fg-repeater-remove { --bs-btn-font-size: 0.875rem; --bs-btn-line-height: 1.25rem; --bs-btn-border-width: 0; --bs-btn-border-radius: 0; }
.fg-tab-list { --bs-nav-link-font-size: 0.875rem; }
.fg-tab-list .nav-link { line-height: 1.25rem; }
.fg-switch-wrap { padding-inline-start: 2.75rem; min-block-size: 1.5rem; }
.fg-switch-wrap .form-check-input.fg-switch { inline-size: 2.25rem; block-size: 1.25rem; margin-inline-start: -2.75rem; margin-block-start: 0.125rem; }
.fg-matrix th, .fg-matrix td { line-height: 1.25rem; }
.fg-matrix tbody tr { border-block-start: 1px solid var(--bs-border-color); }
.fg-matrix .form-check-input { inline-size: 1rem; block-size: 1rem; margin: 0; vertical-align: middle; }
.fg-rich-text > * { margin: 0; }
.fg-rich-text > * + * { margin-block-start: 0.5em; }
.fg-rich-text ul, .fg-rich-text ol { padding-inline-start: 1.25em; }
.fg-pair > .form-control { flex: 1 1 10rem; inline-size: auto; min-inline-size: 0; }
.fg-repeater-move { inline-size: 2rem; block-size: 2rem; padding: 0; }
`

function hasHtmlBlock(nodes: ElementNode[]): boolean {
  return nodes.some((n) => n.type === 'html' || hasHtmlBlock(n.children ?? []))
}

/**
 * The author's HTML in an HTML block keeps its usual shape in every flavour
 * (Tailwind's preflight unstyles lists and headings, Bootstrap's reboot adds
 * its own margins and sizes): the vanilla rules, anchored on the block's
 * class so they beat the framework's element rules.
 */
export const HTML_BLOCK_CSS = `.fg-html { overflow-wrap: anywhere; }
.fg-html > :first-child { margin-block-start: 0; }
.fg-html > :last-child { margin-block-end: 0; }
.fg-html :where(p, ul, ol, dl, table, blockquote, figure, pre, details) { margin-block: 0.5em; }
.fg-html :where(h1, h2, h3, h4, h5, h6) { margin-block: 0.75em 0.375em; font-weight: 600; line-height: 1.3; }
.fg-html :where(h1) { font-size: 1.5em; }
.fg-html :where(h2) { font-size: 1.3em; }
.fg-html :where(h3) { font-size: 1.15em; }
.fg-html :where(ul) { list-style: disc; padding-inline-start: 1.25em; }
.fg-html :where(ol) { list-style: decimal; padding-inline-start: 1.25em; }
.fg-html :where(table) { border-collapse: collapse; }
.fg-html :where(th, td) { padding: 0.25rem 0.5rem; border: 1px solid var(--fg-color-border, var(--bs-border-color, #d1d5db)); text-align: start; }
.fg-html :where(img) { max-inline-size: 100%; block-size: auto; }
.fg-html :where(iframe) { display: block; border: 0; max-inline-size: 100%; }
.fg-html :where(a) { color: var(--fg-color-primary, var(--bs-primary, #4f46e5)); }
`

/** The target's stylesheet, plus the slider rules where the framework lacks them. */
export function exportStylesheet(css: CssFrameworkAdapter, schema: FormSchema): string | undefined {
  const base = css.stylesheet?.(schema.meta.theme)
  if (css.id === 'vanilla') return base
  const extra = [
    css.id === 'bootstrap5' ? `/* FormsGen parity: the same shape as the other flavours */\n${BOOTSTRAP_PARITY_CSS}` : '',
    hasRangeSlider(schema) ? `/* Two-handle range slider */\n${DUAL_RANGE_CSS}` : '',
    css.id === 'bootstrap5' && hasRichText(schema.tree)
      ? '/* Rich text editors */\n.fg-richtext-editor { min-height: 6rem; padding: 0.5rem 0.75rem; outline: none; overflow-wrap: anywhere; }\n.fg-richtext-editor p { margin-bottom: 0.5rem; }\n[data-fg-rich]:focus-within { outline: 2px solid var(--bs-primary); outline-offset: 2px; }\n'
      : '',
    css.id === 'bootstrap5' && hasLocation(schema.tree)
      ? '/* Location fields: the map under page overlays, coordinate boxes side by side */\n.fg-location-map { isolation: isolate; z-index: 0; }\n.fg-location-coord { flex: 1 1 8rem; }\n.fg-location-status:empty { display: none; }\n'
      : '',
    css.id === 'bootstrap5' && hasSignature(schema.tree)
      ? '/* Signature pads: dashed, drawing instead of scrolling */\n.fg-signature-pad { border-style: dashed !important; touch-action: none; cursor: crosshair; }\n'
      : '',
    css.id === 'bootstrap5' && hasSortableRepeater(schema.tree) ? `/* Sortable items: the dragged item, where it would land */\n${itemDragCss()}` : '',
    hasTooltips(schema) ? `/* Help tooltips */\n${TIP_CSS}` : '',
    hasHtmlBlock(schema.tree) ? `/* HTML blocks */\n${HTML_BLOCK_CSS}` : '',
    css.id === 'bootstrap5' && hasUploadFields(schema.tree) ? `/* Upload drop zones */\n${BOOTSTRAP_UPLOAD_CSS}` : '',
    // Bootstrap hides floating-label placeholders even on focus; show the hint then.
    css.id === 'bootstrap5' && schema.meta.floatingLabels
      ? '/* Floating labels: the placeholder hint shows on focus */\n.form-floating > .form-control:focus::placeholder { color: var(--bs-secondary-color); }\n'
      : '',
  ].filter(Boolean)
  if (extra.length === 0) return base
  return [base, ...extra].filter(Boolean).join('\n')
}

function nodesHaveTooltip(nodes: ElementNode[]): boolean {
  return nodes.some((node) => {
    const tip = node.props['tooltip']
    return (typeof tip === 'string' && tip.trim() !== '') || nodesHaveTooltip(node.children ?? [])
  })
}

function hasSortableRepeater(nodes: ElementNode[]): boolean {
  return nodes.some((n) => (n.type === 'repeater' && n.props['sortable'] === true) || hasSortableRepeater(n.children ?? []))
}

/** Bootstrap has no utilities for these (Tailwind's item classes carry them). */
function itemDragCss(): string {
  const line = 'var(--bs-primary)'
  return `.fg-repeater-handle { cursor: grab; }
[data-fg-item][data-fg-drag] { opacity: 0.5; }
[data-fg-item][data-fg-drop="before"] { box-shadow: 0 -3px 0 0 ${line}; }
[data-fg-item][data-fg-drop="after"] { box-shadow: 0 3px 0 0 ${line}; }
`
}

export const hasTooltips = (schema: FormSchema): boolean => nodesHaveTooltip(schema.tree)

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
