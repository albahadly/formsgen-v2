import { FormsGenForm, findNodeById, type ElementNode } from '@formsgen/renderer'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createEmptySchema, useBuilderStore } from '@/stores/builder'
import ControlConditions from './ControlConditions.vue'

function tree(): ElementNode[] {
  return [
    {
      id: 'plan',
      type: 'select',
      name: 'plan',
      props: { label: 'Plan', items: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
    },
    { id: 'terms', type: 'checkbox', name: 'terms', props: { label: 'Terms' } },
    { id: 'seats', type: 'number', name: 'seats', props: { label: 'Seats' } },
    { id: 'target', type: 'text', name: 'company', props: { label: 'Company' } },
  ]
}

describe('ControlConditions (visual condition builder)', () => {
  let store: ReturnType<typeof useBuilderStore>
  let wrapper: VueWrapper

  const node = (): ElementNode => findNodeById(store.schema.tree, 'target')!
  const conditions = () => node().conditions
  const select = (testId: string) => wrapper.get(`[data-testid="${testId}"]`)

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBuilderStore()
    store.loadSchema({ ...createEmptySchema(), tree: tree() })
    wrapper = mount(ControlConditions, { props: { node: node() } })
  })

  async function rerender(): Promise<void> {
    await wrapper.setProps({ node: node() })
    await nextTick()
  }

  it('starts "always visible" and adds a first condition on the first field', async () => {
    expect(wrapper.text()).toContain('Always visible')
    await select('condition-add').trigger('click')
    await rerender()
    expect(conditions()).toEqual([[{ field: 'plan', operator: 'equals', value: 'free' }]])
    // target itself is never offered as a source
    const fieldOptions = select('condition-0-0-field').findAll('option').map((o) => o.text())
    expect(fieldOptions).toEqual(['Plan', 'Terms', 'Seats'])
  })

  it('picks a value from the select options and keeps it when switching is → is not', async () => {
    await select('condition-add').trigger('click')
    await rerender()
    await select('condition-0-0-value').setValue('pro')
    await rerender()
    await select('condition-0-0-operator').setValue('not-equals')
    await rerender()
    expect(conditions()).toEqual([[{ field: 'plan', operator: 'not-equals', value: 'pro' }]])
    await select('condition-0-0-operator').setValue('empty')
    await rerender()
    expect(conditions()).toEqual([[{ field: 'plan', operator: 'empty' }]])
    expect(wrapper.find('[data-testid="condition-0-0-value"]').exists()).toBe(false)
  })

  it('stores a boolean for a checkbox and a number for a number field', async () => {
    await select('condition-add').trigger('click')
    await rerender()
    await select('condition-0-0-field').setValue('terms')
    await rerender()
    expect(select('condition-0-0-operator').findAll('option').map((o) => o.element.value)).toEqual(['equals'])
    await select('condition-0-0-value').setValue('false')
    await rerender()
    expect(conditions()![0]![0]).toEqual({ field: 'terms', operator: 'equals', value: false })

    await select('condition-0-0-field').setValue('seats')
    await rerender()
    await select('condition-0-0-operator').setValue('greater-than')
    await rerender()
    await select('condition-0-0-value').setValue('5')
    await rerender()
    expect(conditions()![0]![0]).toEqual({ field: 'seats', operator: 'greater-than', value: 5 })
  })

  it('builds AND rows and OR groups, and removing the last row clears conditions', async () => {
    await select('condition-add').trigger('click')
    await rerender()
    await select('condition-add-and-0').trigger('click')
    await rerender()
    await select('condition-add-or').trigger('click')
    await rerender()
    expect(conditions()!.map((g) => g.length)).toEqual([2, 1])
    expect(wrapper.text()).toContain('and')
    expect(wrapper.text()).toContain('or')
    await select('condition-1-0-remove').trigger('click')
    await rerender()
    await select('condition-0-1-remove').trigger('click')
    await rerender()
    await select('condition-0-0-remove').trigger('click')
    await rerender()
    expect('conditions' in node()).toBe(false)
    expect(wrapper.text()).toContain('Always visible')
  })

  it('flags a reference to a field that no longer exists', async () => {
    store.setConditions('target', [[{ field: 'deleted_field', operator: 'not-empty' }]])
    await rerender()
    expect(select('condition-missing').text()).toContain('deleted_field')
  })

  it('authored conditions drive visibility in the real renderer', async () => {
    // "show company when plan is pro AND seats > 5, OR terms is checked"
    store.setConditions('target', [
      [
        { field: 'plan', operator: 'equals', value: 'pro' },
        { field: 'seats', operator: 'greater-than', value: 5 },
      ],
      [{ field: 'terms', operator: 'equals', value: true }],
    ])
    const form = mount(FormsGenForm, { props: { schema: JSON.parse(JSON.stringify(store.schema)) } })
    const visible = () => form.find('input[name="company"]').exists()
    expect(visible()).toBe(false)
    await form.get('select[name="plan"]').setValue('pro')
    expect(visible()).toBe(false)
    await form.get('input[name="seats"]').setValue('6')
    expect(visible()).toBe(true)
    await form.get('select[name="plan"]').setValue('free')
    expect(visible()).toBe(false)
    await form.get('input[name="terms"]').setValue(true)
    expect(visible()).toBe(true)
  })
})
