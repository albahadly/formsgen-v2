// Validation rule evaluation — the single implementation of the closed rule
// catalog. The builder's preview uses it directly; export targets must
// reproduce these exact semantics (shared-semantics tests, phase 8+).

import { MESSAGES, defaultRuleMessage, type MessageCatalog } from './messages'
import type { Rule } from './schema'

export interface RuleViolation {
  rule: string
  message: string
}

/** Resolves another field's value (for same-as); path from the data root. */
export type FieldLookup = (field: string) => unknown

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  // Composite values ({ from, to }, matrix answers) are empty while any part is.
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).some(isEmptyValue)
  }
  return false
}

/** Comparable size: string length, array length, numeric value. */
function sizeOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return value.length
  if (Array.isArray(value)) return value.length
  return null
}


function violates(rule: Rule, value: unknown, lookup: FieldLookup): boolean {
  switch (rule.rule) {
    case 'required':
      // A required checkbox must be true.
      return isEmptyValue(value) || value === false
    case 'min': {
      const size = sizeOf(value)
      return size === null || size < Number(rule.value)
    }
    case 'max': {
      const size = sizeOf(value)
      return size === null || size > Number(rule.value)
    }
    case 'between': {
      const size = sizeOf(value)
      if (size === null || !Array.isArray(rule.value)) return true
      const [lo, hi] = rule.value as [unknown, unknown]
      return size < Number(lo) || size > Number(hi)
    }
    case 'email':
      return typeof value !== 'string' || !EMAIL_PATTERN.test(value)
    case 'url': {
      if (typeof value !== 'string') return true
      try {
        new URL(value)
        return false
      } catch {
        return true
      }
    }
    case 'regex': {
      if (typeof value !== 'string') return true
      try {
        return !new RegExp(String(rule.value)).test(value)
      } catch {
        return true
      }
    }
    case 'same-as':
      return value !== lookup(String(rule.value))
  }
}

/**
 * All violations for a value. Rules other than `required` are skipped when
 * the value is empty — emptiness is only `required`'s concern.
 */
export function evaluateRules(
  rules: Rule[] | undefined,
  value: unknown,
  lookup: FieldLookup = () => undefined,
  messages: MessageCatalog = MESSAGES.en,
  /** What the other rules judge when it isn't the value itself (rich text: its visible text). */
  judged: unknown = value,
): RuleViolation[] {
  if (!rules || rules.length === 0) return []
  const violations: RuleViolation[] = []
  for (const rule of rules) {
    if (rule.rule !== 'required' && isEmptyValue(value)) continue
    if (violates(rule, rule.rule === 'required' ? value : judged, lookup)) {
      violations.push({ rule: rule.rule, message: rule.message ?? defaultRuleMessage(rule, messages) })
    }
  }
  return violations
}
