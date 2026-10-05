import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import type { ElementNode, FormSchema } from './schema'

const schema = (tree: ElementNode[], meta: Partial<FormSchema['meta']> = {}): FormSchema =>
  ({ $schema: 'formsgen/v2', meta: { name: 'x', locale: 'en', dir: 'ltr', ...meta }, tree }) as FormSchema

describe('help tooltips, add-ons and the form-wide field size', () => {
  const price: ElementNode = {
    id: 'price',
    type: 'number',
    name: 'price',
    props: { label: 'Price', prefix: '$', suffix: 'USD', tooltip: 'Before tax' },
  }
  const plan: ElementNode = {
    id: 'plan',
    type: 'radiogroup',
    name: 'plan',
    props: { label: 'Plan', tooltip: 'You can change it later', items: [{ value: 'a', label: 'A' }] },
  }

  it('keeps the tooltip out of the field name and describes the add-ons', () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema([price, plan]) } })
    const label = wrapper.get('label[for="fg-price"]')
    expect(label.text()).toBe('Price')
    const tip = wrapper.get('.fg-label-row .fg-tip-button')
    expect(tip.attributes('aria-label')).toBe('More information')
    expect(wrapper.get(`#${tip.attributes('aria-describedby')}`).text()).toBe('Before tax')
    expect(wrapper.get('#fg-price').attributes('aria-describedby')).toBe('fg-price-prefix fg-price-suffix')
    expect(wrapper.findAll('.fg-affix-group .fg-affix').map((a) => a.text())).toEqual(['$', 'USD'])
    // a group is named by its legend text only
    const fieldset = wrapper.get('fieldset.fg-field')
    expect(wrapper.get(`#${fieldset.attributes('aria-labelledby')}`).text()).toBe('Plan')
    expect(fieldset.get('legend .fg-tip-text').text()).toBe('You can change it later')
  })

  it('renders plainly without them', () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema([{ ...price, props: { label: 'Price' } }]) } })
    expect(wrapper.find('.fg-affix-group').exists()).toBe(false)
    expect(wrapper.find('.fg-label-row').exists()).toBe(false)
    expect(wrapper.get('#fg-price').attributes('aria-describedby')).toBeUndefined()
  })

  it('applies meta.fieldSize unless a field sets its own size', () => {
    const tree: ElementNode[] = [
      { id: 'a', type: 'text', name: 'a', props: { label: 'A' } },
      { id: 'b', type: 'text', name: 'b', props: { label: 'B' }, style: { size: 'md' } },
      { id: 'c', type: 'text', name: 'c', props: { label: 'C' }, style: { size: 'sm' } },
    ]
    const wrapper = mount(FormsGenForm, { props: { schema: schema(tree, { fieldSize: 'lg' }) } })
    expect(wrapper.get('#fg-a').classes()).toContain('fg-control--lg')
    expect(wrapper.get('#fg-b').classes()).not.toContain('fg-control--lg')
    expect(wrapper.get('#fg-c').classes()).toContain('fg-control--sm')
  })

  it('validates meta.fieldSize', () => {
    const bad = parseFormSchema({ ...schema([]), meta: { name: 'x', locale: 'en', dir: 'ltr', fieldSize: 'xl' } })
    expect(bad.ok ? [] : bad.errors).toEqual(['meta.fieldSize: expected one of sm, md, lg'])
  })
})
