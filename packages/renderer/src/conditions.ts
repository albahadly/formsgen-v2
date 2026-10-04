// Visibility condition evaluation — the single implementation of the closed
// operator catalog. Condition `field` is a dot path from the data root
// (e.g. "contact_method" or "account.username").

import { isEmptyValue } from './rules'
import type { Condition, ConditionGroups } from './schema'

export type ValueLookup = (field: string) => unknown

/** Reads a dot-path ("account.username") out of nested data. */
export function getValueByPath(data: Record<string, unknown>, path: string): unknown {
  let current: unknown = data
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function evaluateCondition(condition: Condition, lookup: ValueLookup): boolean {
  const actual = lookup(condition.field)
  switch (condition.operator) {
    case 'equals':
      return actual === condition.value
    case 'not-equals':
      return actual !== condition.value
    case 'contains':
      if (typeof actual === 'string') return actual.includes(String(condition.value))
      if (Array.isArray(actual)) return actual.includes(condition.value)
      return false
    case 'empty':
      return isEmptyValue(actual) || actual === false
    case 'not-empty':
      return !(isEmptyValue(actual) || actual === false)
    case 'greater-than': {
      const a = Number(actual)
      const b = Number(condition.value)
      return Number.isFinite(a) && Number.isFinite(b) && a > b
    }
    case 'less-than': {
      const a = Number(actual)
      const b = Number(condition.value)
      return Number.isFinite(a) && Number.isFinite(b) && a < b
    }
  }
}

/**
 * Outer array OR-ed, inner arrays AND-ed. No groups (or only empty groups)
 * means visible.
 */
export function isVisible(groups: ConditionGroups | undefined, lookup: ValueLookup): boolean {
  if (!groups || groups.length === 0) return true
  return groups.some((group) => group.every((condition) => evaluateCondition(condition, lookup)))
}
