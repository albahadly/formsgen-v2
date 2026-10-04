// Compiles validation rules and visibility conditions to JavaScript source
// strings, shared by the Vue-standalone and HTML export targets. Semantics
// MUST match @formsgen/renderer's rules.ts / conditions.ts — the behavioral
// tests in compile.test.ts run the generated code against the same cases.

import type { Condition, ConditionGroups, Rule } from '@formsgen/renderer'

/** Accessor: produces a JS expression reading a field's value by data path. */
export type ValueAccessor = (path: string) => string

const js = JSON.stringify

/** Static helper functions embedded once into every generated artifact. */
export const RUNTIME_HELPERS = `function fgIsEmpty(v) {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}
function fgSize(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') return v.length
  if (Array.isArray(v)) return v.length
  return null
}`

function ruleMessage(rule: Rule): string {
  if (rule.message) return rule.message
  switch (rule.rule) {
    case 'required':
      return 'This field is required'
    case 'min':
      return `Must be at least ${String(rule.value)}`
    case 'max':
      return `Must be at most ${String(rule.value)}`
    case 'between': {
      const [lo, hi] = Array.isArray(rule.value) ? rule.value : [undefined, undefined]
      return `Must be between ${String(lo)} and ${String(hi)}`
    }
    case 'email':
      return 'Must be a valid email address'
    case 'url':
      return 'Must be a valid URL'
    case 'regex':
      return 'Invalid format'
    case 'same-as':
      return `Must match ${String(rule.value)}`
  }
}

/** JS condition (true = violated) for one rule over the expression `v`. */
function ruleTest(rule: Rule, accessor: ValueAccessor): string {
  switch (rule.rule) {
    case 'required':
      return 'fgIsEmpty(v) || v === false'
    case 'min':
      return `(fgSize(v) ?? -Infinity) < ${Number(rule.value)}`
    case 'max':
      return `(fgSize(v) ?? Infinity) > ${Number(rule.value)}`
    case 'between': {
      const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
      return `((fgSize(v) ?? -Infinity) < ${Number(lo)} || (fgSize(v) ?? Infinity) > ${Number(hi)})`
    }
    case 'email':
      return `(typeof v !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v))`
    case 'url':
      return `(typeof v !== 'string' || !(() => { try { new URL(v); return true } catch { return false } })())`
    case 'regex':
      return `(typeof v !== 'string' || !new RegExp(${js(String(rule.value))}).test(v))`
    case 'same-as':
      return `v !== ${accessor(String(rule.value))}`
  }
}

/**
 * Function BODY validating one field: expects `v` in scope via the first
 * line, returns a message string or null. Non-required rules skip empty
 * values, exactly like the renderer.
 */
export function compileValidator(
  rules: Rule[],
  valueExpr: string,
  accessor: ValueAccessor,
): string {
  const lines = [`const v = ${valueExpr}`]
  for (const rule of rules) {
    const test = ruleTest(rule, accessor)
    const guarded = rule.rule === 'required' ? test : `!fgIsEmpty(v) && (${test})`
    lines.push(`if (${guarded}) return ${js(ruleMessage(rule))}`)
  }
  lines.push('return null')
  return lines.join('\n  ')
}

function conditionExpr(condition: Condition, accessor: ValueAccessor): string {
  const value = accessor(condition.field)
  switch (condition.operator) {
    case 'equals':
      return `${value} === ${js(condition.value ?? null)}`
    case 'not-equals':
      return `${value} !== ${js(condition.value ?? null)}`
    case 'contains':
      return `(typeof ${value} === 'string' ? ${value}.includes(${js(String(condition.value))}) : Array.isArray(${value}) ? ${value}.includes(${js(condition.value ?? null)}) : false)`
    case 'empty':
      return `(fgIsEmpty(${value}) || ${value} === false)`
    case 'not-empty':
      return `!(fgIsEmpty(${value}) || ${value} === false)`
    case 'greater-than':
      return `(Number.isFinite(Number(${value})) && Number.isFinite(Number(${js(condition.value ?? null)})) && Number(${value}) > Number(${js(condition.value ?? null)}))`
    case 'less-than':
      return `(Number.isFinite(Number(${value})) && Number.isFinite(Number(${js(condition.value ?? null)})) && Number(${value}) < Number(${js(condition.value ?? null)}))`
  }
}

/** JS boolean expression for condition groups (outer OR, inner AND). */
export function compileConditions(
  groups: ConditionGroups | undefined,
  accessor: ValueAccessor,
): string {
  if (!groups || groups.length === 0) return 'true'
  const parts = groups.map((group) => {
    if (group.length === 0) return 'true'
    return `(${group.map((c) => conditionExpr(c, accessor)).join(' && ')})`
  })
  return parts.join(' || ')
}
