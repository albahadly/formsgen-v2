// Compiles validation rules and visibility conditions to JavaScript source
// strings, shared by the Vue-standalone and HTML export targets. Semantics
// MUST match @albahadly/formsgen-renderer's rules.ts / conditions.ts — the behavioral
// tests in compile.test.ts run the generated code against the same cases.

import { defaultRuleMessage, type Condition, type ConditionGroups, type Rule } from '@albahadly/formsgen-renderer'

/** Accessor: produces a JS expression reading a field's value by data path. */
export type ValueAccessor = (path: string) => string

const js = JSON.stringify

function runtimeHelpers(ts: boolean): string {
  const v = ts ? 'v: unknown' : 'v'
  const ret = (type: string): string => (ts ? `: ${type}` : '')
  return `function fgIsEmpty(${v})${ret('boolean')} {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  // Composite values ({ from, to }) are empty while any part is.
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.keys(v).some((k) => fgIsEmpty(${ts ? '(v as Record<string, unknown>)' : 'v'}[k]))
  }
  return false
}
// Empty, or an unchecked checkbox/toggle (takes any type, so typed targets
// never compare a string field with false).
function fgIsBlank(${v})${ret('boolean')} {
  return fgIsEmpty(v) || v === false
}
function fgSize(${v})${ret('number | null')} {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') return v.length
  if (Array.isArray(v)) return v.length
  return null
}
// A date range whose end comes before its start.
function fgDateOrder(${v})${ret('boolean')} {
  ${ts ? 'const r = (v ?? {}) as { from?: unknown; to?: unknown }' : 'var r = v || {}'}
  return typeof r.from === 'string' && typeof r.to === 'string' && r.from !== '' && r.to !== '' && r.to < r.from
}
// The "contains" condition: a substring of text, or an item of a list.
function fgContains(${v}, ${ts ? 'x: unknown' : 'x'})${ret('boolean')} {
  if (typeof v === 'string') return v.includes(String(x))
  return Array.isArray(v) && v.includes(x)
}`
}

/**
 * Upload helpers, embedded only into forms with upload fields: the same
 * size/type/count check as the renderer, multipart building (a JSON "data"
 * part + one part per file named by data path), and a JSON replacer that
 * shows files as { name, size, type }. fgMultipart has no return
 * annotation: typed targets name their own data interface FormData.
 */
function fileHelpers(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `function fgAccepts(file${t(': File')}, accept${t(': string')})${t(': boolean')} {
  if (accept.trim() === '') return true
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  return accept.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean).some((token) =>
    token.startsWith('.') ? name.endsWith(token) : token.endsWith('/*') ? type.startsWith(token.slice(0, -1)) : type === token,
  )
}
function fgFileProblem(v${t(': unknown')}, accept${t(': string')}, maxMb${t(': number')}, maxFiles${t(': number')}, m${t(': { tooMany: string; type: string; size: string }')})${t(': string | null')} {
  const files = Array.isArray(v) ? v.filter((f) => f instanceof File)${t(' as File[]')} : []
  if (maxFiles > 0 && files.length > maxFiles) return m.tooMany
  for (const file of files) {
    if (!fgAccepts(file, accept)) return m.type.split('{name}').join(file.name)
    if (maxMb > 0 && file.size > maxMb * 1024 * 1024) return m.size.split('{name}').join(file.name)
  }
  return null
}
function fgFileJson(_key${t(': string')}, value${t(': unknown')})${t(': unknown')} {
  return value instanceof File ? { name: value.name, size: value.size, type: value.type } : value
}
function fgMultipart(payload${t(': Record<string, unknown>')}) {
  const files${t(': { path: string; file: File }[]')} = []
  const walk = (value${t(': unknown')}, path${t(': string')})${t(': unknown')} => {
    if (value instanceof File) {
      files.push({ path, file: value })
      return fgFileJson('', value)
    }
    if (Array.isArray(value)) {
      const fileList = value.length > 0 && value.every((v) => v instanceof File)
      return value.map((v, i) => walk(v, fileList ? path : path + '.' + i))
    }
    if (value && typeof value === 'object') {
      const out${t(': Record<string, unknown>')} = {}
      for (const [key, v] of Object.entries(value)) out[key] = walk(v, path ? path + '.' + key : key)
      return out
    }
    return value
  }
  const data = walk(payload, '')
  const body = new FormData()
  body.append('data', JSON.stringify(data))
  for (const part of files) body.append(part.path, part.file, part.file.name)
  return body
}
// Sends with XMLHttpRequest, which (unlike fetch) reports upload progress.
function fgSend(url${t(': string')}, method${t(': string')}, body${t(': globalThis.FormData')}, onProgress${t(': (percent: number) => void')}, onDone${t(': (ok: boolean) => void')})${t(': void')} {
  const request = new XMLHttpRequest()
  request.open(method, url)
  request.upload.onprogress = (event) => {
    if (event.lengthComputable && event.total > 0) onProgress(Math.round((event.loaded / event.total) * 100))
  }
  request.onload = () => onDone(request.status >= 200 && request.status < 300)
  request.onerror = request.onabort = () => onDone(false)
  request.send(body)
}`
}

export const FILE_HELPERS = fileHelpers(false)
export const FILE_HELPERS_TS = fileHelpers(true)

/** Static helper functions embedded once into every generated artifact (JS). */
export const RUNTIME_HELPERS = runtimeHelpers(false)

/** The same helpers with type annotations, for TypeScript targets (Vue, React). */
export const RUNTIME_HELPERS_TS = runtimeHelpers(true)

/** Rule message: custom, else the localized default baked in by
 * collectExportFields, else the English default. */
function ruleMessage(rule: Rule): string {
  return rule.message ?? defaultRuleMessage(rule)
}

/**
 * JS condition (true = violated) for one rule over the expression `v`; the
 * size and format rules judge `s` (the value itself, or a rich-text
 * answer's visible text).
 */
function ruleTest(rule: Rule, accessor: ValueAccessor, s = 'v'): string {
  switch (rule.rule) {
    case 'required':
      return 'fgIsBlank(v)'
    case 'min':
      return `(fgSize(${s}) ?? -Infinity) < ${Number(rule.value)}`
    case 'max':
      return `(fgSize(${s}) ?? Infinity) > ${Number(rule.value)}`
    case 'between': {
      const [lo, hi] = Array.isArray(rule.value) ? rule.value : [0, 0]
      return `((fgSize(${s}) ?? -Infinity) < ${Number(lo)} || (fgSize(${s}) ?? Infinity) > ${Number(hi)})`
    }
    case 'email':
      return `(typeof ${s} !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(${s}))`
    case 'url':
      return `(typeof ${s} !== 'string' || !(() => { try { new URL(${s}); return true } catch { return false } })())`
    case 'regex':
      return `(typeof ${s} !== 'string' || !new RegExp(${js(String(rule.value))}).test(${s}))`
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
  /** Expression yielding a message or null, checked right after "required". */
  extraCheck?: string,
  /** What size and format rules judge, when not `v` (rich text: `fgRichPlain(v)`). */
  subject?: string,
): string {
  const lines = [`const v = ${valueExpr}`]
  const extra = extraCheck ? `{ const problem = ${extraCheck}; if (problem) return problem }` : ''
  const required = rules.filter((r) => r.rule === 'required')
  for (const rule of [...required, ...rules.filter((r) => r.rule !== 'required')]) {
    const test = ruleTest(rule, accessor, subject)
    const guarded = rule.rule === 'required' ? test : `!fgIsEmpty(v) && (${test})`
    lines.push(`if (${guarded}) return ${js(ruleMessage(rule))}`)
    if (rule.rule === 'required' && extra) lines.push(extra)
  }
  if (extra && required.length === 0) lines.splice(1, 0, extra)
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
      return `fgContains(${value}, ${js(condition.value ?? null)})`
    case 'empty':
      return `fgIsBlank(${value})`
    case 'not-empty':
      return `!fgIsBlank(${value})`
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

/**
 * Drops top-level `fg*` helper functions the generated code never calls
 * (e.g. fgSize without size rules), repeatedly, so typed exports compile
 * under noUnusedLocals. A helper is a `function fgX(` at the start of a
 * line whose body ends at the next line holding only `}`.
 */
export function pruneUnusedHelpers(code: string): string {
  let out = code
  for (;;) {
    // Unused: no reference outside its own body (self-recursion doesn't count).
    const unused = [...out.matchAll(/^function (fg\w+)\(/gm)].find((m) => {
      const end = out.indexOf('\n}\n', m.index)
      if (end === -1) return false
      const outside = out.slice(0, m.index) + out.slice(end + 3)
      return !new RegExp(`\\b${m[1]}\\b`).test(outside)
    })
    if (!unused || unused.index === undefined) return out
    const end = out.indexOf('\n}\n', unused.index)
    if (end === -1) return out
    // also drop a comment block directly above the function
    let start = unused.index
    while (start > 0) {
      const lineStart = out.lastIndexOf('\n', start - 2) + 1
      if (!out.slice(lineStart, start).startsWith('//')) break
      start = lineStart
    }
    out = out.slice(0, start) + out.slice(end + 3)
  }
}
