import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import type { FormSchema } from './schema'
import { htmlText, parseSafeHtml, safeStyle, type HtmlNode } from './safeHtml'

/** Writes the tree back as HTML (for readable expectations). */
function out(nodes: HtmlNode[]): string {
  const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return nodes
    .map((n) =>
      n.t === 'text'
        ? esc(n.v)
        : `<${n.tag}${n.attrs.map(([k, v]) => ` ${k}="${esc(v)}"`).join('')}>${['br', 'hr', 'img'].includes(n.tag) ? '' : `${out(n.c)}</${n.tag}>`}`,
    )
    .join('')
}
const clean = (html: string): string => out(parseSafeHtml(html))

describe('parseSafeHtml', () => {
  it('decodes every named entity the browser knows; unknown names stay as typed', () => {
    expect(clean('<p>&eacute;&Eacute; &copy; &hellip; &#169; &foo; &AMP;</p>')).toBe('<p>éÉ © … © &amp;foo; &amp;</p>')
  })

  it('keeps ordinary markup, attributes and entities', () => {
    expect(clean('<h3 class="x">Hours</h3><p>Mon&ndash;Fri <b>9&amp;5</b><br/>Sat: <i>closed</i></p>')).toBe(
      '<h3 class="x">Hours</h3><p>Mon–Fri <b>9&amp;5</b><br>Sat: <i>closed</i></p>',
    )
    expect(clean('<table><tr><th scope="col">A</th><td colspan="2">B</td></tr></table>')).toBe(
      '<table><tr><th scope="col">A</th><td colspan="2">B</td></tr></table>',
    )
    expect(clean('<a href="https://x.org" target="_blank">x</a><img src="/logo.png" alt="Logo" width="40">')).toBe(
      '<a href="https://x.org" target="_blank" rel="noopener noreferrer">x</a><img src="/logo.png" alt="Logo" width="40">',
    )
  })

  it('closes what the author left open, and ignores stray closing tags', () => {
    expect(clean('<ul><li>one<li>two</ul></div><p>a<p>b')).toBe('<ul><li>one</li><li>two</li></ul><p>a</p><p>b</p>')
  })

  it('removes scripts, handlers, unsafe URLs and dangerous elements', () => {
    const vectors: [string, string][] = [
      ['<script>alert(1)</script>ok', 'ok'],
      ['<img src=x onerror=alert(1)>', '<img src="x">'],
      ['<a href="javascript:alert(1)">x</a>', '<a>x</a>'],
      ['<a href="&#106;avascript:alert(1)">x</a>', '<a>x</a>'],
      ['<a href="java\tscript:alert(1)">x</a>', '<a>x</a>'],
      ['<a href="data:text/html,<script>alert(1)</script>">x</a>', '<a>x</a>'],
      ['<svg onload=alert(1)><circle/></svg>after', 'after'],
      ['<iframe src="http://plain"></iframe>after', 'after'],
      ['<iframe src="javascript:alert(1)"></iframe>after', 'after'],
      ['<iframe srcdoc="<script>x</script>"></iframe>after', 'after'],
      ['<style>body{display:none}</style>after', 'after'],
      // The broken tag goes; what is left is plain (escaped) text.
      ['<scr<script>ipt>alert(1)</script>', 'ipt&gt;alert(1)'],
      ['<div style="background:url(javascript:alert(1)); color: red">x</div>', '<div style="color: red">x</div>'],
      ['<p id="fg_name" onclick="x()">x</p>', '<p>x</p>'],
      ['<form action="/steal"><input name="pw"><button>Go</button></form>after', 'after'],
      ['<!-- <script>alert(1)</script> -->ok', 'ok'],
      ['<embed src="x.swf">after', 'after'],
      ['<custom-el>kept text</custom-el>', 'kept text'],
      ['<p>1 < 2 &lt;b&gt;</p>', '<p>1 &lt; 2 &lt;b&gt;</p>'],
      ['<a href="https://a"><a href="https://b">inner</a></a>', '<a href="https://a"></a><a href="https://b">inner</a>'],
    ]
    for (const [input, expected] of vectors) expect(clean(input), input).toBe(expected)
  })

  it('keeps https iframes, always sandboxed, lazy and with a strict referrer', () => {
    const sandbox = 'sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin" loading="lazy"'
    expect(clean('<iframe src="https://www.youtube.com/embed/x" width="560" height="315" title="Video" allow="autoplay; encrypted-media; camera; geolocation" allowfullscreen>old browsers</iframe>after')).toBe(
      `<iframe src="https://www.youtube.com/embed/x" width="560" height="315" title="Video" allow="autoplay; encrypted-media" allowfullscreen="" ${sandbox}></iframe>after`,
    )
    // The author's own sandbox, referrer and handlers never survive.
    expect(clean('<iframe src="https://maps.example/x" sandbox="allow-top-navigation allow-popups" referrerpolicy="unsafe-url" onload="x()" style="border:0"></iframe>')).toBe(
      `<iframe src="https://maps.example/x" style="border: 0" ${sandbox}></iframe>`,
    )
    expect(clean('<iframe></iframe><iframe src="//x.example"></iframe>ok')).toBe('ok')
  })

  it('filters inline styles and reads the text back', () => {
    expect(safeStyle('color:red; position: fixed ; background-image:url(x); width:expression(1); @import x; --x: 1')).toBe(
      'color: red; position: fixed',
    )
    expect(htmlText(parseSafeHtml('<p>Hi <b>there</b></p><script>x</script>'))).toBe('Hi there')
  })
})

describe('<FormsGenForm> with an HTML block', () => {
  it('renders the allowed markup as elements and nothing else', () => {
    const schema = {
      $schema: 'formsgen/v2',
      meta: { name: 'f', locale: 'en', dir: 'ltr' },
      tree: [
        {
          id: 'h',
          type: 'html',
          props: {
            html: '<h4>Hours</h4><table><tr><td style="color: red">Mon</td><td>9–5</td></tr></table><img src=x onerror="window.hit=1"><script>window.hit=1</script><a href="javascript:x" onclick="x">no</a>',
          },
        },
      ],
    } as FormSchema
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    const block = wrapper.get('.fg-html')
    expect(block.get('h4').text()).toBe('Hours')
    expect(block.get('td').attributes('style')).toBe('color: red;')
    expect(block.get('img').attributes()).toEqual({ src: 'x' })
    expect(block.get('a').attributes()).toEqual({})
    expect(block.find('script').exists()).toBe(false)
    expect((window as { hit?: number }).hit).toBeUndefined()
    wrapper.unmount()
  })
})
