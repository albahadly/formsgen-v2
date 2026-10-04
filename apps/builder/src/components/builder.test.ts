// Integration-style tests across the three panels, mounted via App.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App.vue'
import { useBuilderStore } from '../stores/builder'

const mounted: VueWrapper[] = []

function mountApp() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(App, { global: { plugins: [pinia] } })
  mounted.push(wrapper)
  return { wrapper, store: useBuilderStore() }
}

describe('palette → canvas → properties workflow', () => {
  beforeEach(() => {
    // Autosave writes drafts that App restores on mount — isolate tests.
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    // Unmount so stray debounced autosave watchers stop writing drafts.
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
    localStorage.clear()
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

  it('duplicates a node from the canvas chrome', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const id = store.schema.tree[0]!.id
    await wrapper.get(`[data-testid="canvas-duplicate-${id}"]`).trigger('click')
    expect(store.schema.tree).toHaveLength(2)
    expect(store.schema.tree[1]?.name).toBe('text_2')
  })

  it('keyboard: Delete removes and Escape deselects on the canvas', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const canvas = wrapper.get('[data-testid="panel-canvas"]')
    await canvas.trigger('keydown', { key: 'Escape' })
    expect(store.selectedId).toBeNull()
    store.select(store.schema.tree[0]!.id)
    await canvas.trigger('keydown', { key: 'Delete' })
    expect(store.schema.tree).toHaveLength(0)
  })

  it('keyboard: arrows walk the flattened tree', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    store.select(null)
    await wrapper.get('[data-testid="palette-item-textarea"]').trigger('click')
    store.select(null)
    const canvas = wrapper.get('[data-testid="panel-canvas"]')
    await canvas.trigger('keydown', { key: 'ArrowDown' })
    expect(store.selectedId).toBe(store.schema.tree[0]!.id)
    await canvas.trigger('keydown', { key: 'ArrowDown' })
    expect(store.selectedId).toBe(store.schema.tree[1]!.id)
    await canvas.trigger('keydown', { key: 'ArrowUp' })
    expect(store.selectedId).toBe(store.schema.tree[0]!.id)
  })

  it('tree outline lists nested rows and selects on click', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="tree-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="panel-tree"]').exists()).toBe(true)
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const id = store.schema.tree[0]!.id
    store.select(null)
    await wrapper.get(`[data-testid="tree-row-${id}"]`).trigger('click')
    expect(store.selectedId).toBe(id)
  })

  it('switches to live preview and shows the submitted payload', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    store.updateProps(store.schema.tree[0]!.id, { label: 'Nickname' })
    await wrapper.get('[data-testid="view-preview"]').trigger('click')
    expect(wrapper.find('[data-testid="panel-preview"]').exists()).toBe(true)
    await wrapper.get('[data-testid="panel-preview"] .fg-input').setValue('Zed')
    await wrapper.get('[data-testid="panel-preview"] form').trigger('submit')
    expect(wrapper.get('[data-testid="preview-submitted"]').text()).toContain('Zed')
  })

  it('code view shows the schema JSON', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-checkbox"]').trigger('click')
    store.setName(store.schema.tree[0]!.id, 'accept_terms')
    await wrapper.get('[data-testid="view-code"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="code-json"]').text()).toContain('accept_terms')
  })

  it('device buttons constrain the canvas width', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('[data-testid="device-mobile"]').trigger('click')
    const canvasCard = wrapper.get('[data-testid="panel-canvas"] .fg-form')
    expect(canvasCard.attributes('style')).toContain('max-width: 375px')
  })

  it('theme toggle flips the design-canvas form theme', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('[data-testid="preview-theme-toggle"]').trigger('click')
    const canvasCard = wrapper.get('[data-testid="panel-canvas"] .fg-form')
    expect(canvasCard.attributes('data-fg-theme')).toBe('dark')
  })

  it('settings dialog edits form meta with name validation', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="open-settings"]').trigger('click')
    expect(wrapper.find('[data-testid="settings-dialog"]').exists()).toBe(true)
    await wrapper.get('[data-testid="settings-title"]').setValue('Contact form')
    expect(store.schema.meta.title).toBe('Contact form')
    await wrapper.get('[data-testid="settings-name"]').setValue('bad name!')
    expect(wrapper.find('[data-testid="settings-name-error"]').exists()).toBe(true)
    expect(store.schema.meta.name).toBe('untitled_form')
    await wrapper.get('[data-testid="settings-name"]').setValue('contact_form')
    expect(store.schema.meta.name).toBe('contact_form')
    await wrapper.get('[data-testid="settings-dir"]').setValue('rtl')
    expect(store.schema.meta.dir).toBe('rtl')
    await wrapper.get('[data-testid="settings-close"]').trigger('click')
    expect(wrapper.find('[data-testid="settings-dialog"]').exists()).toBe(false)
  })

  it('keyboard: Alt+Arrows move the selected element (DnD alternative)', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    store.select(null)
    await wrapper.get('[data-testid="palette-item-textarea"]').trigger('click')
    const canvas = wrapper.get('[data-testid="panel-canvas"]')
    const [first, second] = store.schema.tree
    store.select(second!.id)
    await canvas.trigger('keydown', { key: 'ArrowUp', altKey: true })
    expect(store.schema.tree[0]?.id).toBe(second!.id)
    await canvas.trigger('keydown', { key: 'ArrowDown', altKey: true })
    expect(store.schema.tree[0]?.id).toBe(first!.id)
  })

  it('settings dialog traps focus and restores it on close', async () => {
    // Focus only works on attached DOM; this test mounts into the body.
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] }, attachTo: document.body })
    mounted.push(wrapper)
    ;(wrapper.get('[data-testid="open-settings"]').element as HTMLButtonElement).focus()
    await wrapper.get('[data-testid="open-settings"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[data-testid="settings-dialog"]')
    expect(dialog.element.contains(document.activeElement)).toBe(true)
    await wrapper.get('[data-testid="settings-close"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(
      wrapper.get('[data-testid="open-settings"]').element,
    )
  })

  it('error messages are linked to inputs via aria-describedby in preview', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    await wrapper.get('[data-testid="rule-add-select"]').setValue('required')
    await wrapper.get('[data-testid="rule-add-button"]').trigger('click')
    await wrapper.get('[data-testid="view-preview"]').trigger('click')
    const input = wrapper.get('[data-testid="panel-preview"] .fg-input')
    await input.trigger('blur')
    const describedBy = input.attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(wrapper.get(`#${describedBy}`).text()).toBe('This field is required')
  })

  it('tabs host: section headers, add, and routing palette adds into tabs', async () => {
    const { wrapper, store } = mountApp()
    const structureTab = wrapper
      .findAll('[role="tab"]')
      .find((b) => b.text() === 'Structure')!
    await structureTab.trigger('click')
    await wrapper.get('[data-testid="palette-item-tabs"]').trigger('click')
    const tabs = store.schema.tree[0]!
    expect(tabs.children).toHaveLength(2)
    const firstTab = tabs.children![0]!
    expect(wrapper.find(`[data-testid="section-tab-${firstTab.id}"]`).exists()).toBe(true)
    // host selected -> a field lands in the first section
    store.select(tabs.id)
    const fieldsTab = wrapper.findAll('[role="tab"]').find((b) => b.text() === 'Fields')!
    await fieldsTab.trigger('click')
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    expect(firstTab.children).toHaveLength(1)
    // add a third section from the canvas chrome
    await wrapper.get(`[data-testid="section-add-${tabs.id}"]`).trigger('click')
    expect(tabs.children).toHaveLength(3)
  })

  it('locale toggle switches the UI to Arabic and flips direction', async () => {
    const { wrapper } = mountApp()
    expect(wrapper.text()).toContain('Text Input')
    await wrapper.get('[data-testid="locale-toggle"]').trigger('click')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
    expect(wrapper.text()).toContain('حقل نصي') // localized palette label
    expect(wrapper.text()).toContain('العناصر') // palette title
    await wrapper.get('[data-testid="locale-toggle"]').trigger('click')
    expect(document.documentElement.dir).toBe('ltr')
    expect(wrapper.text()).toContain('Text Input')
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
