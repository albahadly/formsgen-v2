import { parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from '@/export/css'
import { getTarget, listTargets } from '@/export/targets'
import { listTemplates } from './index'

const ids = (nodes: ElementNode[]): string[] => nodes.flatMap((n) => [n.id, ...ids(n.children ?? [])])

describe('starter templates', () => {
  for (const lang of ['en', 'ar'] as const) {
    it(`parse, use unique ids and every target exports them (${lang})`, () => {
      const templates = listTemplates(lang)
      expect(templates.map((t) => t.id)).toEqual(['contact', 'registration', 'feedback'])
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

  it('are written in the chosen language', () => {
    const ar = listTemplates('ar')[0]!
    expect(ar.title).toBe('نموذج تواصل')
    expect(JSON.stringify(ar.schema)).toContain('الاسم الكامل')
    expect(JSON.stringify(listTemplates('en')[0]!.schema)).not.toMatch(/[؀-ۿ]/)
  })
})
