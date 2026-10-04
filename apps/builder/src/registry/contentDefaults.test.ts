import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilderStore } from '@/stores/builder'

describe('new elements start with content in the form language', () => {
  let store: ReturnType<typeof useBuilderStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBuilderStore()
  })

  it('Arabic form: element-name labels, options, placeholders and texts are Arabic', () => {
    store.updateMeta({ locale: 'ar', dir: 'rtl' })
    expect(store.addElement('text').props['label']).toBe('حقل نصي')
    const select = store.addElement('select')
    expect(select.props['label']).toBe('قائمة منسدلة')
    expect(select.props['placeholder']).toBe('اختر…')
    expect((select.props['items'] as { value: string; label: string }[]).map((i) => i)).toEqual([
      { value: 'option_1', label: 'خيار 1' },
      { value: 'option_2', label: 'خيار 2' },
    ])
    expect(store.addElement('tags').props['placeholder']).toBe('اكتب ثم اضغط Enter')
    expect(store.addElement('heading').props['text']).toBe('عنوان')
    expect(store.addElement('paragraph').props['text']).toBe('نص الفقرة.')
  })

  it('Arabic form: tabs/steps sections are named in Arabic, including added ones', () => {
    store.updateMeta({ locale: 'ar-OM' })
    const tabs = store.addElement('tabs')
    expect(tabs.children!.map((c) => c.props['label'])).toEqual(['تبويب 1', 'تبويب 2'])
    store.select(null)
    const steps = store.addElement('steps')
    expect(steps.children!.map((c) => c.props['label'])).toEqual(['الخطوة 1', 'الخطوة 2'])
    expect(store.addSection(tabs.id)!.props['label']).toBe('تبويب 3')
  })

  it('English form: defaults unchanged; option values are never translated', () => {
    const select = store.addElement('select')
    expect(select.props['label']).toBe('Select')
    expect((select.props['items'] as { label: string }[])[0]!.label).toBe('Option 1')
    expect(store.addElement('text').props['label']).toBe('Text Input')
  })
})
