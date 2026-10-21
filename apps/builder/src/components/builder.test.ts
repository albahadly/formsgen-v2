// Integration-style tests across the three panels, mounted via App.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RENDERER_VERSION } from '@formsgen/renderer'
import App from '../App.vue'
import { version as BUILDER_VERSION } from '../../package.json'
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

  it('canvas cells take the same column spans as the preview', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    const node = store.schema.tree[0]!
    store.setColSpan(node.id, 6)
    await flushPromises()
    const cell = wrapper.get(`[data-testid="canvas-node-${node.id}"]`)
    expect(cell.classes()).toContain('fg-cell')
    expect(cell.attributes('style')).toContain('--fg-span: 6')
    expect(cell.attributes('style')).toContain('--fg-span-lg: 6')
    expect(cell.element.parentElement?.classList.contains('fg-grid')).toBe(true)
    await wrapper.get('[data-testid="device-tablet"]').trigger('click')
    const canvasCard = wrapper.get('[data-testid="panel-canvas"] .fg-form')
    expect(canvasCard.attributes('data-fg-viewport')).toBe('md')
  })

  it('theme toggle flips the design-canvas form theme', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('[data-testid="preview-theme-toggle"]').trigger('click')
    const canvasCard = wrapper.get('[data-testid="panel-canvas"] .fg-form')
    expect(canvasCard.attributes('data-fg-theme')).toBe('dark')
  })

  it('builder theme: the header toggle darkens the chrome and is remembered', async () => {
    const { wrapper } = mountApp()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    await wrapper.get('[data-testid="theme-toggle"]').trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem('formsgen.theme')).toBe('dark')
    expect(wrapper.get('[data-testid="theme-toggle"]').attributes('aria-pressed')).toBe('true')
    // the form on the canvas keeps its own theme
    expect(wrapper.get('[data-testid="panel-canvas"] .fg-form').attributes('data-fg-theme')).toBe('light')
    // a new session starts with the stored choice
    document.documentElement.setAttribute('data-theme', 'light')
    mountApp()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('the header shows the builder and renderer versions', () => {
    const { wrapper } = mountApp()
    expect(wrapper.get('[data-testid="app-version"]').text()).toBe(`v${BUILDER_VERSION} · renderer v${RENDERER_VERSION}`)
    expect(BUILDER_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
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

  it('settings theme: colors, presets, custom values, resets — and the canvas follows', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="preview-theme-toggle"]').trigger('click') // dark preview
    await wrapper.get('[data-testid="open-settings"]').trigger('click')
    const canvas = () => wrapper.get('[data-testid="panel-canvas"] .fg-form')
    expect(wrapper.get('[data-testid="settings-theme-reset"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="settings-theme-color-primary"]').setValue('#0f766e')
    await wrapper.get('[data-testid="settings-theme-color-bg"]').setValue('#fffbeb')
    expect(store.schema.meta.theme).toEqual({ 'color-primary': '#0f766e', 'color-bg': '#fffbeb' })
    expect(canvas().attributes('style')).toContain('--fg-color-primary: #0f766e')
    // a custom background pins the light scheme even in dark preview
    expect(canvas().attributes('data-fg-theme')).toBe('light')

    await wrapper.get('[data-testid="settings-theme-color-bg-reset"]').trigger('click')
    expect(store.schema.meta.theme).toEqual({ 'color-primary': '#0f766e' })
    expect(canvas().attributes('data-fg-theme')).toBe('dark')

    await wrapper.get('[data-testid="settings-theme-radius"]').setValue('none')
    await wrapper.get('[data-testid="settings-theme-font"]').setValue('serif')
    expect(store.schema.meta.theme?.['radius']).toBe('0px')
    expect(store.schema.meta.theme?.['font']).toBe('Georgia, "Times New Roman", serif')
    await wrapper.get('[data-testid="settings-theme-radius"]').setValue('medium')
    expect(store.schema.meta.theme?.['radius']).toBeUndefined()

    await wrapper.get('[data-testid="settings-theme-space"]').setValue('custom')
    const custom = wrapper.get('[data-testid="settings-theme-space-custom"]')
    await custom.setValue('2rem; } body {')
    expect(wrapper.find('[data-testid="settings-theme-space-error"]').exists()).toBe(true)
    expect(store.schema.meta.theme?.['space']).toBeUndefined()
    await custom.setValue('2rem')
    expect(wrapper.find('[data-testid="settings-theme-space-error"]').exists()).toBe(false)
    expect(store.schema.meta.theme?.['space']).toBe('2rem')
    // a custom value that is not a preset keeps the custom choice selected
    expect((wrapper.get('[data-testid="settings-theme-space"]').element as HTMLSelectElement).value).toBe('custom')

    // one-click palette: replaces the colors, keeps font/radius/spacing
    expect(wrapper.get('[data-testid="settings-palette-default"]').attributes('aria-pressed')).toBe('false')
    await wrapper.get('[data-testid="settings-palette-midnight"]').trigger('click')
    expect(store.schema.meta.theme?.['color-bg']).toBe('#0f172a')
    expect(store.schema.meta.theme?.['color-muted']).toBe('#94a3b8')
    expect(store.schema.meta.theme?.['space']).toBe('2rem')
    expect(wrapper.get('[data-testid="settings-palette-midnight"]').attributes('aria-pressed')).toBe('true')
    expect(canvas().attributes('style')).toContain('color-scheme: dark')
    await wrapper.get('[data-testid="settings-theme-color-muted"]').setValue('#cbd5e1')
    expect(wrapper.get('[data-testid="settings-palette-midnight"]').attributes('aria-pressed')).toBe('false')
    await wrapper.get('[data-testid="settings-palette-default"]').trigger('click')
    expect(Object.keys(store.schema.meta.theme ?? {}).some((k) => k.startsWith('color-'))).toBe(false)
    expect(wrapper.get('[data-testid="settings-palette-default"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-testid="settings-theme-reset"]').trigger('click')
    expect(store.schema.meta.theme).toBeUndefined()
    expect(canvas().attributes('style') ?? '').not.toContain('--fg-')
  })

  it('new palette elements land on the canvas; canvas links never navigate', async () => {
    const { wrapper, store } = mountApp()
    for (const type of ['toggle', 'datetime', 'color', 'search', 'month', 'week', 'hidden']) {
      await wrapper.get(`[data-testid="palette-item-${type}"]`).trigger('click')
    }
    const canvas = wrapper.get('[data-testid="panel-canvas"]')
    expect(canvas.find('[role="switch"]').exists()).toBe(true)
    expect(canvas.find('input[type="datetime-local"]').exists()).toBe(true)
    expect(canvas.find('input[type="color"]').exists()).toBe(true)
    expect(canvas.text()).toContain('hidden = ""')
    await wrapper.findAll('[data-testid="panel-palette"] [role="tab"]')[1]!.trigger('click')
    for (const type of ['quote', 'link', 'image', 'button']) {
      await wrapper.get(`[data-testid="palette-item-${type}"]`).trigger('click')
    }
    const link = store.schema.tree.find((n) => n.type === 'link')!
    store.updateProps(link.id, { href: 'https://example.com' })
    await flushPromises()
    const anchor = wrapper.get('[data-testid="panel-canvas"] a.fg-link')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    anchor.element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(store.selectedId).toBe(link.id)
    expect(wrapper.find('[data-testid="panel-canvas"] .fg-quote').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel-canvas"] button.fg-button').text()).toBe('Reset')
  })

  it('repeater: fields, layout and one inner repeater go inside; tabs and a third level do not', async () => {
    const { wrapper, store } = mountApp()
    const structure = () => wrapper.findAll('[data-testid="panel-palette"] [role="tab"]')[2]!.trigger('click')
    const fields = () => wrapper.findAll('[data-testid="panel-palette"] [role="tab"]')[0]!.trigger('click')
    await structure()
    await wrapper.get('[data-testid="palette-item-repeater"]').trigger('click')
    const repeater = store.schema.tree[0]!
    expect(repeater.type).toBe('repeater')
    expect(repeater.name).toBe('repeater')
    await wrapper.get('[data-testid="palette-item-group"]').trigger('click') // inside: layout only
    expect(wrapper.find('[data-testid="name-layout-only"]').exists()).toBe(true)
    store.select(repeater.id)
    await wrapper.get('[data-testid="palette-item-tabs"]').trigger('click') // refused inside
    store.select(repeater.id)
    await fields()
    await wrapper.get('[data-testid="palette-item-text"]').trigger('click')
    store.select(repeater.id)
    await structure()
    await wrapper.get('[data-testid="palette-item-repeater"]').trigger('click') // an inner repeater
    const inner = repeater.children![2]!
    store.select(inner.id)
    await wrapper.get('[data-testid="palette-item-repeater"]').trigger('click') // no third level
    expect(repeater.children!.map((c) => c.type)).toEqual(['group', 'text', 'repeater'])
    expect(store.schema.tree.map((n) => n.type)).toEqual(['repeater', 'tabs', 'repeater'])
    expect(wrapper.get('[data-testid="panel-canvas"]').text()).toContain('these fields repeat for every item')
    await wrapper.get('[data-testid="view-preview"]').trigger('click')
    const items = () => wrapper.get('[data-testid="panel-preview"]').findAll('[data-fg-item]').length
    const before = items()
    // the outer repeater's own add button comes after its items
    await wrapper.get('[data-testid="panel-preview"]').findAll('.fg-repeater')[0]!.findAll('.fg-repeater-add').at(-1)!.trigger('click')
    await flushPromises()
    expect(items()).toBe(before + 2) // a new outer item with its inner item
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

  it('examples dialog: the dropdown previews each example; using one loads it', async () => {
    const { wrapper, store } = mountApp()
    await wrapper.get('[data-testid="toolbar-templates"]').trigger('click')
    const preview = () => wrapper.get('[data-testid="templates-preview"]')
    expect(preview().text()).toContain('Get in touch')
    await wrapper.get('[data-testid="templates-select"]').setValue('booking')
    expect(preview().text()).toContain('Book your stay')
    expect(preview().find('.fg-dual').exists()).toBe(true) // the budget range slider
    expect(wrapper.get('[data-testid="templates-description"]').text()).toContain('budget')
    expect(store.schema.tree).toHaveLength(0) // previewing changes nothing
    await wrapper.get('[data-testid="template-use"]').trigger('click')
    expect(store.schema.meta.name).toBe('hotel_booking')
    expect(wrapper.find('[data-testid="templates-dialog"]').exists()).toBe(false)
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
