// Calculated fields (element type "calculated", props.formula): a small,
// safe formula language parsed into a tree, never evaluated as code.
//
//   {nights} * {price} + {breakfast} * 15     field values by data path
//   round({total} * 1.05, 2)  floor  ceil  abs  min(a, b, …)  max(a, b, …)
//   if({nights} >= 7, 0.9, 1)                 > < >= <= == != compare
//   days({checkin}, {checkout})  days({stay})  whole days between dates
//   sum({lines.price})  avg({lines.price})  count({lines})   over a repeater
//
// Values become numbers: empty → 0, true/false → 1/0, numeric text → its
// number, a list (checkboxes, files) → how many; anything else makes the
// result empty. The result is rounded to props.decimals (default 2); a
// division by zero or an invalid date gives an empty result (null).
// Inside a repeater item, {lines.qty} reads that item's own field.
// The exports compile the same tree to JavaScript / C#, so every runtime
// computes the same numbers (rounding is floor(x * 10^d + 0.5) / 10^d).

import { getCoreElement } from './elements'
import { isRepeater } from './repeater'
import type { ElementNode } from './schema'

export const CALCULATED_TYPE = 'calculated'

export type FNode =
  | { t: 'num'; v: number }
  | { t: 'ref'; path: string }
  | { t: 'neg'; a: FNode }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '%'; a: FNode; b: FNode }
  | { t: 'cmp'; op: '>' | '<' | '>=' | '<=' | '==' | '!='; a: FNode; b: FNode }
  | { t: 'call'; fn: 'round' | 'floor' | 'ceil' | 'abs' | 'min' | 'max' | 'if' | 'days'; args: FNode[] }
  /** sum/avg of an item field over a repeater's items, or count of its items. */
  | { t: 'agg'; fn: 'sum' | 'avg' | 'count'; repeater: string; field: string | null }

const FUNCTIONS: Record<string, [min: number, max: number]> = {
  round: [1, 2],
  floor: [1, 1],
  ceil: [1, 1],
  abs: [1, 1],
  min: [1, 20],
  max: [1, 20],
  if: [3, 3],
  days: [1, 2],
}
const AGGREGATES = new Set(['sum', 'avg', 'count'])

type Token = { k: 'num'; v: number } | { k: 'ref'; v: string } | { k: 'id'; v: string } | { k: 'op'; v: string }

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  const pattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|\{\s*([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)*)\s*\}|([a-zA-Z]+)|(>=|<=|==|!=|[-+*/%(),<>]))/y
  let at = 0
  while (at < source.length) {
    if (/^\s*$/.test(source.slice(at))) break
    pattern.lastIndex = at
    const m = pattern.exec(source)
    if (!m) throw new Error(`unexpected "${source.slice(at).trim()[0]}"`)
    if (m[1] !== undefined) tokens.push({ k: 'num', v: Number(m[1]) })
    else if (m[2] !== undefined) tokens.push({ k: 'ref', v: m[2] })
    else if (m[3] !== undefined) tokens.push({ k: 'id', v: m[3].toLowerCase() })
    else tokens.push({ k: 'op', v: m[4]! })
    at = pattern.lastIndex
  }
  return tokens
}

/** Parses a formula; throws an Error with a readable message when invalid. */
export function parseFormula(source: string): FNode {
  const tokens = tokenize(source)
  if (tokens.length === 0) throw new Error('the formula is empty')
  let i = 0
  const peek = (): Token | undefined => tokens[i]
  const isOp = (v: string): boolean => peek()?.k === 'op' && peek()!.v === v
  const expect = (v: string): void => {
    if (!isOp(v)) throw new Error(`expected "${v}"`)
    i++
  }
  const comparison = (): FNode => {
    const a = additive()
    const t = peek()
    if (t?.k === 'op' && ['>', '<', '>=', '<=', '==', '!='].includes(t.v)) {
      i++
      return { t: 'cmp', op: t.v as Extract<FNode, { t: 'cmp' }>['op'], a, b: additive() }
    }
    return a
  }
  const additive = (): FNode => {
    let a = term()
    while (isOp('+') || isOp('-')) {
      const op = (tokens[i++] as { v: '+' | '-' }).v
      a = { t: 'bin', op, a, b: term() }
    }
    return a
  }
  const term = (): FNode => {
    let a = unary()
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = (tokens[i++] as { v: '*' | '/' | '%' }).v
      a = { t: 'bin', op, a, b: unary() }
    }
    return a
  }
  const unary = (): FNode => {
    if (isOp('-')) {
      i++
      return { t: 'neg', a: unary() }
    }
    if (isOp('+')) {
      i++
      return unary()
    }
    return primary()
  }
  const primary = (): FNode => {
    const t = peek()
    if (!t) throw new Error('the formula ends too early')
    if (t.k === 'num') {
      i++
      return { t: 'num', v: t.v }
    }
    if (t.k === 'ref') {
      i++
      return { t: 'ref', path: t.v }
    }
    if (t.k === 'id') {
      i++
      expect('(')
      const args: FNode[] = []
      if (!isOp(')')) {
        args.push(comparison())
        while (isOp(',')) {
          i++
          args.push(comparison())
        }
      }
      expect(')')
      if (AGGREGATES.has(t.v)) {
        const ref = args[0]
        if (args.length !== 1 || ref?.t !== 'ref') throw new Error(`${t.v}() takes one {repeater.field}`)
        if (t.v === 'count') return { t: 'agg', fn: 'count', repeater: ref.path, field: null }
        const dot = ref.path.lastIndexOf('.')
        if (dot === -1) throw new Error(`${t.v}() takes a field inside a repeater, like {lines.price}`)
        return { t: 'agg', fn: t.v as 'sum' | 'avg', repeater: ref.path.slice(0, dot), field: ref.path.slice(dot + 1) }
      }
      const arity = FUNCTIONS[t.v]
      if (!arity) throw new Error(`unknown function "${t.v}"`)
      if (args.length < arity[0] || args.length > arity[1]) throw new Error(`${t.v}() takes ${arity[0] === arity[1] ? arity[0] : `${arity[0]}–${arity[1]}`} values`)
      return { t: 'call', fn: t.v as Extract<FNode, { t: 'call' }>['fn'], args }
    }
    if (isOp('(')) {
      i++
      const inner = comparison()
      expect(')')
      return inner
    }
    throw new Error(`unexpected "${t.v}"`)
  }
  const tree = comparison()
  if (i < tokens.length) throw new Error(`unexpected "${String(tokens[i]!.v)}"`)
  return tree
}

/** Number value of an answer (see the top of this file). */
export function formulaNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const text = value.trim()
    return text === '' ? 0 : /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(text) ? Number(text) : NaN
  }
  if (Array.isArray(value)) return value.length
  return NaN
}

/** Days since 1970-01-01 for a valid ISO date (YYYY-MM-DD), NaN otherwise. */
export function formulaDay(value: unknown): number {
  const m = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (!m) return NaN
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  // Impossible dates (2026-02-30) don't roll over.
  return new Date(ms).getUTCDate() === Number(m[3]) ? ms / 86400000 : NaN
}

/** floor(x · 10^d + 0.5) / 10^d — the same in every runtime. */
export function formulaRound(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.floor(value * factor + 0.5) / factor
}

export function calculatedDecimals(node: ElementNode): number {
  const d = Number(node.props['decimals'] ?? 2)
  return Number.isInteger(d) && d >= 0 && d <= 6 ? d : 2
}

export interface FormulaContext {
  /** An answer by template path (inside an item: that item's own fields). */
  value(path: string): unknown
  /** The items of a repeater (by template path). */
  items(repeater: string): Record<string, unknown>[]
}

export function evaluateFormula(node: FNode, ctx: FormulaContext): number {
  const ev = (n: FNode): number => evaluateFormula(n, ctx)
  switch (node.t) {
    case 'num':
      return node.v
    case 'ref':
      return formulaNumber(ctx.value(node.path))
    case 'neg':
      return -ev(node.a)
    case 'bin': {
      const a = ev(node.a)
      const b = ev(node.b)
      return node.op === '+' ? a + b : node.op === '-' ? a - b : node.op === '*' ? a * b : node.op === '/' ? a / b : a % b
    }
    case 'cmp': {
      const a = ev(node.a)
      const b = ev(node.b)
      const yes = node.op === '>' ? a > b : node.op === '<' ? a < b : node.op === '>=' ? a >= b : node.op === '<=' ? a <= b : node.op === '==' ? a === b : a !== b
      return yes ? 1 : 0
    }
    case 'agg': {
      const items = ctx.items(node.repeater)
      if (node.fn === 'count') return items.length
      const total = items.reduce((sum, item) => sum + formulaNumber(item[node.field!]), 0)
      return node.fn === 'sum' ? total : total / items.length
    }
    case 'call': {
      const [a, b] = node.args
      switch (node.fn) {
        case 'round':
          return formulaRound(ev(a!), b ? ev(b) : 0)
        case 'floor':
          return Math.floor(ev(a!))
        case 'ceil':
          return Math.ceil(ev(a!))
        case 'abs':
          return Math.abs(ev(a!))
        case 'min':
          return Math.min(...node.args.map(ev))
        case 'max':
          return Math.max(...node.args.map(ev))
        case 'if':
          return ev(a!) !== 0 ? ev(b!) : ev(node.args[2]!)
        case 'days': {
          if (!b) {
            const range = a!.t === 'ref' ? ctx.value(a!.path) : null
            const r = range && typeof range === 'object' ? (range as { from?: unknown; to?: unknown }) : {}
            return formulaDay(r.to) - formulaDay(r.from)
          }
          const day = (n: FNode): number => (n.t === 'ref' ? formulaDay(ctx.value(n.path)) : NaN)
          return day(b) - day(a!)
        }
      }
    }
  }
}

/** The final value: rounded, or null when it isn't a finite number. */
export function calculatedValue(tree: FNode, ctx: FormulaContext, decimals: number): number | null {
  const value = evaluateFormula(tree, ctx)
  return Number.isFinite(value) ? formulaRound(value, decimals) : null
}

/** The value as shown: fixed decimals, or empty. */
export function formatCalculated(value: unknown, decimals: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : ''
}

// ---- checking formulas against the form ----

interface IndexedField {
  node: ElementNode
  /** Template path (repeater items without indexes): "lines.price". */
  path: string
  /** Template path of the repeater holding it ('' at top level). */
  repeater: string
  /** Repeaters it sits inside. */
  depth: number
}

function indexFields(nodes: ElementNode[], parent = '', repeater = '', depth = 0, out: IndexedField[] = [], repeaters: IndexedField[] = []): { fields: IndexedField[]; repeaters: IndexedField[] } {
  for (const node of nodes) {
    const core = getCoreElement(node.type)
    if (!core) continue
    const path = node.name ? (parent ? `${parent}.${node.name}` : node.name) : parent
    if (isRepeater(node)) {
      if (!node.name) continue
      repeaters.push({ node, path, repeater, depth })
      indexFields(node.children ?? [], path, path, depth + 1, out, repeaters)
    } else if (core.isContainer) {
      indexFields(node.children ?? [], path, repeater, depth, out, repeaters)
    } else if (core.hasValue && node.name) {
      out.push({ node, path, repeater, depth })
    }
  }
  return { fields: out, repeaters }
}

export interface FormulaInfo {
  tree: FNode | null
  /** First problem with the formula ('' when fine). */
  problem: string
}

/**
 * Every calculated field's parsed formula and its first problem, by node id:
 * syntax, unknown fields, what a field may read (its own item's fields and
 * top-level fields; items of top-level repeaters only through sum/avg/count
 * from a top-level field), placement (not inside inner repeaters) and
 * formulas that depend on each other in a loop.
 */
export function analyzeFormulas(tree: ElementNode[]): Map<string, FormulaInfo> {
  const { fields, repeaters } = indexFields(tree)
  const byPath = new Map(fields.map((f) => [f.path, f]))
  const repeaterByPath = new Map(repeaters.map((r) => [r.path, r]))
  const result = new Map<string, FormulaInfo>()
  const deps = new Map<string, string[]>()
  for (const field of fields.filter((f) => f.node.type === CALCULATED_TYPE)) {
    const source = typeof field.node.props['formula'] === 'string' ? field.node.props['formula'] : ''
    let parsed: FNode
    try {
      parsed = parseFormula(source)
    } catch (error) {
      result.set(field.node.id, { tree: null, problem: (error as Error).message })
      continue
    }
    const problems: string[] = []
    if (field.depth > 1) problems.push('a calculated field can’t sit inside an inner repeater')
    const used: string[] = []
    const visit = (n: FNode): void => {
      if (n.t === 'agg') {
        const rep = repeaterByPath.get(n.repeater)
        if (!rep) problems.push(`{${n.repeater}} is not a repeater`)
        else if (rep.depth !== 0 || field.depth !== 0) problems.push(`${n.fn}() works on top-level repeaters, from a field outside them`)
        else if (n.field !== null) {
          const target = byPath.get(`${n.repeater}.${n.field}`)
          if (!target || target.repeater !== n.repeater) problems.push(`{${n.repeater}.${n.field}} is not a field of its items`)
          else used.push(target.path)
        }
        return
      }
      if (n.t === 'ref') {
        const target = byPath.get(n.path)
        if (!target) problems.push(`{${n.path}} is not a field`)
        else if (target.path === field.path) problems.push('a formula can’t use its own field')
        else if (target.repeater !== '' && target.repeater !== field.repeater) {
          problems.push(`{${n.path}} is inside a repeater: use sum(), avg() or count()`)
        } else used.push(target.path)
        return
      }
      if (n.t === 'neg') visit(n.a)
      else if (n.t === 'bin' || n.t === 'cmp') {
        visit(n.a)
        visit(n.b)
      } else if (n.t === 'call') {
        if (n.fn === 'days') {
          for (const arg of n.args) if (arg.t !== 'ref') problems.push('days() takes date fields, like days({checkin}, {checkout})')
        }
        n.args.forEach(visit)
      }
    }
    visit(parsed)
    deps.set(field.path, used)
    result.set(field.node.id, { tree: problems.length ? null : parsed, problem: problems[0] ?? '' })
  }
  // Loops between calculated fields.
  const calcIds = new Map(fields.filter((f) => f.node.type === CALCULATED_TYPE).map((f) => [f.path, f.node.id]))
  const inLoop = (start: string): boolean => {
    const seen = new Set<string>()
    const stack = [...(deps.get(start) ?? [])]
    while (stack.length) {
      const next = stack.pop()!
      if (next === start) return true
      if (seen.has(next) || !calcIds.has(next)) continue
      seen.add(next)
      stack.push(...(deps.get(next) ?? []))
    }
    return false
  }
  for (const [path, id] of calcIds) {
    const info = result.get(id)
    if (info?.tree && inLoop(path)) result.set(id, { tree: null, problem: 'formulas depend on each other in a loop' })
  }
  return result
}

/** Calculated fields in the order to compute them (a field after those it reads). */
export function calculationOrder(tree: ElementNode[]): ElementNode[] {
  const { fields } = indexFields(tree)
  const calcs = fields.filter((f) => f.node.type === CALCULATED_TYPE)
  const info = analyzeFormulas(tree)
  const done = new Set<string>()
  const order: ElementNode[] = []
  const reads = (f: IndexedField): string[] => {
    const t = info.get(f.node.id)?.tree
    if (!t) return []
    const out: string[] = []
    const walk = (n: FNode): void => {
      if (n.t === 'ref') out.push(n.path)
      else if (n.t === 'agg' && n.field) out.push(`${n.repeater}.${n.field}`)
      else if (n.t === 'neg') walk(n.a)
      else if (n.t === 'bin' || n.t === 'cmp') {
        walk(n.a)
        walk(n.b)
      } else if (n.t === 'call') n.args.forEach(walk)
    }
    walk(t)
    return out
  }
  for (let pass = 0; pass <= calcs.length && order.length < calcs.length; pass++) {
    for (const f of calcs) {
      if (done.has(f.path)) continue
      if (reads(f).every((p) => done.has(p) || !calcs.some((c) => c.path === p))) {
        done.add(f.path)
        order.push(f.node)
      }
    }
  }
  for (const f of calcs) if (!done.has(f.path)) order.push(f.node)
  return order
}
