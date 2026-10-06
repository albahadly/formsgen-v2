import { cleanRichText, parseFormSchema, richPlainText, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from './css'
import { richTextRuntime } from './richAnswer'
import { getTarget } from './targets'

// Editor HTML is the browser's own serialization (well formed); malformed
// nesting like <p><div> is repaired differently by browsers and the renderer.
const INPUTS = [
  '<b>bold</b> and <i>it</i> and <u>u</u> and <s>s</s> and <strike>st</strike>',
  '<div>one</div><div><br></div><div>two</div>',
  '<ul><li>x</li><li><b>y</b></li></ul><ol><li>1</li></ol>',
  '<a href="https://x.org/a?b=1&amp;c=2" target="_blank" style="color:red">link</a>',
  '<a href="mailto:a@b.c">mail</a> <a href="javascript:alert(1)">bad</a> <a href="/rel">rel</a>',
  '<span style="font-weight:bold" onclick="x()">plain</span><font color="red">f</font>',
  '<script>alert(1)</script>ok<style>p{}</style><img src=x onerror=alert(1)>',
  '<h1>Title</h1><table><tr><td>cell</td></tr></table>',
  '1 &lt; 2 &amp;&amp; "q"&nbsp;x',
  '<p><br></p><div> </div>',
  '<ul><li></li></ul>',
  'Hi<div><ul><li>one</li></ul><div>my <b>site</b></div></div>',
  '<div>a<div>b</div>c</div>',
  '<iframe src="https://x.example">fallback</iframe>after',
  '<!-- note -->Hi<br>there',
  'Plain text with a "quote" & an <unknown>tag</unknown>',
  '&eacute; &Eacute; &copy; &hellip; &#169; &foo; &AMP; <b>&ndash;</b>',
]

describe('rich text in the exports', () => {
  const run = new Function(`${richTextRuntime('Link?', false)}\nreturn { clean: fgRichClean, plain: fgRichPlain }`)() as {
    clean: (html: unknown) => string
    plain: (html: unknown) => string
  }

  it('the script cleaner gives exactly what the renderer gives', () => {
    for (const input of INPUTS) expect(run.clean(input), input).toBe(cleanRichText(input))
    expect(run.clean(null)).toBe('')
    expect(run.plain('<p>Hello <strong>Ana</strong></p><ul><li>a &amp; b</li></ul>')).toBe(richPlainText('<p>Hello <strong>Ana</strong></p><ul><li>a &amp; b</li></ul>'))
  })

  const tree: ElementNode[] = [
    { id: 'r', type: 'richtext', name: 'about', props: { label: 'About' }, validation: [{ rule: 'required' }] },
    { id: 'p', type: 'paragraph', props: { text: 'Wrote: {about|nothing}' } },
  ]
  const schema = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'rt', locale: 'en', dir: 'ltr' }, tree })
  if (!schema.ok) throw new Error(schema.errors.join())
  const out = (target: string): string => getTarget(target)!.generate({ schema: schema.schema, css: getCssAdapter('vanilla') }).map((f) => f.content).join('\n')

  it('every target has the toolbar, the editor and its label', () => {
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      const code = out(target)
      expect(code, target).toMatch(/role="toolbar" aria-label="Formatting" aria-controls="fg_about"/)
      expect(code, target).toMatch(/<div id="fg_about" [^>]*role="textbox" aria-multiline="true" aria-labelledby="fg_about_label" aria-required="true"/)
      expect(code, target).toContain('<span id="fg_about_label">About</span>')
      expect(code, target).toContain('data-fg-rt-cmd="insertOrderedList"')
      expect(code, target).toContain('function fgRichClean(')
      // One tab stop per toolbar (React takes tabIndex as a number).
      expect(code, target).toContain(target === 'react' ? 'data-fg-rt-cmd="bold" tabIndex={0}' : 'data-fg-rt-cmd="bold" tabindex="0"')
      expect(code, target).toContain(target === 'react' ? 'data-fg-rt-cmd="link" tabIndex={-1}' : 'data-fg-rt-cmd="link" tabindex="-1"')
    }
    expect(out('react')).toContain('contentEditable role="textbox"')
    expect(out('html')).toContain('data-fg-path="about" data-fg-kind="richtext"')
    const razor = out('blazor')
    expect(razor).toContain(`data-fg-richtext='@FgRichKey("About", v => Model.About = v, Model.About)'`)
    expect(razor).toContain('public void FgRichChanged(string key, string html)')
    // Entries of editors no longer rendered go after each render.
    expect(razor).toContain('fgRichSeen[key] = fgRenderGen')
    expect(razor).toContain('foreach (var key in fgRich.Keys.Where(key => !fgRichSeen.TryGetValue(key, out var seen) || seen != fgRenderGen).ToList()) { fgRich.Remove(key); fgRichSeen.Remove(key); }')
    expect(razor).toContain('@(FgOr(FgRichPlain(Model.About), "nothing"))')
    expect(out('vue-standalone')).toContain(`{{ fgOr(fgRichPlain(form.about), 'nothing') }}`)
  })

  it('the script moves the toolbar tab stop with the arrow keys, following the writing direction', () => {
    const wire = new Function(`${richTextRuntime('Link?', false)}\nreturn fgWireRichText`)() as (root: HTMLElement, onChange: () => void) => void
    const root = document.createElement('form')
    root.setAttribute('dir', 'rtl')
    root.innerHTML = `<div data-fg-rich><div role="toolbar">${['bold', 'italic', 'insertUnorderedList', 'insertOrderedList', 'link']
      .map((c, i) => `<button type="button" data-fg-rt-cmd="${c}" tabindex="${i === 0 ? 0 : -1}">${c}</button>`)
      .join('')}</div><div data-fg-richtext contenteditable="true"></div></div>`
    document.body.appendChild(root)
    wire(root, () => {})
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-fg-rt-cmd]')]
    const press = (button: HTMLElement, key: string): void => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    }
    buttons[0]!.focus()
    press(buttons[0]!, 'ArrowLeft') // rtl: forward
    expect(document.activeElement).toBe(buttons[1])
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1', '-1'])
    press(buttons[1]!, 'End')
    expect(document.activeElement).toBe(buttons[4])
    press(buttons[4]!, 'ArrowRight') // rtl: back
    expect(document.activeElement).toBe(buttons[3])
    press(buttons[3]!, 'Home')
    expect(document.activeElement).toBe(buttons[0])
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1'])
    root.remove()
  })

  it('length rules judge the visible text in every language', () => {
    const limited = parseFormSchema({
      $schema: 'formsgen/v2',
      meta: { name: 'rt', locale: 'en', dir: 'ltr' },
      tree: [{ id: 'r', type: 'richtext', name: 'about', props: { label: 'About' }, validation: [{ rule: 'max', value: 20 }] }],
    })
    if (!limited.ok) throw new Error(limited.errors.join())
    const gen = (target: string): string => getTarget(target)!.generate({ schema: limited.schema, css: getCssAdapter('vanilla') }).map((f) => f.content).join('\n')
    expect(gen('html')).toContain('(fgSize(fgRichPlain(v)) ?? Infinity) > 20')
    expect(gen('vue-standalone')).toContain('(fgSize(fgRichPlain(v)) ?? Infinity) > 20')
    const razor = gen('blazor')
    expect(razor).toContain('FgRichPlain(About).Length > 20')
    expect(razor.match(/private static string FgRichPlain/g)).toHaveLength(1)
  })
})
