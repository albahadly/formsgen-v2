import { calculatedValue, parseFormSchema, parseFormula, type FormSchema } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { calcHelpers, calcSteps, formulaCs, formulaJs, formulaSuggestions } from './calc'
import { getCssAdapter } from './css'
import { getTarget } from './targets'

const FORMULAS = [
  '1 + 2 * 3 - (4 - 1) / 2',
  '-{a} + 10 % 4',
  'round({a} / 3, 2) + floor({b}) + ceil(1.1) + abs(-{a})',
  'min(3, {a}, 9) * max(1, {b})',
  'if({a} >= 7, {b} * 0.9, {b})',
  '({a} == 2) + ({b} != 2)',
  'days({in}, {out})',
  'days({stay})',
  'sum({lines.price}) + count({lines}) + avg({lines.price})',
  '{flag} * 15 + {list} * 5 + {text}',
  '1 / {zero}',
]
const VALUES: Record<string, unknown>[] = [
  { a: 2, b: 3.5, in: '2026-03-28', out: '2026-04-02', stay: { from: '2026-12-30', to: '2027-01-02' }, flag: true, list: ['x', 'y'], text: ' 12.5 ', zero: 0 },
  { a: 7, b: '10', in: '', out: '2026-04-02', stay: { from: '', to: '' }, flag: false, list: [], text: 'abc', zero: null },
  { a: -2.5, b: null, in: '2026-02-30', out: '2026-03-01', stay: null, flag: null, list: ['x'], text: '', zero: '' },
]
const LINES = [[{ price: 10 }, { price: '5.5' }, { price: '' }], []]

describe('compiled formulas', () => {
  it('JavaScript gives exactly what the renderer gives', () => {
    const helpers = calcHelpers(false)
    for (const source of FORMULAS) {
      const tree = parseFormula(source)
      const expr = formulaJs(tree, {
        read: (path) => `v[${JSON.stringify(path)}]`,
        items: () => 'lines',
        itemField: (_r, field) => `it[${JSON.stringify(field)}]`,
      })
      const run = new Function('v', 'lines', `${helpers}\nreturn fgCalcValue(${expr}, 3)`) as (v: unknown, lines: unknown) => number | null
      for (const values of VALUES) {
        for (const lines of LINES) {
          const expected = calculatedValue(tree, { value: (p) => values[p], items: () => lines as Record<string, unknown>[] }, 3)
          expect(run(values, lines), `${source} ${JSON.stringify(values)}`).toBe(expected)
        }
      }
    }
  })

  it('C# uses the mirrored helpers', () => {
    const access = { read: (p: string) => `Model.${p}`, items: () => 'Model.Lines', itemField: (_r: string, f: string) => `it.${f}` }
    expect(formulaCs(parseFormula('if({a} >= 7, {b} * 0.9, {b})'), access)).toBe('(((FgNum(Model.a) >= 7d) ? 1d : 0d) != 0 ? (FgNum(Model.b) * 0.9d) : FgNum(Model.b))'.replace('(((FgNum(Model.a) >= 7d) ? 1d : 0d)', '((FgNum(Model.a) >= 7d ? 1d : 0d)'))
    expect(formulaCs(parseFormula('sum({lines.price}) / count({lines})'), access)).toBe('(Model.Lines.Sum(it => FgNum(it.price)) / (double)Model.Lines.Count)')
    expect(formulaCs(parseFormula('min({a}, 2, 3)'), access)).toBe('Math.Min(Math.Min(FgNum(Model.a), 2d), 3d)')
    expect(formulaCs(parseFormula('days({in}, {out})'), access)).toBe('(FgDay(Model.out) - FgDay(Model.in))')
  })
})

function schema(tree: unknown[]): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'c', locale: 'en', dir: 'ltr' }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const s = schema([
  { id: 'n', type: 'number', name: 'nights', props: { label: 'Nights' } },
  {
    id: 'lines',
    type: 'repeater',
    name: 'lines',
    props: { label: 'Lines' },
    children: [
      { id: 'p', type: 'number', name: 'price', props: { label: 'Price' } },
      { id: 'lt', type: 'calculated', name: 'line_total', props: { label: 'Line total', formula: '{lines.price} * {nights}' } },
    ],
  },
  { id: 't', type: 'calculated', name: 'total', props: { label: 'Total', formula: 'sum({lines.line_total})', decimals: 2, prefix: '$' } },
  { id: 'bad', type: 'calculated', name: 'bad', props: { label: 'Bad', formula: '{nope} +' } },
])
const out = (target: string): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter('vanilla') })
    .map((f) => f.content)
    .join('\n')

describe('calculated fields in every code target', () => {
  it('orders steps (item totals before the sum) and leaves broken formulas empty', () => {
    expect(calcSteps(s).map((st) => [st.path, st.repeater, Boolean(st.tree)])).toEqual([
      ['lines.line_total', 'lines', true],
      ['total', '', true],
      ['bad', '', false],
    ])
  })

  it('shows a read-only box and recomputes on every change', () => {
    const vue = out('vue-standalone')
    expect(vue).toContain(`:value="fgFmt(form.total, 2)"`)
    expect(vue).toContain('watch(form, fgCalc, { deep: true, flush: \'sync\' })')
    expect(vue).toContain('const v = fgCalcValue((fgNum(item.price) * fgNum(form.nights)), 2)')
    const react = out('react')
    expect(react).toContain('useState<FormData>(() => fgCalc(INITIAL))')
    expect(react).toContain('const typed = fgCalc(next as unknown as FormData)')
    expect(react).toContain("for (const p of fgCalcPaths(typed)) if (p !== path && touched.current.has(p)) validateField(p, typed)")
    const html = out('html')
    expect(html).toContain('data-fg-kind="calculated" data-fg-value=""')
    expect(html).toContain('function updateConditions() {\n      fgCalcAll()')
    expect(html).toContain("fgSetCalc('total', 2, fgItemIndexes('lines').reduce((s, it) => s + fgNum(fgGet('lines.' + it + '.line_total')), 0))")
    const razor = out('blazor')
    expect(razor).toContain('public double? Total { get; set; }')
    expect(razor).toContain('foreach (var item in Model.Lines) item.LineTotal = FgCalcValue((FgNum(item.Price) * FgNum(Model.Nights)), 2);')
    expect(razor).toContain('Model.Bad = null;')
    expect(razor).toContain('protected override bool ShouldRender()')
    expect(razor).toContain('value="@FgFmt(Model.Total, 2)"')
  })

  it('suggests the fields a formula may use', () => {
    expect(formulaSuggestions(s.tree, 't').map((x) => x.snippet)).toEqual(['{nights}', '{bad}', 'count({lines})', 'sum({lines.price})', 'sum({lines.line_total})'])
    expect(formulaSuggestions(s.tree, 'lt').map((x) => x.snippet)).toEqual(['{nights}', '{lines.price}', '{total}', '{bad}'])
  })
})
