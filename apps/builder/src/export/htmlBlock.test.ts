import { parseFormSchema, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from './css'
import { getTarget } from './targets'

function schema(html: string): FormSchema {
  const result = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'hb', locale: 'en', dir: 'ltr' },
    tree: [{ id: 'h', type: 'html', props: { html } }],
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema, css: 'vanilla' | 'tailwind' | 'bootstrap5' = 'vanilla'): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter(css) })
    .map((f) => f.content)
    .join('\n')

describe('HTML blocks in every code target', () => {
  const s = schema(
    '<h4 class="note">Hours</h4><table><tr><th colspan="2">Week</th></tr><tr><td style="color: red; font-weight: 600">Mon</td><td>9</td></tr></table><p>Line<br>two</p><a href="https://x.org" target="_blank">More</a><details open><summary>Why?</summary>Because</details>',
  )

  it('writes the allowed markup in each language', () => {
    expect(out('html', s)).toContain(
      '<div class="fg-html"><h4 class="note">Hours</h4><table><tr><th colspan="2">Week</th></tr><tr><td style="color: red; font-weight: 600">Mon</td><td>9</td></tr></table><p>Line<br>two</p><a href="https://x.org" target="_blank" rel="noopener noreferrer">More</a><details open><summary>Why?</summary>Because</details></div>',
    )
    expect(out('vue-standalone', s)).toContain('<div class="fg-html"><h4 class="note">Hours</h4>')
    const react = out('react', s)
    expect(react).toContain('<h4 className="note">Hours</h4>')
    expect(react).toContain('<th colSpan={2}>Week</th>')
    expect(react).toContain('<td style={{ color: "red", fontWeight: "600" }}>Mon</td>')
    expect(react).toContain('<p>Line<br />two</p>')
    expect(react).toContain('<details open>')
    expect(out('blazor', s)).toContain('<p>Line<br />two</p>')
    expect(out('html', s, 'tailwind')).toContain('<div class="fg-html text-base [&_a]:underline')
    expect(out('html', s, 'bootstrap5')).toContain('<div class="fg-html"><h4 class="note">Hours</h4>')
  })

  it('keeps hostile input inert in every language', () => {
    const evil = schema(
      '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">a</a><p>{{ secret }} @DateTime.Now {x}\nnext</p><iframe src="http://evil"></iframe><style>*{}</style>',
    )
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, evil)
      expect(code, target).not.toMatch(/<script>alert|onerror|javascript:|<iframe|<style>\*/)
    }
    // Vue: "{" as an entity (no interpolation); src bound, so no build-time import
    expect(out('vue-standalone', evil)).toContain(`<div class="fg-html"><img :src="'x'"><a>a</a><p>&#123;&#123; secret }}`)
    expect(out('react', evil)).toContain('<p>{"{{ secret }} @DateTime.Now {x}\\nnext"}</p>')
    expect(out('blazor', evil)).toContain('&#64;DateTime.Now')
  })

  it('the builder offers it as a static element with a textarea and a hint', async () => {
    const { getElement } = await import('@/registry')
    const def = getElement('html')!
    expect(def.category).toBe('static')
    const control = def.propertyPanel[0]!.controls[0]!
    expect(control).toMatchObject({ kind: 'text', prop: 'html', multiline: true })
  })
})

describe('iframes in HTML blocks', () => {
  const s = schema('<iframe src="https://www.youtube.com/embed/x" width="560" height="315" title="Video" allowfullscreen></iframe>')
  const tail = 'sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin" loading="lazy"></iframe>'

  it('keep their src and get the sandbox in every language', () => {
    expect(out('html', s)).toContain(`<iframe src="https://www.youtube.com/embed/x" width="560" height="315" title="Video" allowfullscreen ${tail}`)
    expect(out('vue-standalone', s)).toContain(`<iframe :src="'https://www.youtube.com/embed/x'" width="560" height="315" title="Video" allowfullscreen ${tail}`)
    expect(out('blazor', s)).toContain(`<iframe src="https://www.youtube.com/embed/x" width="560" height="315" title="Video" allowfullscreen ${tail}`)
    expect(out('react', s)).toContain(
      '<iframe src="https://www.youtube.com/embed/x" width="560" height="315" title="Video" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" loading="lazy"></iframe>',
    )
  })

  it('without an https src they are dropped', () => {
    expect(out('html', schema('<iframe src="http://x.example"></iframe>ok'))).not.toContain('<iframe')
  })
})
