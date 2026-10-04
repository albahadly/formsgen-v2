// Guards the Arabic builder UI: every UI string — catalog keys, and English
// phrases in registry/export metadata shown via tText() — must have Arabic.
// Adding a panel label or an export target without a translation fails here.

import {
  FONT_PRESETS,
  KNOWN_RULE_NAMES,
  RADIUS_PRESETS,
  SPACE_PRESETS,
  findNodeById,
} from '@formsgen/renderer'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import CodeBlock from '@/components/ui/CodeBlock.vue'
import { listCssAdapters } from '@/export/css'
import { listTargets } from '@/export/targets'
import { listElements } from '@/registry'
import { useBuilderStore } from '@/stores/builder'
import { hasArabicText, setLocale, t } from './index'

/** Technical tokens and product names that read the same in Arabic. */
const SAME_IN_ARABIC = /^(H\d|Bootstrap 5|Tailwind CSS)$/

function panelPhrases(): string[] {
  const phrases = new Set<string>()
  for (const def of listElements()) {
    for (const section of def.propertyPanel) {
      phrases.add(section.title)
      for (const control of section.controls) {
        if ('label' in control) phrases.add(control.label)
        if (control.kind === 'text' && control.placeholder) phrases.add(control.placeholder)
        if (control.kind === 'select') control.options.forEach((o) => phrases.add(o.label))
      }
    }
  }
  return [...phrases]
}

describe('Arabic builder UI completeness', () => {
  afterEach(() => setLocale('en'))

  it('every panel section title, control label, option and placeholder has Arabic', () => {
    const missing = panelPhrases().filter((p) => !SAME_IN_ARABIC.test(p) && !hasArabicText(p))
    expect(missing).toEqual([])
  })

  it('every export target name/description and CSS framework name has Arabic', () => {
    const phrases = [
      ...listTargets().flatMap((target) => [target.label, target.description]),
      ...listCssAdapters().map((adapter) => adapter.label),
    ]
    expect(phrases.filter((p) => !SAME_IN_ARABIC.test(p) && !hasArabicText(p))).toEqual([])
  })

  it('every theme preset has a name in both languages', () => {
    const keys = [
      ...FONT_PRESETS.map((p) => `settings.font.${p.id}`),
      ...RADIUS_PRESETS.map((p) => `settings.radius.${p.id}`),
      ...SPACE_PRESETS.map((p) => `settings.space.${p.id}`),
    ]
    for (const lang of ['en', 'ar'] as const) {
      setLocale(lang)
      expect(keys.filter((key) => t(key) === key), lang).toEqual([])
    }
    const english = keys.map((key) => (setLocale('en'), t(key)))
    setLocale('ar')
    expect(keys.filter((key, i) => t(key) === english[i])).toEqual([])
  })

  it('every validation rule has a readable name in both languages', () => {
    for (const lang of ['en', 'ar'] as const) {
      setLocale(lang)
      for (const rule of KNOWN_RULE_NAMES) {
        const name = t(`properties.validation.rule.${rule}`)
        expect(name, `${lang}:${rule}`).not.toBe(`properties.validation.rule.${rule}`)
        expect(name, `${lang}:${rule}`).not.toBe(rule)
      }
    }
  })

  it('code and identifiers stay left-to-right inside the RTL Arabic UI', () => {
    setLocale('ar')
    const code = mount(CodeBlock, { props: { code: '{ "a": 1 }', language: 'json' } })
    expect(code.get('pre').attributes('dir')).toBe('ltr')
    setActivePinia(createPinia())
    const store = useBuilderStore()
    store.select(store.addElement('text').id)
    const panel = mount(PropertiesPanel)
    expect(panel.get('[data-testid="control-name"]').attributes('dir')).toBe('ltr')
    panel.unmount()
  })

  it('the Arabic panel shows no English chrome for any element type', async () => {
    setActivePinia(createPinia())
    const store = useBuilderStore()
    const english = panelPhrases().filter((p) => !SAME_IN_ARABIC.test(p))

    // control: the same scan in English DOES see the phrases (not vacuous)
    setLocale('en')
    store.reset()
    store.select(store.addElement('number').id)
    const control = mount(PropertiesPanel)
    const seen = control.findAll('h3, label, span, p, option').map((el) => el.text().trim())
    expect(english.filter((phrase) => seen.includes(phrase)).length).toBeGreaterThan(3)
    control.unmount()

    setLocale('ar')
    for (const def of listElements()) {
      if (def.type === 'tab' || def.type === 'step') continue // live inside their hosts
      store.reset()
      const node = store.addElement(def.type)
      store.select(node.id)
      const wrapper = mount(PropertiesPanel)
      const shown = [
        ...wrapper.findAll('h3, label, span, p, option').map((el) => el.text().trim()),
        ...wrapper.findAll('input[placeholder]').map((el) => el.attributes('placeholder') ?? ''),
      ]
      const leaked = english.filter((phrase) => shown.includes(phrase))
      expect(leaked, def.type).toEqual([])
      expect(findNodeById(store.schema.tree, node.id)).not.toBeNull()
      wrapper.unmount()
    }
  })
})
