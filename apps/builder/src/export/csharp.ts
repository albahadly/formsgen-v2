// C# code generation for the Blazor export target: DataAnnotations
// attributes where a rule maps 1:1, IValidatableObject statements for the
// rest (conditional fields, required checkboxes), and condition
// expressions as C# bools. Semantics mirror @formsgen/renderer.

import { defaultRuleMessage, type Condition, type ConditionGroups, type Rule } from '@formsgen/renderer'
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

/** Rule message: custom, else the localized default baked in by
 * collectExportFields, else the English default. */
function ruleMessage(rule: Rule): string {
  return rule.message ?? defaultRuleMessage(rule)
}

/** C# model shapes a field can take. */
export type CsFieldKind =
  | 'string' // text-likes, textarea, select, radiogroup, date, time
  | 'bool' // checkbox
  | 'number' // number (double?)
  | 'numberValue' // range (double, always has a value)
  | 'list' // checkboxgroup / tags (List<string>)
  | 'array' // multiselect (string[], as InputSelect multiple binds arrays)

export function csFieldKind(type: string): CsFieldKind {
  switch (type) {
    case 'checkbox':
      return 'bool'
    case 'number':
      return 'number'
    case 'range':
      return 'numberValue'
    case 'checkboxgroup':
    case 'tags':
      return 'list'
    case 'multiselect':
      return 'array'
    default:
      return 'string'
  }
}

/**
 * DataAnnotations attribute lines for an UNCONDITIONAL field. Returns null
 * for rules that need IValidatableObject (then ALL the field's rules go
 * there, keeping evaluation order intact).
 */
export function csAttributes(field: ExportField, kind: CsFieldKind): string[] | null {
  const rules = field.node.validation ?? []
  if (rules.length === 0) return []
  if (field.conditionChain.length > 0) return null
  if (kind === 'bool' || kind === 'list' || kind === 'array') return null // Validate() handles these
  const numeric = kind === 'number' || kind === 'numberValue'
  // [Range] is not AllowMultiple: a numeric field with more than one of
  // min/max/between must validate in Validate() to keep both messages.
  if (
    numeric &&
    rules.filter((r) => r.rule === 'min' || r.rule === 'max' || r.rule === 'between').length > 1
  ) {
    return null
  }
  // [Url], [EmailAddress] and string [MinLength] reject "" (only null
  // passes), but an EMPTY optional field must pass — rules only apply to
  // non-empty values. Validate() guards every rule with the empty check.
  if (
    !numeric &&
    !rules.some((r) => r.rule === 'required') &&
    rules.some((r) => r.rule === 'url' || r.rule === 'email' || r.rule === 'min' || r.rule === 'between')
  ) {
    return null
  }
  const attrs: string[] = []
  for (const rule of rules) {
    const msg = `ErrorMessage = ${csStr(ruleMessage(rule))}`
    switch (rule.rule) {
      case 'required':
        attrs.push(`[Required(${msg})]`)
        break
      case 'min':
        attrs.push(
          numeric
            ? `[Range(${Number(rule.value)}, double.MaxValue, ${msg})]`
            : `[MinLength(${Number(rule.value)}, ${msg})]`,
        )
        break
      case 'max':
        attrs.push(
          numeric
            ? `[Range(double.MinValue, ${Number(rule.value)}, ${msg})]`
            : `[MaxLength(${Number(rule.value)}, ${msg})]`,
        )
        break
      case 'between': {
        const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
        if (numeric) {
          attrs.push(`[Range(${Number(lo)}, ${Number(hi)}, ${msg})]`)
        } else {
          attrs.push(`[MinLength(${Number(lo)}, ${msg})]`)
          attrs.push(`[MaxLength(${Number(hi)}, ${msg})]`)
        }
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
 * (conditional fields, checkboxes, checkbox groups). Runs inside the
 * model class, so the accessor is the bare member name.
 */
export function csValidateStatements(field: ExportField, kind: CsFieldKind): string[] {
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

  // Per-kind "empty" and "size" expressions mirroring the JS semantics.
  const emptyExpr =
    kind === 'bool'
      ? `!${member}`
      : kind === 'number'
        ? `!${member}.HasValue`
        : kind === 'numberValue'
          ? 'false'
          : kind === 'list'
            ? `${member}.Count == 0`
            : kind === 'array'
              ? `${member}.Length == 0`
              : `string.IsNullOrWhiteSpace(${member})`
  const sizeExpr =
    kind === 'number'
      ? `${member}!.Value`
      : kind === 'numberValue'
        ? member
        : kind === 'list'
          ? `${member}.Count`
          : `${member}.Length`

  const checks: string[] = []
  for (const rule of rules) {
    const result = `yield return new ValidationResult(${csStr(ruleMessage(rule))}, new[] { nameof(${member}) });`
    const guarded = (test: string): string => `    if (!(${emptyExpr}) && (${test})) ${result}`
    switch (rule.rule) {
      case 'required':
        checks.push(`    if (${emptyExpr}) ${result}`)
        break
      case 'min':
        checks.push(guarded(`${sizeExpr} < ${Number(rule.value)}`))
        break
      case 'max':
        checks.push(guarded(`${sizeExpr} > ${Number(rule.value)}`))
        break
      case 'between': {
        const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
        checks.push(guarded(`${sizeExpr} < ${Number(lo)} || ${sizeExpr} > ${Number(hi)}`))
        break
      }
      case 'email':
        checks.push(
          guarded(
            `!System.Text.RegularExpressions.Regex.IsMatch(${member}, @"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")`,
          ),
        )
        break
      case 'url':
        checks.push(guarded(`!Uri.TryCreate(${member}, UriKind.Absolute, out _)`))
        break
      case 'regex':
        checks.push(
          guarded(
            `!System.Text.RegularExpressions.Regex.IsMatch(${member}, ${csVerbatim(String(rule.value))})`,
          ),
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
