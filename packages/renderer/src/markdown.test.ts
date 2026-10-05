import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { markdownText, parseInline, parseMarkdown } from './markdown'
import type { FormSchema } from './schema'

describe('simple formatting (markdown subset)', () => {
  it('parses bold, italics and safe links, nested', () => {
    expect(parseInline('a **b *c*** _d_ [e](https://x.org/a)')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'strong', c: [{ t: 'text', v: 'b ' }, { t: 'em', c: [{ t: 'text', v: 'c' }] }] },
      { t: 'text', v: ' ' },
      { t: 'em', c: [{ t: 'text', v: 'd' }] },
      { t: 'text', v: ' ' },
      { t: 'link', href: 'https://x.org/a', c: [{ t: 'text', v: 'e' }] },
    ])
  })

  it('keeps unsafe links, stray markers and HTML as plain text', () => {
    expect(parseInline('[x](javascript:alert(1)) 2 * 3 <b>')).toEqual([{ t: 'text', v: '[x](javascript:alert(1)) 2 * 3 <b>' }])
    expect(parseInline('**open')).toEqual([{ t: 'text', v: '**open' }])
  })

  it('splits paragraphs, line breaks and lists', () => {
    const blocks = parseMarkdown('Hello\nworld\n\n- one\n- **two**\n  more\n1. first\n\nEnd')
    expect(blocks.map((b) => b.t)).toEqual(['p', 'ul', 'ol', 'p'])
    expect(blocks[0]).toEqual({ t: 'p', c: [{ t: 'text', v: 'Hello' }, { t: 'br' }, { t: 'text', v: 'world' }] })
    expect(blocks[1]).toEqual({
      t: 'ul',
      items: [[{ t: 'text', v: 'one' }], [{ t: 'strong', c: [{ t: 'text', v: 'two' }] }, { t: 'text', v: ' more' }]],
    })
    expect(markdownText(blocks)).toBe('Hello world one two more first End')
  })

  it('renders as elements in the form (no injected HTML)', () => {
    const schema = {
      $schema: 'formsgen/v2',
      meta: { name: 'f', locale: 'en', dir: 'ltr' },
      tree: [
        { id: 'p', type: 'paragraph', props: { format: 'markdown', text: 'Read **this** <i>x</i>\n\n- [Terms](/terms)\n- *Fast*' } },
        { id: 'q', type: 'paragraph', props: { text: 'Plain **stays**' } },
      ],
    } as FormSchema
    const wrapper = mount(FormsGenForm, { props: { schema } })
    const rich = wrapper.get('.fg-rich-text')
    expect(rich.html()).toContain('<strong>this</strong> &lt;i&gt;x&lt;/i&gt;')
    expect(rich.get('a.fg-link').attributes('href')).toBe('/terms')
    expect(rich.findAll('ul > li')).toHaveLength(2)
    expect(rich.get('li em').text()).toBe('Fast')
    expect(wrapper.findAll('p.fg-paragraph').at(-1)!.text()).toBe('Plain **stays**')
  })
})
