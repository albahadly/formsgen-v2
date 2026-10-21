import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from './css'
import { getTarget } from './targets'

function schema(text: string): FormSchema {
  const result = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'rt', locale: 'en', dir: 'ltr' },
    tree: [{ id: 'p', type: 'paragraph', props: { format: 'markdown', text } }],
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema, css = 'vanilla'): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter(css as 'vanilla') })
    .map((f) => f.content)
    .join('\n')

describe('formatted paragraphs in every code target', () => {
  const s = schema('Please read **the terms** and *our* [policy](https://example.com/p).\n\n- First\n- Second\n\n1. One')

  it('writes paragraphs, emphasis, safe links and lists', () => {
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, s)
      expect(code, target).toContain('<strong>the terms</strong>')
      expect(code, target).toContain('<em>our</em>')
      expect(code, target).toMatch(/<a (class|className)="fg-link" href="https:\/\/example\.com\/p">policy<\/a>/)
      expect(code, target).toMatch(/<ul>\s*<li>First<\/li>\s*<li>Second<\/li>\s*<\/ul>/)
      expect(code, target).toMatch(/<ol>\s*<li>One<\/li>\s*<\/ol>/)
      expect(code, target).toMatch(/<div (class|className)="fg-paragraph fg-rich-text"/)
    }
    expect(out('html', s, 'tailwind')).toContain('<ul class="list-disc ps-5">')
    expect(out('html', s, 'bootstrap5')).toContain('class="text-secondary mb-0 fg-rich-text"')
  })

  it('keeps hostile text as text in every language', () => {
    const evil = schema('<img src=x onerror=alert(1)> {{ secret }} @DateTime.Now {x} [bad](javascript:alert(1))')
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, evil)
      expect(code, target).toContain('&lt;img src=x onerror=alert(1)&gt;')
      expect(code, target).not.toContain('href="javascript')
      expect(code, target).toContain('[bad](javascript:alert(1))')
    }
    // Vue: "{" as an entity, so {{ }} stays text
    expect(out('vue-standalone', evil)).toContain('&#123;&#123; secret }}')
    expect(out('react', evil)).toContain("{'{'}x{'}'}")
    expect(out('blazor', evil)).toContain('&#64;DateTime.Now')
  })

  it('plain paragraphs are unchanged', () => {
    const plain = parseFormSchema({
      $schema: 'formsgen/v2',
      meta: { name: 'rt', locale: 'en', dir: 'ltr' },
      tree: [{ id: 'p', type: 'paragraph', props: { text: 'Stay **as is**' } }],
    })
    if (!plain.ok) throw new Error('parse')
    expect(out('html', plain.schema)).toContain('<p class="fg-paragraph">Stay **as is**</p>')
  })
})
