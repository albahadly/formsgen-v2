import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { addDate, dateOrderProblem, rangeBounds, rangePercent, rangeSliderDefault } from './composite'
import { MESSAGES } from './messages'
import { isEmptyValue } from './rules'
import type { ElementNode, FormSchema } from './schema'

const node = (type: string, props: Record<string, unknown> = {}, extra: Partial<ElementNode> = {}): ElementNode => ({
  id: type,
  type,
  name: type,
  props: { label: type, ...props },
  ...extra,
})

describe('composite value helpers', () => {
  it('range slider defaults are clamped and ordered', () => {
    expect(rangeSliderDefault(node('rangeslider', { min: 0, max: 100 }))).toEqual({ from: 0, to: 100 })
    expect(rangeSliderDefault(node('rangeslider', { min: 10, max: 50, defaultFrom: 40, defaultTo: 5 }))).toEqual({ from: 10, to: 40 })
    expect(rangePercent(25, rangeBounds(node('rangeslider', { min: 0, max: 50 })))).toBe(50)
  })

  it('date ranges must not end before they start', () => {
    expect(dateOrderProblem({ from: '2026-10-05', to: '2026-10-01' }, MESSAGES.en)).toBe(MESSAGES.en.dateOrder)
    expect(dateOrderProblem({ from: '2026-10-05', to: '2026-10-05' }, MESSAGES.en)).toBeNull()
    expect(dateOrderProblem({ from: '', to: '2026-10-01' }, MESSAGES.en)).toBeNull()
  })

  it('multiple dates stay unique and in calendar order', () => {
    expect(addDate(['2026-10-05'], '2026-10-01')).toEqual(['2026-10-01', '2026-10-05'])
    expect(addDate(['2026-10-05'], '2026-10-05')).toEqual(['2026-10-05'])
    expect(addDate(['2026-10-05'], '')).toEqual(['2026-10-05'])
  })

  it('a composite value is empty while any part is', () => {
    expect(isEmptyValue({ from: '2026-10-01', to: '' })).toBe(true)
    expect(isEmptyValue({ from: '2026-10-01', to: '2026-10-02' })).toBe(false)
    expect(isEmptyValue({ from: 0, to: 0 })).toBe(false)
  })
})

describe('<FormsGenForm> with composite fields', () => {
  const tree = [
    node('rangeslider', { min: 0, max: 100, step: 5, defaultFrom: 20, defaultTo: 80 }),
    node('daterange', {}, { validation: [{ rule: 'required' }] }),
    node('dates', {}, { validation: [{ rule: 'required' }, { rule: 'max', value: 2 }] }),
  ]
  const schema = { $schema: 'formsgen/v2', meta: { name: 'c', locale: 'en', dir: 'ltr' }, tree } as FormSchema

  it('edits, validates and submits { from, to } values and a date list', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    const [from, to] = wrapper.findAll('.fg-dual input')
    expect(from!.attributes('aria-label')).toBe('rangeslider: Minimum')
    await to!.setValue('10') // can't pass the other handle
    expect((to!.element as HTMLInputElement).value).toBe('20')
    await from!.setValue('60') // blocked at the upper handle too
    expect((from!.element as HTMLInputElement).value).toBe('20')
    await to!.setValue('80')
    await from!.setValue('40')

    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('This field is required')

    const [start, end] = wrapper.findAll('input[type=date]')
    await start!.setValue('2026-10-05')
    await end!.setValue('2026-10-01')
    await end!.trigger('blur')
    expect(wrapper.text()).toContain(MESSAGES.en.dateOrder)
    expect(end!.attributes('min')).toBe('2026-10-05')
    await end!.setValue('2026-10-07')

    const draft = wrapper.findAll('input[type=date]')[2]!
    for (const d of ['2026-12-24', '2026-12-01', '2026-12-31']) {
      await draft.setValue(d)
      await wrapper.get('.fg-pair button').trigger('click')
    }
    expect(wrapper.findAll('.fg-chips .fg-tag').map((t) => t.text().replace('×', '').trim())).toEqual([
      '2026-12-01',
      '2026-12-24',
      '2026-12-31',
    ])
    expect(wrapper.text()).toContain('Must be at most 2')
    await wrapper.findAll('.fg-chips .fg-tag-remove')[2]!.trigger('click')
    expect(wrapper.get('.fg-tag-remove').attributes('aria-label')).toBe('Remove 2026-12-01')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      rangeslider: { from: 40, to: 80 },
      daterange: { from: '2026-10-05', to: '2026-10-07' },
      dates: ['2026-12-01', '2026-12-24'],
    })
    wrapper.unmount()
  })
})
