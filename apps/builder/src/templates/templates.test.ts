import { parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from '@/export/css'
import { getTarget, listTargets } from '@/export/targets'
import { listElements } from '@/registry'
import { listTemplates } from './index'

const ids = (nodes: ElementNode[]): string[] => nodes.flatMap((n) => [n.id, ...ids(n.children ?? [])])

describe('starter templates', () => {
  for (const lang of ['en', 'ar'] as const) {
    it(`parse, use unique ids and every target exports them (${lang})`, () => {
      const templates = listTemplates(lang)
      expect(templates.map((t) => t.id)).toEqual(['contact', 'registration', 'feedback', 'job', 'booking', 'trip', 'settings', 'rsvp', 'order', 'appointment', 'quote'])
      for (const template of templates) {
        const result = parseFormSchema(structuredClone(template.schema))
        expect(result.ok ? [] : result.errors, template.id).toEqual([])
        const all = ids(template.schema.tree)
        expect(new Set(all).size, template.id).toBe(all.length)
        expect(template.schema.meta.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr')
        for (const target of listTargets()) {
          for (const fw of ['vanilla', 'tailwind', 'bootstrap5'] as const) {
            const files = getTarget(target.id)!.generate({ schema: template.schema, css: getCssAdapter(fw) })
            const code = files.map((f) => f.content).join('\n')
            expect(code, `${template.id} ${target.id} ${fw}`).not.toContain('has no')
          }
        }
      }
    })
  }

  it('together use every element type, so each one has an example', () => {
    const types = (nodes: ElementNode[]): string[] => nodes.flatMap((n) => [n.type, ...types(n.children ?? [])])
    for (const lang of ['en', 'ar'] as const) {
      const used = new Set(listTemplates(lang).flatMap((t) => types(t.schema.tree)))
      const missing = listElements()
        .map((d) => d.type)
        .filter((type) => !used.has(type))
      expect(missing, lang).toEqual([])
    }
  })

  it('show off reordering, nested sections, several answers per row and formatted text', () => {
    const find = (nodes: ElementNode[], id: string): ElementNode | undefined =>
      nodes.map((n) => (n.id === id ? n : find(n.children ?? [], id))).find(Boolean)
    const byId = Object.fromEntries(listTemplates('en').map((t) => [t.id, t.schema.tree]))
    expect(find(byId.job!, 'tpl-job-history')!.props['sortable']).toBe(true)
    expect(find(byId.job!, 'tpl-job-intro')!.props['format']).toBe('markdown')
    expect(find(byId.feedback!, 'tpl-fb-channels')!.props['multiple']).toBe(true)
    const bags = find(byId.trip!, 'tpl-trip-bags')!
    expect(bags.type).toBe('repeater')
    expect(find(byId.trip!, 'tpl-trip-travellers')!.children!.some((c) => c.id === 'tpl-trip-bags')).toBe(true)
    expect(bags.conditions).toEqual([[{ field: 'travellers.has_bags', operator: 'equals', value: true }]])
  })

  it('are written in the chosen language', () => {
    const ar = listTemplates('ar')[0]!
    expect(ar.title).toBe('نموذج تواصل')
    expect(JSON.stringify(ar.schema)).toContain('الاسم الكامل')
    for (const template of listTemplates('en')) {
      expect(JSON.stringify(template.schema), template.id).not.toMatch(/[؀-ۿ]/)
    }
  })
})
