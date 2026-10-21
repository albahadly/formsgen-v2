// Calculated fields in the code targets: which fields to compute, in what
// order (a field after those it reads), and each formula compiled to
// JavaScript / C# from the renderer's parsed tree (analyzeFormulas). The
// runtime helpers mirror @albahadly/formsgen-renderer's formula.ts exactly, so every
// target computes the same numbers.

import {
  CALCULATED_TYPE,
  analyzeFormulas,
  calculatedDecimals,
  calculationOrder,
  getCoreElement,
  isRepeater,
  type ElementNode,
  type FNode,
  type FormSchema,
} from '@albahadly/formsgen-renderer'

export interface CalcStep {
  node: ElementNode
  /** Template path ("total", "lines.line_total"). */
  path: string
  /** Template path of the repeater holding it ('' at top level). */
  repeater: string
  name: string
  decimals: number
  /** The parsed formula, or null when it has a problem (the value stays empty). */
  tree: FNode | null
}

function locate(nodes: ElementNode[], parent = '', repeater = '', out = new Map<string, { path: string; repeater: string }>()): Map<string, { path: string; repeater: string }> {
  for (const node of nodes) {
    const core = getCoreElement(node.type)
    if (!core) continue
    const path = node.name ? (parent ? `${parent}.${node.name}` : node.name) : parent
    if (isRepeater(node)) {
      if (node.name) locate(node.children ?? [], path, path, out)
    } else if (core.isContainer) locate(node.children ?? [], path, repeater, out)
    else if (node.type === CALCULATED_TYPE && node.name) out.set(node.id, { path, repeater })
  }
  return out
}

/** The form's calculated fields in computing order. */
export function calcSteps(schema: FormSchema): CalcStep[] {
  const where = locate(schema.tree)
  const info = analyzeFormulas(schema.tree)
  return calculationOrder(schema.tree)
    .filter((node) => where.has(node.id))
    .map((node) => {
      const at = where.get(node.id)!
      return {
        node,
        path: at.path,
        repeater: at.repeater,
        name: node.name!,
        decimals: calculatedDecimals(node),
        tree: info.get(node.id)?.tree ?? null,
      }
    })
}


export interface FormulaAccess {
  /** Raw value of a field by template path. */
  read(path: string): string
  /** The item list of a top-level repeater. */
  items(repeater: string): string
  /** A field of one item in an aggregate's callback (`it`). */
  itemField(repeater: string, field: string): string
}

/** A formula as a JavaScript/TypeScript expression (a number, maybe NaN). */
export function formulaJs(node: FNode, a: FormulaAccess): string {
  const js = (n: FNode): string => formulaJs(n, a)
  switch (node.t) {
    case 'num':
      return String(node.v)
    case 'ref':
      return `fgNum(${a.read(node.path)})`
    case 'neg':
      return `(-${js(node.a)})`
    case 'bin':
      return `(${js(node.a)} ${node.op} ${js(node.b)})`
    case 'cmp':
      return `(${js(node.a)} ${node.op === '==' ? '===' : node.op === '!=' ? '!==' : node.op} ${js(node.b)} ? 1 : 0)`
    case 'agg': {
      const items = a.items(node.repeater)
      if (node.fn === 'count') return `${items}.length`
      const sum = `${items}.reduce((s, it) => s + fgNum(${a.itemField(node.repeater, node.field!)}), 0)`
      return node.fn === 'sum' ? sum : `(${sum} / ${items}.length)`
    }
    case 'call': {
      const args = node.args.map(js)
      switch (node.fn) {
        case 'round':
          return `fgRound(${args[0]}, ${args[1] ?? '0'})`
        case 'floor':
        case 'ceil':
        case 'abs':
        case 'min':
        case 'max':
          return `Math.${node.fn}(${args.join(', ')})`
        case 'if':
          return `(${args[0]} !== 0 ? ${args[1]} : ${args[2]})`
        case 'days': {
          const raw = (n: FNode): string => (n.t === 'ref' ? a.read(n.path) : 'null')
          return node.args.length === 1
            ? `fgDaysRange(${raw(node.args[0]!)})`
            : `(fgDay(${raw(node.args[1]!)}) - fgDay(${raw(node.args[0]!)}))`
        }
      }
    }
  }
}

const csNumber = (v: number): string => (Number.isInteger(v) ? `${v}d` : `${String(v)}d`)

/** A formula as a C# double expression (maybe NaN). */
export function formulaCs(node: FNode, a: FormulaAccess): string {
  const cs = (n: FNode): string => formulaCs(n, a)
  switch (node.t) {
    case 'num':
      return csNumber(node.v)
    case 'ref':
      return `FgNum(${a.read(node.path)})`
    case 'neg':
      return `(-${cs(node.a)})`
    case 'bin':
      return `(${cs(node.a)} ${node.op} ${cs(node.b)})`
    case 'cmp':
      return `(${cs(node.a)} ${node.op} ${cs(node.b)} ? 1d : 0d)`
    case 'agg': {
      const items = a.items(node.repeater)
      if (node.fn === 'count') return `(double)${items}.Count`
      const sum = `${items}.Sum(it => FgNum(${a.itemField(node.repeater, node.field!)}))`
      return node.fn === 'sum' ? sum : `(${sum} / ${items}.Count)`
    }
    case 'call': {
      const args = node.args.map(cs)
      switch (node.fn) {
        case 'round':
          return `FgRound(${args[0]}, ${args[1] ?? '0d'})`
        case 'floor':
          return `Math.Floor(${args[0]})`
        case 'ceil':
          return `Math.Ceiling(${args[0]})`
        case 'abs':
          return `Math.Abs(${args[0]})`
        case 'min':
        case 'max': {
          const fn = node.fn === 'min' ? 'Math.Min' : 'Math.Max'
          return args.reduce((acc, x) => `${fn}(${acc}, ${x})`)
        }
        case 'if':
          return `(${args[0]} != 0 ? ${args[1]} : ${args[2]})`
        case 'days': {
          const raw = (n: FNode): string => (n.t === 'ref' ? a.read(n.path) : 'null')
          return node.args.length === 1
            ? `FgDaysRange(${raw(node.args[0]!)})`
            : `(FgDay(${raw(node.args[1]!)}) - FgDay(${raw(node.args[0]!)}))`
        }
      }
    }
  }
}

/** JS/TS helpers (same semantics as the renderer's formula.ts). */
export function calcHelpers(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Calculated fields: an answer as a number (empty 0, yes/no 1/0, a list its size).
function fgNum(v${t(': unknown')})${t(': number')} {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const text = v.trim()
    return text === '' ? 0 : /^[-+]?(\\d+\\.?\\d*|\\.\\d+)([eE][-+]?\\d+)?$/.test(text) ? Number(text) : NaN
  }
  if (Array.isArray(v)) return v.length
  return NaN
}
// Days since 1970-01-01 for a valid ISO date, NaN otherwise.
function fgDay(v${t(': unknown')})${t(': number')} {
  const m = typeof v === 'string' ? /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(v) : null
  if (!m) return NaN
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(ms).getUTCDate() === Number(m[3]) ? ms / 86400000 : NaN
}
function fgDaysRange(v${t(': unknown')})${t(': number')} {
  const r = (v && typeof v === 'object' ? v : {})${t(' as { from?: unknown; to?: unknown }')}
  return fgDay(r.to) - fgDay(r.from)
}
function fgRound(v${t(': number')}, d${t(': number')})${t(': number')} {
  const f = 10 ** d
  return Math.floor(v * f + 0.5) / f
}
// The stored value: rounded, or null when not a finite number.
function fgCalcValue(v${t(': number')}, d${t(': number')})${t(': number | null')} {
  return Number.isFinite(v) ? fgRound(v, d) : null
}
// The value as shown: fixed decimals, or empty.
function fgFmt(v${t(': unknown')}, d${t(': number')})${t(': string')} {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : ''
}`
}

/** C# helpers for the Blazor export (same semantics). */
export const CALC_HELPERS_CS = `
    // Calculated fields: an answer as a number (empty 0, yes/no 1/0, a list its size).
    private static double FgNum(object? value) => value switch
    {
        null => 0d,
        bool on => on ? 1d : 0d,
        double number => number,
        int number => number,
        string text when string.IsNullOrWhiteSpace(text) => 0d,
        string text => System.Text.RegularExpressions.Regex.IsMatch(text.Trim(), @"^[-+]?(\\d+\\.?\\d*|\\.\\d+)([eE][-+]?\\d+)?$")
            ? double.Parse(text.Trim(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture)
            : double.NaN,
        System.Collections.IDictionary => double.NaN,
        System.Collections.ICollection list => list.Count,
        _ => double.NaN,
    };

    // Days since 1970-01-01 for a valid ISO date, NaN otherwise.
    private static double FgDay(object? value) =>
        value is string text && text.Length == 10 && System.Text.RegularExpressions.Regex.IsMatch(text, @"^\\d{4}-\\d{2}-\\d{2}$")
            && DateTime.TryParseExact(text, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var day)
            ? (day - new DateTime(1970, 1, 1)).TotalDays
            : double.NaN;

    private static double FgRound(double value, double decimals)
    {
        var factor = Math.Pow(10, decimals);
        return Math.Floor(value * factor + 0.5) / factor;
    }

    private static double? FgCalcValue(double value, int decimals) => double.IsFinite(value) ? FgRound(value, decimals) : null;

    private static string FgFmt(double? value, int decimals) =>
        value is double number ? number.ToString("F" + decimals, System.Globalization.CultureInfo.InvariantCulture) : "";
`

/**
 * What a calculated field's formula may read, as insertable snippets with
 * a label: its own item's fields and top-level fields; from a top-level
 * field also sum()/count() over top-level repeaters.
 */
export function formulaSuggestions(tree: ElementNode[], id: string): { snippet: string; label: string }[] {
  interface Found {
    node: ElementNode
    path: string
    repeater: string
    depth: number
  }
  const fields: Found[] = []
  const repeaters: Found[] = []
  const walk = (nodes: ElementNode[], parent: string, repeater: string, depth: number): void => {
    for (const node of nodes) {
      const core = getCoreElement(node.type)
      if (!core) continue
      const path = node.name ? (parent ? `${parent}.${node.name}` : node.name) : parent
      if (isRepeater(node)) {
        if (!node.name) continue
        repeaters.push({ node, path, repeater, depth })
        walk(node.children ?? [], path, path, depth + 1)
      } else if (core.isContainer) walk(node.children ?? [], path, repeater, depth)
      else if (core.hasValue && node.name) fields.push({ node, path, repeater, depth })
    }
  }
  walk(tree, '', '', 0)
  const self = fields.find((f) => f.node.id === id)
  if (!self) return []
  const label = (f: Found): string => String(f.node.props['label'] ?? f.node.name ?? f.path)
  const out = fields
    .filter((f) => f.node.id !== id && (f.repeater === '' || f.repeater === self.repeater))
    .map((f) => ({ snippet: `{${f.path}}`, label: label(f) }))
  if (self.depth === 0) {
    for (const r of repeaters.filter((x) => x.depth === 0)) {
      out.push({ snippet: `count({${r.path}})`, label: `${label(r)} (count)` })
      for (const f of fields.filter((x) => x.repeater === r.path)) {
        out.push({ snippet: `sum({${f.path}})`, label: `${label(r)} › ${label(f)} (sum)` })
      }
    }
  }
  return out
}

/** Reads for Vue/React (`root` is the data object; items are plain objects). */
function objectAccess(step: CalcStep, root: string, itemVar: string): FormulaAccess {
  return {
    read: (path) => (step.repeater && path.startsWith(`${step.repeater}.`) ? `${itemVar}.${path.slice(step.repeater.length + 1)}` : `${root}.${path}`),
    items: (repeater) => `${root}.${repeater}`,
    itemField: (_repeater, field) => `it.${field}`,
  }
}

/**
 * One step over a data object. `after(pathExpr)` adds statements run when
 * the value changed (pathExpr: the field's data path as a JS expression).
 */
function objectStep(step: CalcStep, root: string, after: (pathExpr: string) => string[]): string {
  const expr = (itemVar: string): string =>
    step.tree ? `fgCalcValue(${formulaJs(step.tree, objectAccess(step, root, itemVar))}, ${step.decimals})` : 'null'
  const body = (target: string, pathExpr: string, pad: string): string[] => [
    `${pad}const v = ${expr(step.repeater ? 'item' : '')}`,
    `${pad}if (${target} !== v) {`,
    `${pad}  ${target} = v`,
    ...after(pathExpr).map((line) => `${pad}  ${line}`),
    `${pad}}`,
  ]
  // The index only when the follow-up statements use the path.
  const usesPath = after('__path__').some((line) => line.includes('__path__'))
  return step.repeater
    ? [
        usesPath ? `  ${root}.${step.repeater}.forEach((item, i) => {` : `  for (const item of ${root}.${step.repeater}) {`,
        ...body(`item.${step.name}`, `'${step.repeater}.' + i + '.${step.name}'`, '    '),
        usesPath ? '  })' : '  }',
      ].join('\n')
    : ['  {', ...body(`${root}.${step.path}`, `'${step.path}'`, '    '), '  }'].join('\n')
}

/** The calculated fields' data paths for a data object (items expanded). */
function calcPathsJs(steps: CalcStep[], root: string): string {
  const parts = steps.map((s) =>
    s.repeater ? `...${root}.${s.repeater}.map((_, i) => '${s.repeater}.' + i + '.${s.name}')` : `'${s.path}'`,
  )
  return `[${parts.join(', ')}]`
}

/** Vue standalone: recompute into the reactive form (watched synchronously). */
export function vueCalcBlock(steps: CalcStep[]): string {
  return `${calcHelpers(true)}
// Calculated fields, in order (a field after those it reads).
function fgCalc(): void {
${steps.map((s) => objectStep(s, 'form', (path) => [`// After a submit attempt its error follows the new value.`, `if (touched.has(${path})) runValidator(${path})`])).join('\n')}
}
fgCalc()
watch(form, fgCalc, { deep: true, flush: 'sync' })`
}

/** React: a pure step applied to every new form state. */
export function reactCalcBlock(steps: CalcStep[]): string {
  return `${calcHelpers(true)}
// Calculated fields, in order (a field after those it reads); the same
// object back when nothing changed.
function fgCalc(f: FormData): FormData {
  const next = structuredClone(f)
  let changed = false
${steps.map((s) => objectStep(s, 'next', () => ['changed = true'])).join('\n')}
  return changed ? next : f
}
// The calculated fields' data paths (revalidated after a submit attempt).
function fgCalcPaths(${steps.some((st) => st.repeater) ? 'f' : '_f'}: FormData): string[] {
  return ${calcPathsJs(steps, 'f')}
}`
}

/** HTML: compute from the controls and write into the read-only boxes. */
export function htmlCalcBlock(steps: CalcStep[]): string {
  const lines = steps.map((step) => {
    const access = (indexVar: string): FormulaAccess => ({
      read: (path) =>
        step.repeater && path.startsWith(`${step.repeater}.`)
          ? `fgGet('${step.repeater}.' + ${indexVar} + '.${path.slice(step.repeater.length + 1)}')`
          : `fgGet('${path}')`,
      items: (repeater) => `fgItemIndexes('${repeater}')`,
      itemField: (repeater, field) => `fgGet('${repeater}.' + it + '.${field}')`,
    })
    const body = (indexVar: string): string => (step.tree ? formulaJs(step.tree, access(indexVar)) : 'NaN')
    return step.repeater
      ? `  fgItemIndexes('${step.repeater}').forEach(function (i) {\n    fgSetCalc('${step.repeater}.' + i + '.${step.name}', ${step.decimals}, ${body('i')})\n  })`
      : `  fgSetCalc('${step.path}', ${step.decimals}, ${body('')})`
  })
  return `${calcHelpers(false)}
// Writes a calculated value into its read-only box (data-fg-value holds the number).
function fgSetCalc(path, decimals, raw) {
  var el = fgControl(path)
  if (!el) return
  var value = fgCalcValue(raw, decimals)
  var text = value === null ? '' : String(value)
  if (el.getAttribute('data-fg-value') === text) return
  el.setAttribute('data-fg-value', text)
  el.value = fgFmt(value, decimals)
  // After a submit attempt its error follows the new value.
  if (touched[path]) validateField(path)
}
// Calculated fields, in order (a field after those it reads).
function fgCalcAll() {
${lines.join('\n')}
}`
}
