// C# code generation for the Blazor export target: DataAnnotations
// attributes where a rule maps 1:1, IValidatableObject statements for the
// rest (conditional fields, required checkboxes), and condition
// expressions as C# bools. Semantics mirror @formsgen/renderer.

import type { Condition, ConditionGroups, Rule } from '@formsgen/renderer'
import { pascalMember } from '@/registry/emitters/shared'
import type { ExportField } from './structure'

const csStr = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** C# verbatim string literal (for regex patterns). */
const csVerbatim = (s: string): string => `@"${s.replace(/"/g, '""')}"`

export function csAccessor(key: string): string {
  return `Model.${pascalMember(key)}`
}

/** Accessor used INSIDE the model class (IValidatableObject.Validate). */
export function csSelfAccessor(key: string): string {
  return pascalMember(key)
}

function csLiteral(value: unknown): string {
  if (typeof value === 'string') return csStr(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (value === null || value === undefined) return 'null'
  return csStr(String(value))
}

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

/**
 * DataAnnotations attribute lines for an UNCONDITIONAL field. Returns null
 * for rules that need IValidatableObject (then ALL the field's rules go
 * there, keeping evaluation order intact).
 */
export function csAttributes(field: ExportField, isBool: boolean): string[] | null {
  const rules = field.node.validation ?? []
  if (rules.length === 0) return []
  if (field.conditionChain.length > 0) return null
  const attrs: string[] = []
  for (const rule of rules) {
    const msg = `ErrorMessage = ${csStr(ruleMessage(rule))}`
    switch (rule.rule) {
      case 'required':
        if (isBool) return null // required checkbox -> Validate()
        attrs.push(`[Required(${msg})]`)
        break
      case 'min':
        attrs.push(`[MinLength(${Number(rule.value)}, ${msg})]`)
        break
      case 'max':
        attrs.push(`[MaxLength(${Number(rule.value)}, ${msg})]`)
        break
      case 'between': {
        const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
        attrs.push(`[MinLength(${Number(lo)}, ${msg})]`)
        attrs.push(`[MaxLength(${Number(hi)}, ${msg})]`)
        break
      }
      case 'email':
        attrs.push(`[EmailAddress(${msg})]`)
        break
      case 'url':
        attrs.push(`[Url(${msg})]`)
        break
      case 'regex':
        attrs.push(`[RegularExpression(${csVerbatim(String(rule.value))}, ${msg})]`)
        break
      case 'same-as':
        attrs.push(`[Compare(nameof(${pascalMember(String(rule.value).replace(/\./g, '_'))}), ${msg})]`)
        break
    }
  }
  return attrs
}

let varCounter = 0

function csCondition(condition: Condition, accessor: (key: string) => string): string {
  const key = condition.field.replace(/\./g, '_')
  const value = accessor(key)
  switch (condition.operator) {
    case 'equals':
      return `Equals(${value}, ${csLiteral(condition.value ?? null)})`
    case 'not-equals':
      return `!Equals(${value}, ${csLiteral(condition.value ?? null)})`
    case 'contains':
      return `(Convert.ToString(${value}) ?? "").Contains(${csStr(String(condition.value ?? ''))})`
    case 'empty':
      return `(string.IsNullOrWhiteSpace(Convert.ToString(${value})) || Equals(${value}, false))`
    case 'not-empty':
      return `!(string.IsNullOrWhiteSpace(Convert.ToString(${value})) || Equals(${value}, false))`
    case 'greater-than': {
      const v = `_fg${varCounter++}`
      return `(double.TryParse(Convert.ToString(${value}), out var ${v}) && ${v} > ${Number(condition.value)})`
    }
    case 'less-than': {
      const v = `_fg${varCounter++}`
      return `(double.TryParse(Convert.ToString(${value}), out var ${v}) && ${v} < ${Number(condition.value)})`
    }
  }
}

export function csConditions(
  groups: ConditionGroups | undefined,
  accessor: (key: string) => string,
): string {
  if (!groups || groups.length === 0) return 'true'
  return groups
    .map((group) =>
      group.length === 0 ? 'true' : `(${group.map((c) => csCondition(c, accessor)).join(' && ')})`,
    )
    .join(' || ')
}

/**
 * Validate() statements for fields whose rules can't be attributes
 * (conditional fields, required checkboxes). Runs inside the model class,
 * so the accessor is the bare member name.
 */
export function csValidateStatements(field: ExportField, isBool: boolean): string[] {
  const rules = field.node.validation ?? []
  if (rules.length === 0) return []
  const member = csSelfAccessor(field.key)
  const lines: string[] = []
  const visible =
    field.conditionChain.length > 0
      ? field.conditionChain.map((g) => `(${csConditions(g, csSelfAccessor)})`).join(' && ')
      : 'true'
  const guardOpen = visible === 'true' ? '' : `if (${visible})\n        {\n    `
  const guardClose = visible === 'true' ? '' : `\n        }`
  const checks: string[] = []
  for (const rule of rules) {
    const result = `yield return new ValidationResult(${csStr(ruleMessage(rule))}, new[] { nameof(${member}) });`
    switch (rule.rule) {
      case 'required':
        checks.push(
          isBool
            ? `    if (!${member}) ${result}`
            : `    if (string.IsNullOrWhiteSpace(${member})) ${result}`,
        )
        break
      case 'min':
        checks.push(`    if (!string.IsNullOrEmpty(${member}) && ${member}.Length < ${Number(rule.value)}) ${result}`)
        break
      case 'max':
        checks.push(`    if (!string.IsNullOrEmpty(${member}) && ${member}.Length > ${Number(rule.value)}) ${result}`)
        break
      case 'between': {
        const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
        checks.push(
          `    if (!string.IsNullOrEmpty(${member}) && (${member}.Length < ${Number(lo)} || ${member}.Length > ${Number(hi)})) ${result}`,
        )
        break
      }
      case 'email':
        checks.push(
          `    if (!string.IsNullOrEmpty(${member}) && !System.Text.RegularExpressions.Regex.IsMatch(${member}, @"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) ${result}`,
        )
        break
      case 'url':
        checks.push(
          `    if (!string.IsNullOrEmpty(${member}) && !Uri.TryCreate(${member}, UriKind.Absolute, out _)) ${result}`,
        )
        break
      case 'regex':
        checks.push(
          `    if (!string.IsNullOrEmpty(${member}) && !System.Text.RegularExpressions.Regex.IsMatch(${member}, ${csVerbatim(String(rule.value))})) ${result}`,
        )
        break
      case 'same-as':
        checks.push(
          `    if (!Equals(${member}, ${csSelfAccessor(String(rule.value).replace(/\./g, '_'))})) ${result}`,
        )
        break
    }
  }
  lines.push(`    ${guardOpen}${checks.join('\n    ')}${guardClose}`)
  return lines
}
