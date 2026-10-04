// Integration-style tests across the three panels, mounted via App.
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App.vue'
import { useBuilderStore } from '../stores/builder'

function mountApp() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(App, { global: { plugins: [pinia] } })
  return { wrapper, store: useBuilderStore() }
}

describe('palette → canvas → properties workflow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds an element from the palette and renders it on the canvas', async () => {
    const { wrapper, store } = mountApp()
    expect(wrapper.find('[data-testid="canvas-empty"]').exists()).toBe(true)
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    expect(store.schema.tree).toHaveLength(1)
    expect(wrapper.find('[data-testid="canvas-empty"]').exists()).toBe(false)
    expect(wrapper.find('.fg-input').exists()).toBe(true)
  })

  it('palette search filters across categories', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('input[type="search"]').setValue('col')
    expect(wrapper.find('[data-testid="palette-item-columns"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="palette-item-text"]').exists()).toBe(false)
  })

  it('selecting a node shows its registry-driven properties', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const node = store.schema.tree[0]!
    expect(wrapper.find('[data-testid="properties-empty"]').exists()).toBe(false)
    // editing the label through the panel updates the schema and canvas
    await wrapper.get('[data-testid="control-label"]').setValue('Your email')
    expect(node.props['label']).toBe('Your email')
    expect(wrapper.get('.fg-label').text()).toContain('Your email')
  })

  it('rejects an invalid name in the panel and shows the message', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    await wrapper.get('[data-testid="control-name"]').setValue('9lives')
    expect(wrapper.find('[data-testid="control-name-error"]').exists()).toBe(true)
    expect(store.schema.tree[0]?.name).toBe('text')
  })

  it('adds validation rules through the rule builder', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    await wrapper.get('[data-testid="rule-add-select"]').setValue('required')
    await wrapper.get('[data-testid="rule-add-button"]').trigger('click')
    expect(store.schema.tree[0]?.validation).toEqual([{ rule: 'required' }])
    expect(wrapper.find('[data-testid="rule-required"]').exists()).toBe(true)
  })

  it('deletes a node from the canvas chrome', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const id = store.schema.tree[0]!.id
    await wrapper.get(`[data-testid="canvas-delete-${id}"]`).trigger('click')
    expect(store.schema.tree).toHaveLength(0)
    expect(wrapper.find('[data-testid="properties-empty"]').exists()).toBe(true)
  })

  it('adds into a selected container and renders nested chrome', async () => {
    const { wrapper, store } = mountApp()
    const structureTab = wrapper
      .findAll('[role="tab"]')
      .find((b) => b.text() === 'Structure')!
    await structureTab.trigger('click')
    await wrapper.get('[data-testid="palette-item-group"]').trigger('click')
    const fieldsTab = wrapper.findAll('[role="tab"]').find((b) => b.text() === 'Fields')!
    await fieldsTab.trigger('click')
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const group = store.schema.tree[0]!
    expect(group.children).toHaveLength(1)
    const childId = group.children![0]!.id
    expect(wrapper.find(`[data-testid="canvas-node-${childId}"]`).exists()).toBe(true)
  })
})
