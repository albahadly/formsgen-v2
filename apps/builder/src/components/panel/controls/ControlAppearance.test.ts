import { findNodeById, type ElementNode } from '@albahadly/formsgen-renderer'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import { getElement } from '@/registry'
import { useBuilderStore } from '@/stores/builder'

describe('Appearance section', () => {
  let store: ReturnType<typeof useBuilderStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBuilderStore()
  })

  const panelFor = (type: string) => {
    const node = store.addElement(type)
    store.select(node.id)
    return { node, wrapper: mount(PropertiesPanel) }
  }
  const styleOf = (node: ElementNode) => findNodeById(store.schema.tree, node.id)!.style

  it('offers the right options per element type', () => {
    const features = (type: string): string[] =>
      getElement(type)!
        .propertyPanel.flatMap((s) => s.controls)
        .flatMap((c) => (c.kind === 'appearance' ? c.features : []))
    expect(features('text')).toEqual(['size', 'hideLabel', 'align', 'className'])
    expect(features('radiogroup')).toEqual(['hideLabel', 'align', 'className'])
    expect(features('checkbox')).toEqual(['align', 'className'])
    expect(features('heading')).toEqual(['align', 'tone', 'className'])
    expect(features('divider')).toEqual(['tone', 'className'])
    expect(features('group')).toEqual(['align', 'className'])
  })

  it('writes size, alignment and hidden label; defaults are removed, not stored', async () => {
    const { node, wrapper } = panelFor('text')
    await wrapper.get('[data-testid="appearance-size"]').setValue('lg')
    await wrapper.get('[data-testid="appearance-align"]').setValue('center')
    await wrapper.get('[data-testid="appearance-hide-label"]').setValue(true)
    expect(styleOf(node)).toEqual({ size: 'lg', align: 'center', hideLabel: true })
    await wrapper.get('[data-testid="appearance-size"]').setValue('')
    await wrapper.get('[data-testid="appearance-align"]').setValue('')
    await wrapper.get('[data-testid="appearance-hide-label"]').setValue(false)
    expect('style' in findNodeById(store.schema.tree, node.id)!).toBe(false)
  })

  it('sets a heading color', async () => {
    const { node, wrapper } = panelFor('heading')
    await wrapper.get('[data-testid="appearance-tone"]').setValue('danger')
    expect(styleOf(node)).toEqual({ tone: 'danger' })
  })

  it('commits only valid custom classes and explains invalid input', async () => {
    const { node, wrapper } = panelFor('text')
    const input = wrapper.get('[data-testid="appearance-class"]')
    await input.setValue('  my-field   md:w-1/2 ')
    expect(styleOf(node)).toEqual({ className: 'my-field md:w-1/2' })
    await input.setValue('bad"><img src=x>')
    await nextTick()
    expect(wrapper.find('[data-testid="appearance-class-error"]').exists()).toBe(true)
    expect(styleOf(node)).toEqual({ className: 'my-field md:w-1/2' }) // unchanged
    await input.setValue('')
    expect(styleOf(node)).toBeUndefined()
  })
})
