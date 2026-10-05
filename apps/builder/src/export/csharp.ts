// C# code generation for the Blazor export target: DataAnnotations
// attributes where a rule maps 1:1, IValidatableObject statements for the
// rest (conditional fields, required checkboxes), and condition
// expressions as C# bools. Semantics mirror @formsgen/renderer.

import {
  FILE_TYPES,
  MESSAGES,
  defaultRuleMessage,
  fileLimits,
  fill,
  type Condition,
  type ConditionGroups,
  type ElementNode,
  type MessageCatalog,
  type Rule,
} from '@formsgen/renderer'
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
  | 'files' // file / image upload (List<FgUpload>, buffered when picked)
  | 'range2' // two-handle range slider (FgRange: From/To doubles)
  | 'daterange' // date range (FgDateRange: From/To ISO strings)
  | 'map' // matrix (Dictionary<string, string?>: row → chosen column)

export function csFieldKind(type: string): CsFieldKind {
  switch (type) {
    case 'checkbox':
    case 'toggle':
      return 'bool'
    case 'number':
      return 'number'
    case 'range':
      return 'numberValue'
    case 'checkboxgroup':
    case 'tags':
    case 'dates':
      return 'list'
    case 'rangeslider':
      return 'range2'
    case 'daterange':
      return 'daterange'
    case 'matrix':
      return 'map'
    case 'multiselect':
      return 'array'
    case 'file':
    case 'imageupload':
      return 'files'
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
  if (['bool', 'list', 'array', 'files', 'range2', 'daterange', 'map'].includes(kind)) {
    return null // Validate() handles these
  }
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
    // FgContains/FgIsBlank are emitted into the component when used: lists
    // (checkbox groups, multiselects, uploads) need element semantics.
    case 'contains':
      return `FgContains(${value}, ${csStr(String(condition.value ?? ''))})`
    case 'empty':
      return `FgIsBlank(${value})`
    case 'not-empty':
      return `!FgIsBlank(${value})`
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
export function csValidateStatements(
  field: ExportField,
  kind: CsFieldKind,
  messages: MessageCatalog = MESSAGES.en,
): string[] {
  const rules = field.node.validation ?? []
  const builtinChecks =
    kind === 'files'
      ? csFileChecks(field.node, csSelfAccessor(field.key), messages)
      : kind === 'daterange'
        ? csDateOrderCheck(csSelfAccessor(field.key), messages)
        : []
  if (rules.length === 0 && builtinChecks.length === 0) return []
  const member = csSelfAccessor(field.key)
  const lines: string[] = []
  const visible =
    field.conditionChain.length > 0
      ? field.conditionChain.map((g) => `(${csConditions(g, csSelfAccessor)})`).join(' && ')
      : 'true'
  const guardOpen = visible === 'true' ? '' : `if (${visible})\n        {\n    `
  const guardClose = visible === 'true' ? '' : `\n        }`

  const ruleLine = ({ test, message }: { test: string; message: string }): string =>
    `    if (${test}) yield return new ValidationResult(${csStr(message)}, new[] { nameof(${member}) });`
  const required = rules.filter((r) => r.rule === 'required')
  const checks = [
    ...csRuleChecks(required, kind, member, csSelfAccessor).map(ruleLine),
    ...builtinChecks,
    ...csRuleChecks(rules.filter((r) => r.rule !== 'required'), kind, member, csSelfAccessor).map(ruleLine),
  ]
  lines.push(`    ${guardOpen}${checks.join('\n    ')}${guardClose}`)
  return lines
}

/** C# test (true = empty) for a member of the given kind. */
function csEmptyExpr(kind: CsFieldKind, member: string): string {
  switch (kind) {
    case 'bool':
      return `!${member}`
    case 'number':
      return `!${member}.HasValue`
    case 'numberValue':
    case 'range2':
      return 'false'
    case 'list':
    case 'files':
      return `${member}.Count == 0`
    case 'array':
      return `${member}.Length == 0`
    case 'daterange':
      return `(string.IsNullOrWhiteSpace(${member}.From) || string.IsNullOrWhiteSpace(${member}.To))`
    case 'map':
      return `${member}.Values.Any(string.IsNullOrEmpty)`
    default:
      return `string.IsNullOrWhiteSpace(${member})`
  }
}

/**
 * One C# test per rule (true = violated) over `member`, mirroring the JS
 * semantics: rules other than required skip empty values. `sameAs` maps a
 * same-as target key to an expression.
 */
export function csRuleChecks(
  rules: Rule[],
  kind: CsFieldKind,
  member: string,
  sameAs: (key: string) => string,
): { test: string; message: string }[] {
  const emptyExpr = csEmptyExpr(kind, member)
  const sizeExpr =
    kind === 'number'
      ? `${member}!.Value`
      : kind === 'numberValue'
        ? member
        : kind === 'list' || kind === 'files'
          ? `${member}.Count`
          : `${member}.Length`
  const guarded = (test: string): string => `!(${emptyExpr}) && (${test})`
  const checks: { test: string; message: string }[] = []
  for (const rule of rules) {
    const message = ruleMessage(rule)
    switch (rule.rule) {
      case 'required':
        checks.push({ test: emptyExpr, message })
        break
      case 'min':
        checks.push({ test: guarded(`${sizeExpr} < ${Number(rule.value)}`), message })
        break
      case 'max':
        checks.push({ test: guarded(`${sizeExpr} > ${Number(rule.value)}`), message })
        break
      case 'between': {
        const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
        checks.push({ test: guarded(`${sizeExpr} < ${Number(lo)} || ${sizeExpr} > ${Number(hi)}`), message })
        break
      }
      case 'email':
        checks.push({
          test: guarded(`!System.Text.RegularExpressions.Regex.IsMatch(${member}, @"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")`),
          message,
        })
        break
      case 'url':
        checks.push({ test: guarded(`!Uri.TryCreate(${member}, UriKind.Absolute, out _)`), message })
        break
      case 'regex':
        checks.push({
          test: guarded(`!System.Text.RegularExpressions.Regex.IsMatch(${member}, ${csVerbatim(String(rule.value))})`),
          message,
        })
        break
      case 'same-as':
        checks.push({ test: `!Equals(${member}, ${sameAs(String(rule.value).replace(/\./g, '_'))})`, message })
        break
    }
  }
  return checks
}

/** Validate() line rejecting a date range whose end is before its start. */
export function csDateOrderCheck(member: string, messages: MessageCatalog): string[] {
  return [
    `    if (!string.IsNullOrWhiteSpace(${member}.From) && !string.IsNullOrWhiteSpace(${member}.To) && string.CompareOrdinal(${member}.To, ${member}.From) < 0) yield return new ValidationResult(${csStr(messages.dateOrder)}, new[] { nameof(${member}) });`,
  ]
}

/**
 * Item-field checks with no rule behind them (FgItemError, `return` form):
 * an upload's count, type and size, and a date range's order.
 */
export function csItemBuiltinChecks(node: ElementNode, member: string, messages: MessageCatalog): string[] {
  if (node.type === 'daterange') {
    return [
      `if (!string.IsNullOrWhiteSpace(${member}.From) && !string.IsNullOrWhiteSpace(${member}.To) && string.CompareOrdinal(${member}.To, ${member}.From) < 0) return ${csStr(messages.dateOrder)};`,
    ]
  }
  if (!FILE_TYPES.has(node.type)) return []
  const limits = fileLimits(node)
  const lines: string[] = []
  if (limits.maxFiles > 0) {
    lines.push(`if (${member}.Count > ${limits.maxFiles}) return ${csStr(fill(messages.tooManyFiles, { n: limits.maxFiles }))};`)
  }
  const perFile: string[] = []
  if (limits.accept) {
    perFile.push(`if (!FgAccepts(file, ${csStr(limits.accept)})) return ${csStr(messages.fileType)}.Replace("{name}", file.Name);`)
  }
  if (limits.maxSizeMb > 0) {
    perFile.push(
      `if (file.Size > ${Math.round(limits.maxSizeMb * 1024 * 1024)}L) return ${csStr(fill(messages.fileTooLarge, { size: limits.maxSizeMb }))}.Replace("{name}", file.Name);`,
    )
  }
  if (perFile.length > 0) lines.push(`foreach (var file in ${member})`, '{', ...perFile.map((l) => `    ${l}`), '}')
  return lines
}

/** Validate() lines checking an upload's count, then each file's type and size. */
export function csFileChecks(node: ElementNode, member: string, messages: MessageCatalog): string[] {
  const limits = fileLimits(node)
  const result = (message: string): string => `yield return new ValidationResult(${message}, new[] { nameof(${member}) });`
  const lines: string[] = []
  if (limits.maxFiles > 0) {
    lines.push(`    if (${member}.Count > ${limits.maxFiles}) ${result(csStr(fill(messages.tooManyFiles, { n: limits.maxFiles })))}`)
  }
  const perFile: string[] = []
  if (limits.accept) {
    perFile.push(
      `if (!FgAccepts(file, ${csStr(limits.accept)})) { ${result(`${csStr(messages.fileType)}.Replace("{name}", file.Name)`)} break; }`,
    )
  }
  if (limits.maxSizeMb > 0) {
    perFile.push(
      `if (file.Size > ${Math.round(limits.maxSizeMb * 1024 * 1024)}L) { ${result(`${csStr(fill(messages.fileTooLarge, { size: limits.maxSizeMb }))}.Replace("{name}", file.Name)`)} break; }`,
    )
  }
  if (perFile.length > 0) {
    lines.push(`    foreach (var file in ${member})`, '    {', ...perFile.map((l) => `        ${l}`), '    }')
  }
  return lines
}
