// Core element semantics: the renderer-side knowledge about each element
// type — whether it carries a value, whether it nests children, and what its
// default value is. Builder-side authoring metadata (icons, palette labels,
// property panels) lives in the builder's registry (see ADR-0001).

import { rangeSliderDefault } from './composite'
import { matrixDefault } from './matrix'
import type { ElementNode } from './schema'

export interface CoreElementMeta {
  type: string
  /** Participates in form data under its `name`. */
  hasValue: boolean
  /** Accepts child nodes. */
  isContainer: boolean
  /** Initial value when the node's props carry no `default`. */
  defaultValue: (node: ElementNode) => unknown
}

const meta = (
  type: string,
  hasValue: boolean,
  isContainer: boolean,
  defaultValue: (node: ElementNode) => unknown,
): CoreElementMeta => ({ type, hasValue, isContainer, defaultValue })

/** Text-like types sharing the FgText component; value = input type attr. */
export const TEXT_INPUT_TYPES: Record<string, string> = {
  text: 'text',
  email: 'email',
  password: 'password',
  url: 'url',
  phone: 'tel',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
  month: 'month',
  week: 'week',
  color: 'color',
  search: 'search',
}

/** Static (valueless, non-container) types rendered by FgStatic. */
export const STATIC_TYPES: ReadonlySet<string> = new Set([
  'heading',
  'paragraph',
  'divider',
  'image',
  'link',
  'quote',
  'html',
  'button',
])

/** Core element catalog; builder definitions must match (ADR-0001). */
export const coreElements: Record<string, CoreElementMeta> = {
  text: meta('text', true, false, () => ''),
  email: meta('email', true, false, () => ''),
  password: meta('password', true, false, () => ''),
  url: meta('url', true, false, () => ''),
  phone: meta('phone', true, false, () => ''),
  date: meta('date', true, false, () => ''),
  time: meta('time', true, false, () => ''),
  datetime: meta('datetime', true, false, () => ''),
  month: meta('month', true, false, () => ''),
  week: meta('week', true, false, () => ''),
  // A color input always shows a color; the data matches what is shown.
  color: meta('color', true, false, () => '#000000'),
  search: meta('search', true, false, () => ''),
  hidden: meta('hidden', true, false, (node) => String(node.props['value'] ?? '')),
  toggle: meta('toggle', true, false, () => false),
  // Uploads hold the chosen File objects (an empty list when none).
  file: meta('file', true, false, () => []),
  imageupload: meta('imageupload', true, false, () => []),
  textarea: meta('textarea', true, false, () => ''),
  number: meta('number', true, false, () => null),
  select: meta('select', true, false, () => null),
  multiselect: meta('multiselect', true, false, () => []),
  tags: meta('tags', true, false, () => []),
  radiogroup: meta('radiogroup', true, false, () => null),
  checkbox: meta('checkbox', true, false, () => false),
  checkboxgroup: meta('checkboxgroup', true, false, () => []),
  range: meta('range', true, false, (node) => Number(node.props['min'] ?? 0)),
  // Composite values (see composite.ts).
  rangeslider: meta('rangeslider', true, false, rangeSliderDefault),
  daterange: meta('daterange', true, false, () => ({ from: '', to: '' })),
  dates: meta('dates', true, false, () => []),
  matrix: meta('matrix', true, false, matrixDefault),
  // Computed from a formula (formula.ts); null until it has a value.
  calculated: meta('calculated', true, false, () => null),
  heading: meta('heading', false, false, () => undefined),
  paragraph: meta('paragraph', false, false, () => undefined),
  divider: meta('divider', false, false, () => undefined),
  image: meta('image', false, false, () => undefined),
  link: meta('link', false, false, () => undefined),
  quote: meta('quote', false, false, () => undefined),
  // The author's HTML, sanitized (safeHtml.ts).
  html: meta('html', false, false, () => undefined),
  button: meta('button', false, false, () => undefined),
  group: meta('group', false, true, () => undefined),
  columns: meta('columns', false, true, () => undefined),
  // A repeater is a container whose value is an array of item objects
  // (one per item, built from its children); see repeater.ts.
  repeater: meta('repeater', true, true, () => []),
  tabs: meta('tabs', false, true, () => undefined),
  tab: meta('tab', false, true, () => undefined),
  steps: meta('steps', false, true, () => undefined),
  step: meta('step', false, true, () => undefined),
}

/** Container types whose children are restricted to one section type. */
export const SECTION_CONTAINERS: Record<string, string> = {
  tabs: 'tab',
  steps: 'step',
}

/** Section types that may ONLY live inside their parent container type. */
export const SECTION_TYPES: Record<string, string> = {
  tab: 'tabs',
  step: 'steps',
}

export function getCoreElement(type: string): CoreElementMeta | undefined {
  return coreElements[type]
}

/** Boolean-valued types (checkbox semantics: required means "must be true"). */
export const BOOLEAN_TYPES: ReadonlySet<string> = new Set(['checkbox', 'toggle'])

/**
 * A link/image URL safe to put in generated markup: http(s), mailto, tel,
 * site-relative or in-page. Blocks javascript:, data: and the like.
 */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const url = value.trim()
  if (url === '' || url.length > 2048 || /[\s<>"'`\\]/.test(url)) return false
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return true
  // Relative: no scheme before the first / ? #
  return !/^[^/?#]*:/.test(url)
}

export type ChoiceDisplay = 'list' | 'blocks' | 'buttons'

/** How a radio/checkbox group presents its options (props.display). */
export function choiceDisplay(node: ElementNode): ChoiceDisplay {
  const display = node.props['display']
  return display === 'blocks' || display === 'buttons' ? display : 'list'
}

/** Range sliders drawn vertically (props.orientation). */
export function isVerticalRange(node: ElementNode): boolean {
  return node.props['orientation'] === 'vertical'
}
