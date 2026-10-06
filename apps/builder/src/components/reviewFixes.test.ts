// Builder fixes from the project-wide review after Phase 34.
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import CanvasPanel from '@/components/canvas/CanvasPanel.vue'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import { operatorsFor, newCondition } from '@/conditions/sources'
import { useBuilderStore } from '@/stores/builder'
import { useUiStore } from '@/stores/ui'

describe('review fixes in the builder', () => {
  let store: ReturnType<typeof useBuilderStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBuilderStore()
  })

  it('Settings writes only a well-formed Turnstile site key', async () => {
    useUiStore().openSettings()
    const wrapper = mount(SettingsDialog)
    const input = wrapper.get('[data-testid="settings-captcha"]')
    await input.setValue('bad key!')
    await input.trigger('change')
    expect(store.schema.meta.captcha).toBeUndefined()
    expect(wrapper.find('[role=alert]').exists()).toBe(true)
    await input.setValue('  1x00000000000000000000AA ')
    await input.trigger('change')
    expect(store.schema.meta.captcha).toEqual({ provider: 'turnstile', siteKey: '1x00000000000000000000AA' })
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
    await input.setValue('')
    await input.trigger('change')
    expect(store.schema.meta.captcha).toBeUndefined()
  })

  it('number controls keep a prop inside its range', async () => {
    const node = store.addElement('location')
    store.select(node.id)
    const wrapper = mount(PropertiesPanel)
    await wrapper.get('[data-testid="control-height"]').setValue('9999')
    await wrapper.get('[data-testid="control-zoom"]').setValue('0')
    await nextTick()
    const props = store.schema.tree.find((n) => n.id === node.id)!.props
    expect(props['height']).toBe(600)
    expect(props['zoom']).toBe(1)
  })

  it('a location gets only "required" and the presence conditions', () => {
    const node = store.addElement('location')
    store.select(node.id)
    const wrapper = mount(PropertiesPanel)
    const offered = wrapper.findAll('[data-testid="rule-add-select"] option').map((o) => o.attributes('value')).filter(Boolean)
    expect(offered).toEqual(['required'])
    expect(operatorsFor('location')).toEqual(['not-empty', 'empty'])
    expect(newCondition({ path: 'place', label: 'Where', type: 'location' } as Parameters<typeof newCondition>[0]).operator).toBe('not-empty')
  })

  it('keys typed into an editable box on the canvas are not canvas shortcuts', async () => {
    const node = store.addElement('richtext')
    store.select(node.id)
    const wrapper = mount(CanvasPanel)
    const editor = wrapper.get('[data-fg-richtext]')
    await editor.trigger('keydown', { key: 'Backspace' })
    expect(store.schema.tree.map((n) => n.id)).toContain(node.id)
    await wrapper.get('[data-testid="panel-canvas"]').trigger('keydown', { key: 'Backspace' })
    expect(store.schema.tree.map((n) => n.id)).not.toContain(node.id)
  })
})
