import { parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from '../css'
import { getTarget } from './index'

function schema(tree: ElementNode[]): FormSchema {
  const result = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'demo', locale: 'en', dir: 'ltr' },
    tree,
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const out = (target: string, tree: ElementNode[], fw: CssFrameworkId = 'vanilla') =>
  getTarget(target)!
    .generate({ schema: schema(tree), css: getCssAdapter(fw) })
    .map((f) => f.content)
    .join('\n')

const items = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]

describe('choice display variants', () => {
  it('Bootstrap uses its native btn-check + label pairs (siblings)', () => {
    const html = out('html', [{ id: 'r', type: 'radiogroup', name: 'r', props: { label: 'R', items, display: 'buttons' } }], 'bootstrap5')
    expect(html).toContain('<div class="btn-group flex-wrap">')
    expect(html).toMatch(/<input id="fg_r-a" type="radio" name="r" class="btn-check"[^>]*>\n\s*<label class="btn btn-outline-primary" for="fg_r-a">A<\/label>/)
    const razor = out('blazor', [{ id: 'c', type: 'checkboxgroup', name: 'c', props: { label: 'C', items, display: 'blocks' } }], 'bootstrap5')
    expect(razor).toContain('<input id="fg_c-a" type="checkbox" class="btn-check"')
    expect(razor).toContain('<label class="btn btn-outline-primary text-start" for="fg_c-a">A</label>')
  })

  it('Tailwind and vanilla nest the input in its label', () => {
    const tw = out('react', [{ id: 'r', type: 'radiogroup', name: 'r', props: { label: 'R', items, display: 'buttons' } }], 'tailwind')
    expect(tw).toMatch(/<label className="relative -ms-px[^"]*" htmlFor="fg_r-a">\n\s*<input id="fg_r-a" type="radio" className="sr-only"/)
    const vue = out('vue-standalone', [{ id: 'c', type: 'checkboxgroup', name: 'c', props: { label: 'C', items, display: 'blocks' } }])
    expect(vue).toContain('<label class="fg-option fg-option--block" for="fg_c-a">')
  })
})

describe('toggle, vertical slider, color', () => {
  it('toggle is a checkbox with role="switch" in every target', () => {
    const tree: ElementNode[] = [{ id: 't', type: 'toggle', name: 'on', props: { label: 'On' } }]
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      expect(out(target, tree, 'bootstrap5'), target).toMatch(/role="switch"/)
      expect(out(target, tree, 'bootstrap5'), target).toContain('form-check form-switch')
    }
    expect(out('react', tree)).toContain("on: boolean")
  })

  it('vertical slider: inline writing-mode style (JSX as an object)', () => {
    const tree: ElementNode[] = [{ id: 'v', type: 'range', name: 'v', props: { label: 'V', orientation: 'vertical' } }]
    expect(out('html', tree)).toContain('aria-orientation="vertical" style="writing-mode: vertical-lr; direction: rtl; align-self: flex-start; width: auto; height: 10rem"')
    expect(out('react', tree)).toContain("style={{ writingMode: 'vertical-lr', direction: 'rtl', alignSelf: 'flex-start', width: 'auto', height: '10rem' }}")
  })

  it('color: dedicated control class, black by default', () => {
    const tree: ElementNode[] = [{ id: 'k', type: 'color', name: 'k', props: { label: 'K' } }]
    expect(out('html', tree, 'bootstrap5')).toContain('type="color" class="form-control form-control-color"')
    expect(out('react', tree)).toContain('k: "#000000"')
    expect(out('blazor', tree)).toContain('public string K { get; set; } = "#000000";')
  })
})

describe('hidden input', () => {
  const tree: ElementNode[] = [{ id: 's', type: 'hidden', name: 'source', props: { value: 'ad "x"' } }]
  it('HTML gets a hidden input without a grid cell; bound targets keep it in state', () => {
    const html = out('html', tree)
    expect(html).toContain('<input id="fg_source" type="hidden" value="ad &quot;x&quot;" data-fg-path="source" data-fg-kind="text">')
    expect(html).not.toMatch(/<div class="fg-cell"[^>]*>\s*<input id="fg_source"/)
    expect(out('react', tree)).toContain('source: "ad \\"x\\""')
    expect(out('vue-standalone', tree)).toContain('source: "ad \\"x\\""')
    expect(out('blazor', tree)).toContain('public string Source { get; set; } = "ad \\"x\\"";')
    expect(out('blazor', tree)).not.toContain('type="hidden"')
  })
})

describe('static image, link, quote', () => {
  it('safe URLs only; new tab gets rel and a screen-reader hint', () => {
    const tree: ElementNode[] = [
      { id: 'l', type: 'link', props: { text: 'Mail @team', href: 'mailto:team@example.com', newTab: true } },
      { id: 'i', type: 'image', props: { src: 'https://example.com/a.png', alt: 'Logo', width: 120 } },
      { id: 'q', type: 'quote', props: { text: 'Hi', cite: 'Ann' } },
    ]
    const razor = out('blazor', tree, 'bootstrap5')
    // "@" would start C# code in Razor: emitted as an entity everywhere
    expect(razor).toContain('<a class="link-primary" href="mailto:team&#64;example.com" target="_blank" rel="noopener noreferrer">Mail &#64;team<span class="visually-hidden"> (opens in a new tab)</span></a>')
    expect(razor).toContain('<img class="img-fluid rounded" src="https://example.com/a.png" alt="Logo" width="120" loading="lazy">')
    expect(out('react', tree)).toContain('loading="lazy" />')
    expect(razor).toContain('<figcaption class="blockquote-footer mb-0">Ann</figcaption>')
  })
})

describe('reset button', () => {
  const tree: ElementNode[] = [
    { id: 'n', type: 'text', name: 'name', props: { label: 'Name' } },
    { id: 'b', type: 'button', props: { text: 'Clear', action: 'reset', variant: 'secondary' } },
  ]
  it('each target wires its own reset handler, only when a reset button exists', () => {
    expect(out('html', tree)).toContain("document.querySelectorAll('[data-fg-reset]')")
    expect(out('react', tree)).toContain('onClick={fgReset}')
    expect(out('react', tree)).toContain('function fgReset(): void')
    expect(out('vue-standalone', tree)).toContain('@click="fgReset"')
    expect(out('blazor', tree)).toContain('@onclick="FgReset"')
    expect(out('blazor', tree)).toContain('Model = new();\n        FgInitEdit();')
    const plain: ElementNode[] = [tree[0]!]
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      expect(out(target, plain), target).not.toMatch(/fgReset|FgReset|data-fg-reset/)
    }
  })

  it('link buttons are anchors with the variant class', () => {
    const link: ElementNode[] = [{ id: 'k', type: 'button', props: { text: 'Help', action: 'link', href: '/help', variant: 'danger' } }]
    expect(out('html', link, 'bootstrap5')).toContain('<a class="btn btn-danger" href="/help">Help</a>')
  })
})

describe('typed targets compile under strict TypeScript', () => {
  it('helpers are typed and boolean checks go through fgIsBlank(unknown)', () => {
    const tree: ElementNode[] = [
      { id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }] },
      { id: 'o', type: 'text', name: 'other', props: { label: 'Other' }, conditions: [[{ field: 'name', operator: 'empty' }]] },
    ]
    for (const target of ['react', 'vue-standalone']) {
      const code = out(target, tree)
      expect(code, target).toContain('function fgIsEmpty(v: unknown): boolean')
      expect(code, target).toContain('if (fgIsBlank(v)) return')
      expect(code, target).toContain('fgIsBlank(')
      expect(code, target).not.toMatch(/data\.\w+ === false/)
      // the only `v === false` is fgIsBlank's own
      expect(code.match(/\bv === false\b/g), target).toHaveLength(1)
      expect(code, target).toMatch(/function fgIsBlank\(v: unknown\): boolean \{\n {2}return fgIsEmpty\(v\) \|\| v === false/)
    }
    expect(out('vue-standalone', tree)).toContain('const form = reactive<FormData>(')
  })
})

describe('vanilla stylesheet mirrors the renderer stylesheet', () => {
  it('every rule added for the new elements is in both', () => {
    // vitest runs with the builder package as its working directory
    const rendererCss = readFileSync(resolve(process.cwd(), '../../packages/renderer/src/styles.css'), 'utf8')
    const block = rendererCss.slice(rendererCss.indexOf('/* Phase 23 elements'))
    const vanilla = getCssAdapter('vanilla').stylesheet!(undefined)!
    const missing = block.split('\n').filter((line) => line.trim() && !vanilla.includes(line))
    expect(missing).toEqual([])
  })
})

describe('right-to-left Bootstrap', () => {
  it('an RTL form links Bootstrap\'s RTL build', () => {
    const tree: ElementNode[] = [{ id: 'n', type: 'text', name: 'n', props: { label: 'N' } }]
    const rtl = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'demo', locale: 'ar', dir: 'rtl' }, tree })
    if (!rtl.ok) throw new Error()
    const html = getTarget('html')!.generate({ schema: rtl.schema, css: getCssAdapter('bootstrap5') })[0]!.content
    expect(html).toContain('bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css')
    expect(out('html', tree, 'bootstrap5')).toContain('bootstrap@5.3.3/dist/css/bootstrap.min.css')
  })
})
