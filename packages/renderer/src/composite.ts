// Fields whose value has parts: a two-handle range slider ({ from, to }
// numbers), a date range ({ from, to } ISO dates) and multiple dates (a
// sorted list of ISO dates). A composite object value counts as empty
// while any of its parts is (see isEmptyValue), so "required" means every
// part is filled. v1: none of them may live inside a repeater.

import { fill, type MessageCatalog } from './messages'
import type { ElementNode } from './schema'

export const RANGE_SLIDER_TYPE = 'rangeslider'
export const DATE_RANGE_TYPE = 'daterange'
export const DATES_TYPE = 'dates'

/** Types whose value is an object of parts; only "required" applies to them. */
export const OBJECT_VALUE_TYPES: ReadonlySet<string> = new Set([RANGE_SLIDER_TYPE, DATE_RANGE_TYPE, 'matrix'])

export interface RangeBounds {
  min: number
  max: number
  step: number
}

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback
}

export function rangeBounds(node: ElementNode): RangeBounds {
  const min = num(node.props['min'], 0)
  const max = Math.max(num(node.props['max'], 100), min)
  const step = num(node.props['step'], 1)
  return { min, max, step: step > 0 ? step : 1 }
}

/** Initial { from, to }: props.defaultFrom/defaultTo, clamped and ordered. */
export function rangeSliderDefault(node: ElementNode): { from: number; to: number } {
  const { min, max } = rangeBounds(node)
  const clamp = (n: number): number => Math.min(Math.max(n, min), max)
  const from = clamp(num(node.props['defaultFrom'], min))
  const to = clamp(num(node.props['defaultTo'], max))
  return from <= to ? { from, to } : { from: to, to: from }
}

/** Position of `value` along the track, 0–100. */
export function rangePercent(value: number, bounds: RangeBounds): number {
  const span = bounds.max - bounds.min
  return span > 0 ? ((value - bounds.min) / span) * 100 : 0
}

/** Date range with both ends set and the end before the start. */
export function dateOrderProblem(value: unknown, messages: MessageCatalog): string | null {
  if (!value || typeof value !== 'object') return null
  const { from, to } = value as { from?: unknown; to?: unknown }
  if (typeof from !== 'string' || typeof to !== 'string' || from === '' || to === '') return null
  return to < from ? messages.dateOrder : null
}

/** A list of ISO dates with `date` added once, in calendar order. */
export function addDate(list: readonly string[], date: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || list.includes(date)) return [...list]
  return [...list, date].sort()
}

export function removeDateLabel(date: string, messages: MessageCatalog): string {
  return fill(messages.removeDate, { date })
}
