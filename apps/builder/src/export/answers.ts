// Answers inside text ({field}, {field|fallback}) in the code targets:
// labels, descriptions, headings and paragraphs become markup whose static
// parts are escaped for the language and whose answers are expressions
// (Vue {{ }}, JSX { }, Razor @( )) or, in plain HTML, <span data-fg-answer>
// painted by the runtime. Formatting mirrors the renderer's answerText:
// option labels for choices, Yes/No, lists joined, "from – to" ranges,
// calculated values with their decimals, file names; '' → the fallback.

import { CALCULATED_TYPE, calculatedDecimals, pipeParts, type ElementNode, type MessageCatalog } from '@formsgen/renderer'
import { esc } from '@/registry/emitters/shared'
import type { EmitterLang } from '@/registry/types'
import { ITEM_TOKENS } from './structure'

export interface AnswerField {
  node: ElementNode
  /** Template path of its repeater ('' at top level). */
  repeater: string
}

export interface PipeEnv {
  lang: EmitterLang
  fields: Map<string, AnswerField>
  /** Data path of the container, with item tokens ("people.__i__"). */
  parent: string
  /** Value expression for a template path in this scope (JS targets). */
  accessor: (path: string) => string
  /** Value expression for a template path in this scope (Blazor, C#). */
  csAccessor?: ((path: string) => string) | undefined
  messages: MessageCatalog
  separator: string
}

const CHOICES = new Set(['select', 'radiogroup', 'multiselect', 'checkboxgroup'])
const YES_NO = new Set(['checkbox', 'toggle'])

/** The enclosing item's template path and its prefix with tokens ('' outside items). */
function itemScope(parent: string): { template: string; prefix: string } {
  const segments = parent.split('.')
  const last = segments.map((s) => (ITEM_TOKENS as readonly string[]).includes(s)).lastIndexOf(true)
  if (last === -1) return { template: '', prefix: '' }
  const prefix = segments.slice(0, last + 1)
  return { template: prefix.filter((s) => !(ITEM_TOKENS as readonly string[]).includes(s)).join('.'), prefix: prefix.join('.') }
}

function labelsOf(node: ElementNode): Record<string, string> {
  const items = Array.isArray(node.props['items']) ? (node.props['items'] as { value: unknown; label?: unknown }[]) : []
  return Object.fromEntries(items.map((o) => [String(o.value), String(o.label ?? o.value)]))
}

/** JS expression formatting a value as text. */
function formatJs(node: ElementNode, value: string, env: PipeEnv): string {
  const sep = JSON.stringify(env.separator)
  if (node.type === CALCULATED_TYPE) return `fgFmt(${value}, ${calculatedDecimals(node)})`
  if (YES_NO.has(node.type)) return `fgYesNo(${value}, ${JSON.stringify(env.messages.yes)}, ${JSON.stringify(env.messages.no)})`
  if (node.type === 'matrix') return `''`
  if (CHOICES.has(node.type)) return `fgPick(${value}, ${JSON.stringify(labelsOf(node))}, ${sep})`
  return `fgAnswer(${value}, ${sep})`
}

/** A single-quoted JS string for Vue interpolations ("<" escaped so the template parser never sees a tag). */
const jsSingle = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3c')}'`

const csStr = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** C# expression formatting a value as text. */
function formatCs(node: ElementNode, value: string, env: PipeEnv): string {
  const sep = csStr(env.separator)
  if (node.type === CALCULATED_TYPE) return `FgFmt(${value}, ${calculatedDecimals(node)})`
  if (YES_NO.has(node.type)) return `(${value} ? ${csStr(env.messages.yes)} : ${csStr(env.messages.no)})`
  if (node.type === 'matrix') return '""'
  if (CHOICES.has(node.type)) {
    const entries = Object.entries(labelsOf(node)).map(([k, v]) => `[${csStr(k)}] = ${csStr(v)}`)
    return `FgPick(${value}, new Dictionary<string, string> { ${entries.join(', ')} }, ${sep})`
  }
  return `FgAnswer(${value}, ${sep})`
}

/** Static text escaped for the language. */
function staticText(text: string, lang: EmitterLang): string {
  const escaped = esc(text)
  if (lang === 'vue') return escaped.replace(/\{/g, '&#123;')
  if (lang === 'react') return escaped.replace(/[{}]/g, (b) => `{'${b}'}`)
  return escaped
}

/** The text as markup for the language, answers included. */
export function pipeMarkup(text: string, env: PipeEnv): string {
  if (!text.includes('{')) return staticText(text, env.lang)
  const scope = itemScope(env.parent)
  return pipeParts(text)
    .map((part) => {
      if (part.t === 'text') return staticText(part.v, env.lang)
      const field = env.fields.get(part.path)
      if (!field || (field.repeater !== '' && field.repeater !== scope.template)) return staticText(part.raw, env.lang)
      const fallback = part.fallback
      switch (env.lang) {
        case 'vue':
          return `{{ fgOr(${formatJs(field.node, env.accessor(part.path), env).replace(/</g, '\\u003c')}, ${jsSingle(fallback)}) }}`
        case 'react':
          return `{fgOr(${formatJs(field.node, env.accessor(part.path), env)}, ${JSON.stringify(fallback)})}`
        case 'blazor':
          return `@(FgOr(${formatCs(field.node, (env.csAccessor ?? env.accessor)(part.path), env)}, ${csStr(fallback)}))`
        default: {
          // Plain HTML: painted at run time (item paths keep their tokens; stamping fills them).
          const path = field.repeater && scope.prefix ? `${scope.prefix}${part.path.slice(scope.template.length)}` : part.path
          return `<span data-fg-answer="${esc(path)}" data-fg-fallback="${esc(fallback)}">${esc(fallback)}</span>`
        }
      }
    })
    .join('')
}

/** Does any label, description, heading or paragraph hold an answer reference? */
export function usesAnswers(nodes: ElementNode[]): boolean {
  return nodes.some((node) => {
    const texts = [node.props['label'], node.props['description'], node.type === 'heading' || node.type === 'paragraph' ? node.props['text'] : undefined]
    return texts.some((t) => typeof t === 'string' && /\{\s*[a-zA-Z]/.test(t)) || usesAnswers(node.children ?? [])
  })
}

/** JS/TS helpers (same text as the renderer's answerText). */
export function answerHelpers(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Answers inside text: a value as text ('' when empty).
function fgAnswer(v${t(': unknown')}, sep${t(': string')})${t(': string')} {
  if (v === null || v === undefined || v === '') return ''
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' && 'name' in x ? String(x.name) : String(x))).join(sep)
  if (typeof v === 'object') {
    const r = v${t(' as { from?: unknown; to?: unknown }')}
    const from = r.from === null || r.from === undefined ? '' : String(r.from)
    const to = r.to === null || r.to === undefined ? '' : String(r.to)
    return from !== '' && to !== '' ? from + ' – ' + to : ''
  }
  return String(v)
}
function fgPick(v${t(': unknown')}, labels${t(': Record<string, string>')}, sep${t(': string')})${t(': string')} {
  if (v === null || v === undefined || v === '') return ''
  return (Array.isArray(v) ? v : [v]).map((x) => labels[String(x)] ?? String(x)).join(sep)
}
function fgYesNo(v${t(': unknown')}, yes${t(': string')}, no${t(': string')})${t(': string')} {
  return v === true ? yes : v === false ? no : ''
}
function fgOr(text${t(': string')}, fallback${t(': string')})${t(': string')} {
  return text === '' ? fallback : text
}`
}

/** C# helpers; `types` lists which composite classes exist in this form. */
export function answerHelpersCs(types: { range: boolean; dateRange: boolean; uploads: boolean }): string {
  return `
    // Answers inside text: a value as text ("" when empty).
    private static string FgAnswer(object? value, string sep) => value switch
    {
        null => "",
        string text => text,
        double number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
        int number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),${types.dateRange ? `
        FgDateRange range => string.IsNullOrEmpty(range.From) || string.IsNullOrEmpty(range.To) ? "" : range.From + " – " + range.To,` : ''}${types.range ? `
        FgRange range => range.From.ToString(System.Globalization.CultureInfo.InvariantCulture) + " – " + range.To.ToString(System.Globalization.CultureInfo.InvariantCulture),` : ''}${types.uploads ? `
        IEnumerable<FgUpload> files => string.Join(sep, files.Select(f => f.Name)),` : ''}
        IEnumerable<string> list => string.Join(sep, list),
        _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? "",
    };

    private static string FgPick(object? value, Dictionary<string, string> labels, string sep) => value switch
    {
        string text when text == "" => "",
        string text => labels.TryGetValue(text, out var label) ? label : text,
        IEnumerable<string> list => string.Join(sep, list.Select(v => labels.TryGetValue(v, out var label) ? label : v)),
        _ => "",
    };

    private static string FgOr(string text, string fallback) => text == "" ? fallback : text;
`
}

/** Plain HTML: fills every <span data-fg-answer> from the controls. */
export function htmlAnswerPainter(fields: Map<string, AnswerField>, messages: MessageCatalog, separator: string): string {
  const env = { lang: 'html' as const, fields, parent: '', accessor: (p: string) => p, messages, separator }
  const formats = [...fields.entries()]
    .map(([path, f]) => `  ${JSON.stringify(path)}: function (v) { return ${formatJs(f.node, 'v', env)} },`)
    .join('\n')
  return `${answerHelpers(false)}
// Answer formatting by template path ("people.pname").
var FG_ANSWER_FORMAT = {
${formats}
}
function fgPaintAnswers() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-fg-answer]'), function (el) {
    var path = el.getAttribute('data-fg-answer')
    var template = path.split('.').filter(function (s) { return !/^\\d+$/.test(s) }).join('.')
    var format = FG_ANSWER_FORMAT[template]
    var text = format ? fgOr(format(fgGet(path)), el.getAttribute('data-fg-fallback')) : ''
    if (el.textContent !== text) el.textContent = text
  })
}`
}
