import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { analyzeFormulas, calculatedValue, formatCalculated, formulaNumber, formulaRound, parseFormula, type FormulaContext } from './formula'
import type { ElementNode, FormSchema } from './schema'

const ctx = (values: Record<string, unknown>, items: Record<string, Record<string, unknown>[]> = {}): FormulaContext => ({
  value: (path) => values[path],
  items: (path) => items[path] ?? [],
})
const calc = (formula: string, values: Record<string, unknown> = {}, items = {}, decimals = 2): number | null =>
  calculatedValue(parseFormula(formula), ctx(values, items), decimals)

describe('formulas', () => {
  it('follows arithmetic precedence, functions and comparisons', () => {
    expect(calc('1 + 2 * 3 - (4 - 1) / 2')).toBe(5.5)
    expect(calc('-{a} + 10 % 4', { a: 3 })).toBe(-1)
    expect(calc('round(2.345, 2) + floor(1.9) + ceil(1.1) + abs(-3)')).toBe(8.35)
    expect(calc('min(3, {a}, 9) * max(1, 2)', { a: 2 })).toBe(4)
    expect(calc('if({nights} >= 7, {total} * 0.9, {total})', { nights: 7, total: 100 })).toBe(90)
    expect(calc('({a} == 2) + ({a} != 2)', { a: 2 })).toBe(1)
  })

  it('turns answers into numbers: empty 0, yes/no 1/0, lists their size, text only when numeric', () => {
    expect([formulaNumber(''), formulaNumber(null), formulaNumber(true), formulaNumber(['a', 'b']), formulaNumber(' 12.5 ')]).toEqual([0, 0, 1, 2, 12.5])
    expect(formulaNumber('0x10')).toBeNaN()
    expect(calc('{price} * 2', { price: 'abc' })).toBeNull()
    expect(calc('1 / 0')).toBeNull()
  })

  it('counts days between dates and over a date range', () => {
    expect(calc('days({in}, {out})', { in: '2026-03-28', out: '2026-04-02' })).toBe(5)
    expect(calc('days({stay})', { stay: { from: '2026-12-30', to: '2027-01-02' } })).toBe(3)
    expect(calc('days({in}, {out})', { in: '', out: '2026-04-02' })).toBeNull()
  })

  it('sums, averages and counts repeater items', () => {
    const lines = [{ price: 10, qty: 2 }, { price: '5.5', qty: 1 }, { price: '', qty: 0 }]
    expect(calc('sum({lines.price})', {}, { lines })).toBe(15.5)
    expect(calc('avg({lines.price})', {}, { lines }, 3)).toBe(5.167)
    expect(calc('count({lines})', {}, { lines })).toBe(3)
    expect(calc('avg({lines.price})', {}, { lines: [] })).toBeNull()
  })

  it('rounds the same way everywhere and shows fixed decimals', () => {
    expect(formulaRound(2.5, 0)).toBe(3)
    expect(formulaRound(-2.5, 0)).toBe(-2)
    expect(formulaRound(0.1 + 0.2, 2)).toBe(0.3)
    expect(formatCalculated(12, 2)).toBe('12.00')
    expect(formatCalculated(null, 2)).toBe('')
  })

  it('reports readable syntax errors', () => {
    expect(() => parseFormula('')).toThrow('the formula is empty')
    expect(() => parseFormula('1 +')).toThrow('the formula ends too early')
    expect(() => parseFormula('foo(1)')).toThrow('unknown function "foo"')
    expect(() => parseFormula('round()')).toThrow('round() takes 1–2 values')
    expect(() => parseFormula('sum({a})')).toThrow('sum() takes a field inside a repeater')
    expect(() => parseFormula('1 $ 2')).toThrow('unexpected "$"')
  })
})

const node = (id: string, type: string, name: string | undefined, props: Record<string, unknown> = {}, children?: ElementNode[]): ElementNode =>
  ({ id, type, ...(name ? { name } : {}), props, ...(children ? { children } : {}) }) as ElementNode

describe('checking formulas against the form', () => {
  it('finds unknown fields, repeater rules, own-field use and loops', () => {
    const tree = [
      node('n', 'number', 'nights'),
      node('lines', 'repeater', 'lines', {}, [node('q', 'number', 'qty'), node('lt', 'calculated', 'line_total', { formula: '{lines.qty} * {rate}' })]),
      node('rate', 'number', 'rate'),
      node('ok', 'calculated', 'total', { formula: 'sum({lines.line_total}) + count({lines})' }),
      node('bad1', 'calculated', 'b1', { formula: '{nope} + 1' }),
      node('bad2', 'calculated', 'b2', { formula: '{lines.qty}' }),
      node('bad3', 'calculated', 'b3', { formula: '{b3} + 1' }),
      node('loopA', 'calculated', 'la', { formula: '{lb} + 1' }),
      node('loopB', 'calculated', 'lb', { formula: '{la} + 1' }),
    ]
    const info = analyzeFormulas(tree)
    expect(info.get('ok')!.problem).toBe('')
    expect(info.get('lt')!.problem).toBe('')
    expect(info.get('bad1')!.problem).toBe('{nope} is not a field')
    expect(info.get('bad2')!.problem).toBe('{lines.qty} is inside a repeater: use sum(), avg() or count()')
    expect(info.get('bad3')!.problem).toBe('a formula can’t use its own field')
    expect(info.get('loopA')!.problem).toBe('formulas depend on each other in a loop')
  })
})

describe('<FormsGenForm> with calculated fields', () => {
  it('computes item totals, a grand total and shows them read-only', async () => {
    const schema = {
      $schema: 'formsgen/v2',
      meta: { name: 'order', locale: 'en', dir: 'ltr' },
      tree: [
        node('lines', 'repeater', 'lines', { minItems: 1, initialItems: 2 }, [
          node('qty', 'number', 'qty', { label: 'Qty' }),
          node('price', 'number', 'price', { label: 'Price' }),
          node('lt', 'calculated', 'line_total', { label: 'Line total', formula: '{lines.qty} * {lines.price}', decimals: 2 }),
        ]),
        node('gift', 'checkbox', 'gift', { label: 'Gift wrap (+5)' }),
        node('total', 'calculated', 'total', { label: 'Total', formula: 'sum({lines.line_total}) + {gift} * 5', prefix: '$' }),
      ],
    } as FormSchema
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    const total = (): string => (wrapper.get('#fg-total').element as HTMLInputElement).value
    expect(total()).toBe('0.00')
    await wrapper.get('#fg-qty-0').setValue('2')
    await wrapper.get('#fg-price-0').setValue('9.99')
    await wrapper.get('#fg-qty-1').setValue('1')
    await wrapper.get('#fg-price-1').setValue('0.5')
    await wrapper.get('#fg-gift').setValue(true)
    expect((wrapper.get('#fg-lt-0').element as HTMLInputElement).value).toBe('19.98')
    expect(total()).toBe('25.48')
    expect(wrapper.get('#fg-total').attributes('readonly')).toBeDefined()
    expect(wrapper.text()).toContain('$')
    await wrapper.get('form').trigger('submit')
    const sent = wrapper.emitted('submit')![0]![0] as { total: number; lines: { line_total: number }[] }
    expect(sent.total).toBe(25.48)
    expect(sent.lines.map((l) => l.line_total)).toEqual([19.98, 0.5])
    wrapper.unmount()
  })
})
