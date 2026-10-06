import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { firstFieldError } from './files'
import { MESSAGES } from './messages'
import type { ElementNode } from './schema'
import FormsGenForm from './components/FormsGenForm.vue'
import { cleanRichText, richPlainText } from './richAnswer'
import type { FormSchema } from './schema'

const RICH_CASES: [string, string][] = [
  ['<b>bold</b> and <i>it</i> and <u>u</u> and <s>s</s>', '<strong>bold</strong> and <em>it</em> and <u>u</u> and <s>s</s>'],
  ['<div>one</div><div><br></div><div>two</div>', '<p>one</p><p><br></p><p>two</p>'],
  ['<p>a<div>nested</div>b</p>', 'a<p>nested</p>b'],
  ['Hi<div><ul><li>one</li></ul><div>my <b>site</b></div></div>', 'Hi<ul><li>one</li></ul><p>my <strong>site</strong></p>'],
  ['<ul><li>x</li><li><b>y</b></li></ul><ol><li>1</li></ol>', '<ul><li>x</li><li><strong>y</strong></li></ul><ol><li>1</li></ol>'],
  ['<a href="https://x.org/a?b=1&amp;c=2" target="_blank" style="color:red">link</a>', '<a href="https://x.org/a?b=1&amp;c=2">link</a>'],
  ['<a href="mailto:a@b.c">mail</a> <a href="javascript:alert(1)">bad</a> <a href="/rel">rel</a>', '<a href="mailto:a@b.c">mail</a> bad rel'],
  ['<span style="font-weight:bold" onclick="x()">plain</span><font color="red">f</font>', 'plainf'],
  ['<script>alert(1)</script>ok<style>p{}</style><img src=x onerror=alert(1)>', 'ok'],
  ['<h1>Title</h1><table><tr><td>cell</td></tr></table>', 'Titlecell'],
  ['1 &lt; 2 &amp;&amp; "q"&nbsp;x', '1 &lt; 2 &amp;&amp; "q" x'],
  ['<p><br></p><div> </div>', ''],
  ['<ul><li></li></ul>', '<ul><li></li></ul>'],
  ['<iframe src="https://x.example">fallback</iframe>after', 'after'],
]

describe('rich-text answers', () => {
  it('are reduced to a small canonical HTML', () => {
    for (const [input, expected] of RICH_CASES) expect(cleanRichText(input), input).toBe(expected)
    expect(cleanRichText(null)).toBe('')
    expect(cleanRichText('   ')).toBe('')
  })

  it('read as plain text in answers', () => {
    expect(richPlainText('<p>Hello <strong>Ana</strong></p><ul><li>a &amp; b</li><li>c</li></ul>')).toBe('Hello Ana a & b c')
  })
})

describe('<FormsGenForm> with a rich-text field', () => {
  const schema: FormSchema = {
    $schema: 'formsgen/v2',
    meta: { name: 'rt', locale: 'en', dir: 'ltr' },
    tree: [
      { id: 'r', type: 'richtext', name: 'about', props: { label: 'About you' }, validation: [{ rule: 'required' }] },
      { id: 'h', type: 'paragraph', props: { text: 'You wrote: {about|nothing}' } },
    ],
  }

  it('an editor with a labelled toolbar; the value is the cleaned HTML', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    const editor = wrapper.get('[data-fg-richtext]')
    expect(editor.attributes()).toMatchObject({ role: 'textbox', 'aria-multiline': 'true', contenteditable: 'true', 'aria-required': 'true' })
    expect(wrapper.get(`#${editor.attributes('aria-labelledby')}`).text()).toBe('About you')
    expect(wrapper.get('[role=toolbar]').attributes('aria-label')).toBe('Formatting')
    expect(wrapper.findAll('[data-fg-rt-cmd]').map((b) => b.attributes('aria-label'))).toEqual(['Bold', 'Italic', 'Bulleted list', 'Numbered list', 'Link'])
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('This field is required')
    editor.element.innerHTML = '<div>Hi <b>there</b></div><script>x()</script>'
    await editor.trigger('input')
    await flushPromises()
    expect(wrapper.text()).toContain('You wrote: Hi there')
    await wrapper.get('form').trigger('submit')
    expect((wrapper.emitted('submit')!.at(-1) as [Record<string, unknown>])[0]['about']).toBe('<p>Hi <strong>there</strong></p>')
    wrapper.unmount()
  })

  it('a value set from outside shows in the editor', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema, modelValue: { about: '<p>Saved <em>text</em></p><img src=x onerror=1>' } }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.get('[data-fg-richtext]').element.innerHTML).toBe('<p>Saved <em>text</em></p>')
    wrapper.unmount()
  })

  it('length rules judge the visible text, not the markup', () => {
    const node = { id: 'r', type: 'richtext', name: 'r', props: {}, validation: [{ rule: 'max', value: 6 }, { rule: 'min', value: 2 }] } as ElementNode
    expect(firstFieldError(node, '<p><strong>Hi</strong> all</p>', () => undefined, MESSAGES.en)).toBeNull()
    expect(firstFieldError(node, '<p><strong>Hello</strong> world</p>', () => undefined, MESSAGES.en)).toContain('6')
    expect(firstFieldError(node, '<ul><li>a</li></ul>', () => undefined, MESSAGES.en)).toContain('2')
  })
})
