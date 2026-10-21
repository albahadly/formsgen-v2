// Prefill from the page address in the code targets (meta.prefillFromQuery,
// hidden fields with `param`): the renderer's rules (prefill.ts) applied at
// start-up, after a restored draft, so what the link says wins. A list
// takes repeated parameters or one comma-separated value; a value that
// does not convert leaves the field alone.

import { prefillKind, type FormSchema, type PrefillKind } from '@albahadly/formsgen-renderer'
import { pascalMember } from '@/registry/emitters/shared'
import { csFieldKind } from './csharp'
import { collectExportFields } from './structure'

export interface PrefillField {
  /** The data path (nested with dots). */
  path: string
  kind: PrefillKind
  /** A hidden field's parameter name; fields read the parameter named like their path. */
  param?: string
  /** C# value shape, for the Blazor target. */
  cs: 'string' | 'number' | 'numberValue' | 'bool' | 'list' | 'array'
}

/** Fields a URL fills: by path when the flag is on, hidden fields by `param` always. */
export function prefillFields(schema: FormSchema): PrefillField[] {
  const out: PrefillField[] = []
  for (const field of collectExportFields(schema)) {
    if (field.node.type === 'hidden') {
      const param = field.node.props['param']
      if (typeof param === 'string' && param !== '') out.push({ path: field.path, kind: 'string', param, cs: 'string' })
      continue
    }
    if (schema.meta.prefillFromQuery !== true) continue
    const kind = prefillKind(field.node)
    if (!kind) continue
    const cs = csFieldKind(field.node)
    out.push({
      path: field.path,
      kind,
      cs: cs === 'number' || cs === 'numberValue' || cs === 'bool' || cs === 'list' || cs === 'array' ? cs : 'string',
    })
  }
  return out
}

export const usesPrefill = (schema: FormSchema): boolean => prefillFields(schema).length > 0

const paramOf = (field: PrefillField): string => field.param ?? field.path

/** `next.address.city` or `next['first-name']` for a data path. */
function tsMember(root: string, path: string): string {
  return path
    .split('.')
    .reduce((expr, segment) => (/^[A-Za-z_$][\w$]*$/.test(segment) ? `${expr}.${segment}` : `${expr}[${JSON.stringify(segment)}]`), root)
}

const TS_READER: Record<PrefillKind, string> = { string: 'fgQueryString', number: 'fgQueryNumber', bool: 'fgQueryBool', list: 'fgQueryList' }

/** Plain HTML: the controls by data-fg-path, set and told about it. */
export function htmlPrefillRuntime(fields: PrefillField[]): string {
  const list = fields.map((f) => `{ p: ${JSON.stringify(f.path)}, k: ${JSON.stringify(f.kind)}${f.param ? `, q: ${JSON.stringify(f.param)}` : ''} }`)
  return `// Prefill from the page address: ?field=value fills matching fields (a list
// takes repeated parameters or one comma-separated value); a hidden field
// takes its named parameter. After a restored draft: the link wins.
var FG_PREFILL = [${list.join(', ')}]
function fgPrefillValue(kind, raw) {
  var first = raw[0]
  if (first === undefined) return undefined
  if (kind === 'number') { var n = Number(first); return first.trim() !== '' && isFinite(n) ? n : undefined }
  if (kind === 'bool') { var w = first.trim().toLowerCase(); return ['1', 'true', 'on', 'yes'].indexOf(w) !== -1 ? true : ['0', 'false', 'off', 'no'].indexOf(w) !== -1 ? false : undefined }
  if (kind === 'list') return (raw.length === 1 ? first.split(',') : raw).map(function (p) { return p.trim() }).filter(function (p) { return p !== '' })
  return first
}
function fgPrefill() {
  var query = new URLSearchParams(window.location.search)
  var changed = []
  FG_PREFILL.forEach(function (field) {
    var name = field.q || field.p
    if (!query.has(name)) return
    var value = fgPrefillValue(field.k, query.getAll(name))
    if (value === undefined) return
    var controls = form.querySelectorAll('[data-fg-path="' + field.p + '"]')
    if (!controls.length) return
    var first = controls[0]
    var kind = first.getAttribute('data-fg-kind')
    if (kind === 'tags') {
      if (typeof fgTags !== 'undefined' && fgTags[field.p]) { fgTags[field.p] = value.slice(); if (first.fgPaint) first.fgPaint() }
      return
    }
    if (kind === 'dates') {
      if (typeof fgDates !== 'undefined' && fgDates[field.p]) { fgDates[field.p] = value.slice(); fgPaintDates(field.p) }
      return
    }
    if (kind === 'radio' || kind === 'score' || kind === 'checks') {
      Array.prototype.forEach.call(controls, function (input) {
        input.checked = kind === 'checks' ? value.indexOf(input.value) !== -1 : input.value === String(value)
        changed.push(input)
      })
      return
    }
    if (first.multiple) Array.prototype.forEach.call(first.options, function (option) { option.selected = value.indexOf(option.value) !== -1 })
    else if (first.type === 'checkbox') first.checked = value === true
    else if (kind === 'currency') first.value = fgMoneyFormat(value, Number(first.getAttribute('data-fg-decimals')))
    else first.value = String(value)
    changed.push(first)
  })
  changed.forEach(function (el) {
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}`
}

/** TypeScript readers shared by the React and Vue targets. */
export function tsPrefillHelpers(): string {
  return `// Prefill from the page address: a list takes repeated parameters or one
// comma-separated value; a value that does not convert is undefined.
function fgQueryString(q: URLSearchParams, name: string): string | undefined {
  const v = q.get(name)
  return v === null ? undefined : v
}
function fgQueryNumber(q: URLSearchParams, name: string): number | undefined {
  const v = q.get(name)
  if (v === null || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
function fgQueryBool(q: URLSearchParams, name: string): boolean | undefined {
  const w = (q.get(name) ?? '').trim().toLowerCase()
  return ['1', 'true', 'on', 'yes'].includes(w) ? true : ['0', 'false', 'off', 'no'].includes(w) ? false : undefined
}
function fgQueryList(q: URLSearchParams, name: string): string[] | undefined {
  if (!q.has(name)) return undefined
  const all = q.getAll(name)
  const parts = all.length === 1 ? (all[0] ?? '').split(',') : all
  return parts.map((p) => p.trim()).filter((p) => p !== '')
}`
}

/** React: a pure step over a copy of the state, run once after mount. */
export function reactPrefillFunction(fields: PrefillField[]): string {
  const lines = fields.map(
    (f) => `  { const v = ${TS_READER[f.kind]}(q, ${JSON.stringify(paramOf(f))}); if (v !== undefined) { ${tsMember('next', f.path)} = v; changed = true } }`,
  )
  return `// The state with what the page address says; null when it says nothing.
function fgPrefill(current: FormData): FormData | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const next = structuredClone(current)
  let changed = false
${lines.join('\n')}
  return changed ? next : null
}`
}

/** React: the effect, after the draft restore so the link wins. */
export function reactPrefillHook(calc: boolean): string {
  return `  // Prefill from the page address, once mounted (no server/client mismatch).
  useEffect(() => {
    setForm((current) => {
      const next = fgPrefill(current)
      return next ? ${calc ? 'fgCalc(next)' : 'next'} : current
    })
  }, [])`
}

/** Vue: assignments on the reactive form after mount (after a draft restore). */
export function vuePrefillBlock(fields: PrefillField[]): string {
  const lines = fields.map(
    (f) => `  { const v = ${TS_READER[f.kind]}(q, ${JSON.stringify(paramOf(f))}); if (v !== undefined) ${tsMember('form', f.path)} = v }`,
  )
  return `// Prefill from the page address, once mounted; after a restored draft the link wins.
onMounted(() => {
  if (typeof window === 'undefined') return
  const q = new URLSearchParams(window.location.search)
${lines.join('\n')}
})`
}

const CS_READER: Record<PrefillField['cs'], string> = {
  string: 'FgQueryString',
  number: 'FgQueryNumber',
  numberValue: 'FgQueryNumber',
  bool: 'FgQueryBool',
  list: 'FgQueryList',
  array: 'FgQueryList',
}

/** Blazor: the model set from the page address (the draft load calls it again). */
export function blazorPrefillBlock(fields: PrefillField[], model: (path: string) => string): string {
  const lines = fields.map((f) => {
    const value = f.cs === 'numberValue' || f.cs === 'bool' ? 'v.Value' : f.cs === 'array' ? 'v.ToArray()' : 'v'
    return `        { var v = ${CS_READER[f.cs]}(query, ${JSON.stringify(paramOf(f))}); if (v is not null) ${model(f.path)} = ${value}; }`
  })
  return `
    // Prefill from the page address: ?field=value fills matching fields (a
    // list takes repeated parameters or one comma-separated value); a hidden
    // field takes its named parameter. After a restored draft: the link wins.
    private void FgPrefill()
    {
        var query = System.Web.HttpUtility.ParseQueryString(new Uri(FgNav.Uri).Query);
${lines.join('\n')}
    }

    private static string? FgQueryString(System.Collections.Specialized.NameValueCollection query, string name) =>
        query.GetValues(name) is { Length: > 0 } values ? values[0] : null;

    private static double? FgQueryNumber(System.Collections.Specialized.NameValueCollection query, string name) =>
        FgQueryString(query, name) is { } v && v.Trim().Length > 0 && double.TryParse(v.Trim(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n) ? n : null;

    private static bool? FgQueryBool(System.Collections.Specialized.NameValueCollection query, string name) =>
        FgQueryString(query, name)?.Trim().ToLowerInvariant() switch
        {
            "1" or "true" or "on" or "yes" => true,
            "0" or "false" or "off" or "no" => false,
            _ => null,
        };

    private static List<string>? FgQueryList(System.Collections.Specialized.NameValueCollection query, string name)
    {
        var values = query.GetValues(name);
        if (values is null) return null;
        var parts = values.Length == 1 ? values[0].Split(',') : values;
        return parts.Select(p => p.Trim()).Where(p => p.Length > 0).ToList();
    }
`
}

/** The Blazor model member of a field path (the model is flat by key). */
export const blazorModelMember = (path: string): string => `Model.${pascalMember(path.replace(/\./g, '_'))}`
