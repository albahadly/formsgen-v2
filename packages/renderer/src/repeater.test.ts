import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import { repeaterItemDefaults, repeaterLimits, resolveScoped, templatePath } from './repeater'
import { buildDefaultData } from './tree'
import type { ElementNode, FormSchema } from './schema'

const people: ElementNode = {
  id: 'p',
  type: 'repeater',
  name: 'people',
  props: { label: 'People', itemLabel: 'Person {n}', addText: 'Add person', minItems: 1, maxItems: 3 },
  children: [
    { id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }] },
    { id: 'h', type: 'checkbox', name: 'has_passport', props: { label: 'Has a passport' } },
    {
      id: 'pp',
      type: 'text',
      name: 'passport',
      props: { label: 'Passport number' },
      validation: [{ rule: 'required' }],
      conditions: [[{ field: 'people.has_passport', operator: 'equals', value: true }]],
    },
  ],
}

function schema(tree: ElementNode[]): FormSchema {
  return { $schema: 'formsgen/v2', meta: { name: 'demo', locale: 'en', dir: 'ltr' }, tree } as FormSchema
}
const mountForm = (tree: ElementNode[] = [people]) =>
  mount(FormsGenForm, { props: { schema: schema(tree) }, attachTo: document.body })

describe('repeater helpers', () => {
  it('limits default to min 1, no max, initial clamped into range', () => {
    expect(repeaterLimits({ id: 'r', type: 'repeater', props: {} })).toEqual({ min: 1, max: Infinity, initial: 1 })
    expect(repeaterLimits({ id: 'r', type: 'repeater', props: { minItems: 2, maxItems: 1, initialItems: 0 } })).toEqual({ min: 2, max: 2, initial: 2 })
    expect(repeaterLimits({ id: 'r', type: 'repeater', props: { minItems: 0, initialItems: 3 } })).toEqual({ min: 0, max: Infinity, initial: 3 })
  })

  it('template paths resolve to the item; other paths stay root paths', () => {
    const scope = { template: 'people', actual: 'people.2', index: 2 }
    expect(resolveScoped('people.name', scope)).toBe('people.2.name')
    expect(resolveScoped('peoples.name', scope)).toBe('peoples.name')
    expect(resolveScoped('email', scope)).toBe('email')
  })

  it('defaults build initialItems item objects', () => {
    const data = buildDefaultData([{ ...people, props: { ...people.props, initialItems: 2 } }])
    expect(data).toEqual({
      people: [
        { name: '', has_passport: false, passport: '' },
        { name: '', has_passport: false, passport: '' },
      ],
    })
  })

  it('the parser: repeaters need a name; items take layout and one inner repeater, never tabs/steps', () => {
    const result = parseFormSchema(
      schema([
        { id: 'a', type: 'repeater', props: {}, children: [] },
        {
          id: 'b',
          type: 'repeater',
          name: 'b',
          props: {},
          children: [
            { id: 'c', type: 'group', props: {}, children: [{ id: 'c1', type: 'tags', name: 'c1', props: {} }] },
            { id: 'd', type: 'group', name: 'named', props: {} },
            { id: 'e', type: 'columns', props: {}, children: [{ id: 'e1', type: 'tabs', props: {} }] },
            {
              id: 'f',
              type: 'repeater',
              name: 'inner',
              props: {},
              children: [{ id: 'g', type: 'repeater', name: 'deeper', props: {} }],
            },
          ],
        },
      ]),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      'tree[0].name: a repeater needs a name (its items are stored under it)',
      "tree[1].children[1].name: a group inside a repeater item can't have a name (item data stays flat)",
      'tree[1].children[2].children[0].type: "tabs" cannot be placed inside a repeater',
      'tree[1].children[3].children[0].type: repeaters nest at most two levels deep',
    ])
  })

  it('item defaults look through layout containers and hold inner repeaters', () => {
    const node: ElementNode = {
      id: 't',
      type: 'repeater',
      name: 'trips',
      props: {},
      children: [
        { id: 'g', type: 'group', props: {}, children: [{ id: 'n', type: 'text', name: 'name', props: {} }] },
        {
          id: 'b',
          type: 'repeater',
          name: 'bags',
          props: { initialItems: 2 },
          children: [{ id: 'w', type: 'number', name: 'weight', props: {} }],
        },
      ],
    }
    expect(repeaterItemDefaults(node)).toEqual({ name: '', bags: [{ weight: null }, { weight: null }] })
    expect(templatePath('trips.0.bags.3')).toBe('trips.bags')
  })
})

describe('<FormsGenForm> with a repeater', () => {
  it('adds and removes items within the limits, focusing and announcing', async () => {
    const wrapper = mountForm()
    expect(wrapper.findAll('[data-fg-item]')).toHaveLength(1)
    expect(wrapper.find('.fg-repeater-remove').exists()).toBe(false) // at minItems
    const add = wrapper.get('.fg-repeater-add')
    expect(add.text()).toBe('Add person')
    await add.trigger('click')
    await flushPromises()
    const items = wrapper.findAll('[data-fg-item]')
    expect(items).toHaveLength(2)
    expect(items[1]!.get('legend').text()).toBe('Person 2')
    expect(document.activeElement).toBe(items[1]!.get('input').element)
    expect(wrapper.get('[role=status]').text()).toBe('Person 2 added')
    await wrapper.get('.fg-repeater-add').trigger('click')
    await flushPromises()
    expect(wrapper.find('.fg-repeater-add').exists()).toBe(false) // at maxItems
    const remove = wrapper.findAll('.fg-repeater-remove')
    expect(remove).toHaveLength(3)
    expect(remove[1]!.attributes('aria-label')).toBe('Remove Person 2')
    // ids are unique per item
    const ids = wrapper.findAll('input[type=text]').map((i) => i.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
    wrapper.unmount()
  })

  it('item-scoped conditions, per-item validation, array payload', async () => {
    const wrapper = mountForm()
    await wrapper.get('.fg-repeater-add').trigger('click')
    await flushPromises()
    let items = wrapper.findAll('[data-fg-item]')
    // only the second person has a passport: only their passport field shows
    await items[1]!.get('input[type=checkbox]').setValue(true)
    items = wrapper.findAll('[data-fg-item]')
    expect(items[0]!.text()).not.toContain('Passport number')
    expect(items[1]!.text()).toContain('Passport number')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    // both names + the second passport are required
    expect(wrapper.findAll('.fg-error').map((e) => e.text())).toEqual([
      'This field is required',
      'This field is required',
      'This field is required',
    ])
    const inputs = () => wrapper.findAll('[data-fg-item]').map((item) => item.findAll('input[type=text]'))
    await inputs()[0]![0]!.setValue('Ann')
    await inputs()[1]![0]!.setValue('Bob')
    await inputs()[1]![1]!.setValue('X123')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        people: [
          { name: 'Ann', has_passport: false },
          { name: 'Bob', has_passport: true, passport: 'X123' },
        ],
      },
    ])
    wrapper.unmount()
  })

  it('removing an item moves later items’ errors with them', async () => {
    const wrapper = mountForm([{ ...people, props: { ...people.props, minItems: 0, initialItems: 3 } }])
    const names = () => wrapper.findAll('[data-fg-item]').map((item) => item.find('input[type=text]'))
    await names()[0]!.setValue('Ann')
    await names()[2]!.trigger('blur') // third person: touched, empty → error
    expect(wrapper.findAll('[data-fg-item]')[2]!.text()).toContain('This field is required')
    await wrapper.findAll('.fg-repeater-remove')[1]!.trigger('click')
    await flushPromises()
    const items = wrapper.findAll('[data-fg-item]')
    expect(items).toHaveLength(2)
    expect((items[0]!.get('input[type=text]').element as HTMLInputElement).value).toBe('Ann')
    expect(items[1]!.text()).toContain('This field is required') // followed the item
    expect(items[0]!.text()).not.toContain('This field is required')
    expect(document.activeElement).toBe(items[1]!.element)
    expect(wrapper.get('[role=status]').text()).toBe('Person 2 removed')
    wrapper.unmount()
  })

  it('sortable items move up and down; values, errors and focus follow', async () => {
    const wrapper = mountForm([{ ...people, props: { ...people.props, sortable: true, minItems: 0, initialItems: 3 } }])
    const names = () => wrapper.findAll('[data-fg-item]').map((item) => item.find('input[type=text]'))
    const moves = (k: number) => wrapper.findAll('[data-fg-item]')[k]!.findAll('[data-fg-move]').map((b) => b.attributes('aria-label'))
    // the first item can't move up, the last can't move down
    expect(moves(0)).toEqual(['Move Person 1 down'])
    expect(moves(1)).toEqual(['Move Person 2 up', 'Move Person 2 down'])
    expect(moves(2)).toEqual(['Move Person 3 up'])
    await names()[0]!.setValue('Ann')
    await names()[1]!.setValue('Bob')
    await names()[2]!.trigger('blur') // third person: touched, empty → error
    await wrapper.findAll('[data-fg-item]')[1]!.get('[data-fg-move="down"]').trigger('click')
    await flushPromises()
    const values = () => names().map((input) => (input.element as HTMLInputElement).value)
    expect(values()).toEqual(['Ann', '', 'Bob'])
    const items = wrapper.findAll('[data-fg-item]')
    expect(items[1]!.text()).toContain('This field is required') // the error moved up with its item
    expect(items[2]!.text()).not.toContain('This field is required')
    // Bob is now last: focus moves to his remaining (up) button
    expect(document.activeElement).toBe(items[2]!.get('[data-fg-move="up"]').element)
    expect(wrapper.get('[role=status]').text()).toBe('Person 2 moved to position 3')
    await items[2]!.get('[data-fg-move="up"]').trigger('click')
    await flushPromises()
    expect(values()).toEqual(['Ann', 'Bob', ''])
    expect(document.activeElement).toBe(wrapper.findAll('[data-fg-item]')[1]!.get('[data-fg-move="up"]').element)
    wrapper.unmount()
  })

  it('items have no move buttons unless the repeater is sortable', () => {
    const wrapper = mountForm([{ ...people, props: { ...people.props, initialItems: 2 } }])
    expect(wrapper.find('[data-fg-move]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('moving items keeps every item’s radio answers (group names follow the item)', async () => {
    const rate: ElementNode = {
      id: 'r',
      type: 'radiogroup',
      name: 'rate',
      props: { label: 'Rate', items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    }
    const wrapper = mountForm([{ ...people, props: { ...people.props, sortable: true, initialItems: 2 }, children: [rate] }])
    const radios = () => wrapper.findAll('input[type=radio]').map((r) => (r.element as HTMLInputElement).checked)
    const inputs = wrapper.findAll('input[type=radio]')
    await inputs[0]!.setValue(true) // item 1: A
    await inputs[3]!.setValue(true) // item 2: B
    expect(radios()).toEqual([true, false, false, true])
    await wrapper.findAll('[data-fg-item]')[0]!.get('[data-fg-move="down"]').trigger('click')
    await flushPromises()
    expect(radios()).toEqual([false, true, true, false])
    expect(wrapper.findAll('[data-fg-item]').map((item) => item.get('input[type=radio]').attributes('name'))).not.toContain(undefined)
    wrapper.unmount()
  })

  it('nested repeaters: per-item scopes, unique ids, item-scoped conditions and nested payload', async () => {
    const travellers: ElementNode = {
      id: 't',
      type: 'repeater',
      name: 'travellers',
      props: { label: 'Travellers', itemLabel: 'Traveller {n}', initialItems: 2 },
      children: [
        { id: 'tn', type: 'text', name: 'name', props: { label: 'Name' } },
        { id: 'hb', type: 'checkbox', name: 'has_bags', props: { label: 'Has bags' } },
        {
          id: 'bags',
          type: 'repeater',
          name: 'bags',
          props: { label: 'Bags', itemLabel: 'Bag {n}', minItems: 0, initialItems: 1 },
          conditions: [[{ field: 'travellers.has_bags', operator: 'equals', value: true }]],
          children: [
            {
              id: 'cols',
              type: 'columns',
              props: { count: 2 },
              children: [
                { id: 'w', type: 'number', name: 'weight', props: { label: 'Weight' }, validation: [{ rule: 'required' }] },
                { id: 'f', type: 'checkbox', name: 'fragile', props: { label: 'Fragile' } },
              ],
            },
            {
              id: 'note',
              type: 'text',
              name: 'note',
              props: { label: 'Handling note' },
              conditions: [[{ field: 'travellers.bags.fragile', operator: 'equals', value: true }]],
            },
          ],
        },
      ],
    }
    const wrapper = mountForm([travellers])
    const outer = () => wrapper.findAll('[data-fg-item]').filter((el) => el.element.parentElement?.closest('[data-fg-item]') === null)
    // bags show only for the traveller who has them
    await outer()[1]!.get('input[type=checkbox]').setValue(true)
    expect(outer()[0]!.text()).not.toContain('Bag 1')
    expect(outer()[1]!.text()).toContain('Bag 1')
    const ids = wrapper.findAll('input').map((i) => i.attributes('id')).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('fg-w-1-0')
    // an inner condition reads the inner item's sibling
    await outer()[1]!.get('.fg-repeater-add').trigger('click')
    await flushPromises()
    const fragile = () => outer()[1]!.findAll('input[type=checkbox]').slice(1)
    await fragile()[1]!.setValue(true)
    expect(outer()[1]!.findAll('[data-fg-item]')[0]!.text()).not.toContain('Handling note')
    expect(outer()[1]!.findAll('[data-fg-item]')[1]!.text()).toContain('Handling note')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined() // both bags need a weight
    const weights = outer()[1]!.findAll('input[type=number]')
    await weights[0]!.setValue('12')
    await weights[1]!.setValue('3')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        travellers: [
          { name: '', has_bags: false },
          {
            name: '',
            has_bags: true,
            bags: [
              { weight: 12, fragile: false },
              { weight: 3, fragile: true, note: '' },
            ],
          },
        ],
      },
    ])
    wrapper.unmount()
  })
})
