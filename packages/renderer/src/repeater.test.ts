import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import { repeaterLimits, resolveScoped } from './repeater'
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

  it('the parser requires a name and rejects containers and tags inside', () => {
    const result = parseFormSchema(
      schema([
        { id: 'a', type: 'repeater', props: {}, children: [] },
        {
          id: 'b',
          type: 'repeater',
          name: 'b',
          props: {},
          children: [
            { id: 'c', type: 'group', props: {} },
            { id: 'd', type: 'tags', name: 'd', props: {} },
            { id: 'e', type: 'text', name: 'e', props: {} },
          ],
        },
      ]),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      'tree[0].name: a repeater needs a name (its items are stored under it)',
      'tree[1].children[0].type: "group" cannot be placed inside a repeater',
      'tree[1].children[1].type: "tags" cannot be placed inside a repeater',
    ])
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
})
