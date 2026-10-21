// Guards every non-English builder UI: every catalog key, and every English
// phrase in registry/export metadata shown via tText(), must exist in each
// locale. Adding a panel label, an export target or a locale without the
// translations fails here.

import {
  FONT_PRESETS,
  KNOWN_RULE_NAMES,
  RADIUS_PRESETS,
  SPACE_PRESETS,
  THEME_PALETTES,
  findNodeById,
} from '@albahadly/formsgen-renderer'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import PropertiesPanel from '@/components/panel/PropertiesPanel.vue'
import CodeBlock from '@/components/ui/CodeBlock.vue'
import { listCssAdapters } from '@/export/css'
import { listTargets } from '@/export/targets'
import { listElements } from '@/registry'
import { useBuilderStore } from '@/stores/builder'
import { ENGLISH_KEY_LIST, LOCALES, hasTranslation, setLocale, t, tFor, translationOf, type BuilderLocale } from './index'

/** Technical tokens and product names that read the same in any language. */
const SAME_EVERYWHERE = /^(H\d|Bootstrap 5|Tailwind CSS|https:\/\/(\S*\{z\}\S*)?)$/
const OTHERS = LOCALES.map((l) => l.id).filter((id): id is Exclude<BuilderLocale, 'en'> => id !== 'en')

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

describe('builder UI completeness in every locale', () => {
  afterEach(() => setLocale('en'))

  it('every catalog key of English exists in every locale', () => {
    for (const target of OTHERS) {
      const missing = ENGLISH_KEY_LIST.filter((key) => tFor(target, key) === undefined)
      expect(missing, target).toEqual([])
    }
  })

  it('every panel section title, control label, option and placeholder has a translation', () => {
    for (const target of OTHERS) {
      const missing = panelPhrases().filter((p) => !SAME_EVERYWHERE.test(p) && !hasTranslation(target, p))
      expect(missing, target).toEqual([])
    }
  })

  it('every export target name/description and CSS framework name has a translation', () => {
    const phrases = [
      ...listTargets().flatMap((target) => [target.label, target.description]),
      ...listCssAdapters().map((adapter) => adapter.label),
    ]
    for (const target of OTHERS) {
      expect(phrases.filter((p) => !SAME_EVERYWHERE.test(p) && !hasTranslation(target, p)), target).toEqual([])
    }
  })

  it('every theme preset has a name in every language', () => {
    const keys = [
      ...FONT_PRESETS.map((p) => `settings.font.${p.id}`),
      ...RADIUS_PRESETS.map((p) => `settings.radius.${p.id}`),
      ...SPACE_PRESETS.map((p) => `settings.space.${p.id}`),
      ...['default', ...THEME_PALETTES.map((p) => p.id)].map((id) => `settings.palette.${id}`),
    ]
    for (const lang of LOCALES) {
      setLocale(lang.id)
      expect(keys.filter((key) => t(key) === key), lang.id).toEqual([])
    }
    // Arabic never borrows the English name (a Latin-script language may, e.g. "Graphite").
    const english = keys.map((key) => (setLocale('en'), t(key)))
    setLocale('ar')
    expect(keys.filter((key, i) => t(key) === english[i])).toEqual([])
  })

  it('every validation rule has a readable name in every language', () => {
    for (const lang of LOCALES) {
      setLocale(lang.id)
      for (const rule of KNOWN_RULE_NAMES) {
        const name = t(`properties.validation.rule.${rule}`)
        expect(name, `${lang.id}:${rule}`).not.toBe(`properties.validation.rule.${rule}`)
        expect(name, `${lang.id}:${rule}`).not.toBe(rule)
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

  it('no locale shows English chrome in the panel of any element type', async () => {
    setActivePinia(createPinia())
    const store = useBuilderStore()
    const english = panelPhrases().filter((p) => !SAME_EVERYWHERE.test(p))

    // control: the same scan in English DOES see the phrases (not vacuous)
    setLocale('en')
    store.reset()
    store.select(store.addElement('number').id)
    const control = mount(PropertiesPanel)
    const seen = control.findAll('h3, label, span, p, option').map((el) => el.text().trim())
    expect(english.filter((phrase) => seen.includes(phrase)).length).toBeGreaterThan(3)
    control.unmount()

    for (const target of OTHERS) {
      setLocale(target)
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
        // A phrase that reads the same in that language (translationOf returns it unchanged) is fine.
        const leaked = english.filter((phrase) => shown.includes(phrase) && translationOf(target, phrase) !== phrase)
        expect(leaked, `${target}:${def.type}`).toEqual([])
        wrapper.unmount()
        expect(findNodeById(store.schema.tree, node.id)).not.toBeNull()
      }
    }
  })
})

