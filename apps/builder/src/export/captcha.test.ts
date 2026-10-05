import { TURNSTILE_SCRIPT, parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from './css'
import { sampleServerReadme } from './submitServer'
import { getTarget } from './targets'

const KEY = '1x00000000000000000000AA'
const tree: ElementNode[] = [{ id: 'n', type: 'text', name: 'name', props: { label: 'Name' } }]
const schemaOf = (captcha: boolean) => {
  const r = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'spam', locale: 'ar', dir: 'rtl', submit: { url: 'https://example.com/s' }, ...(captcha ? { captcha: { provider: 'turnstile', siteKey: KEY } } : {}) },
    tree,
  })
  if (!r.ok) throw new Error(r.errors.join())
  return r.schema
}
const out = (target: string, captcha = true): string =>
  getTarget(target)!.generate({ schema: schemaOf(captcha), css: getCssAdapter('vanilla') }).map((f) => f.content).join('\n')

describe('spam check (Turnstile) in the exports', () => {
  it('every target loads the widget with the site key and the form language', () => {
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      const code = out(target)
      expect(code, target).toContain(TURNSTILE_SCRIPT)
      // (Blazor: inside a C# verbatim string, quotes doubled)
      expect(code, target).toContain(target === 'blazor' ? `""${KEY}"", ""ar""` : `"${KEY}", "ar"`)
      expect(code, target).toContain('function fgCaptchaReset(el')
      expect(code, target).toContain('id="fg_captcha_hint"')
      expect(code, target).toContain('يمكن إرسال النموذج بعد اجتياز التحقق أعلاه.')
      expect(out(target, false), target).not.toContain('turnstile')
    }
  })

  it('submit waits for a token, which goes with the answers once', () => {
    const vue = out('vue-standalone')
    expect(vue).toContain(`:disabled="fgCaptchaToken === ''"`)
    expect(vue).toContain(`data["cf-turnstile-response"] = fgCaptchaToken.value\n  // A token works once`)
    const react = out('react')
    expect(react).toContain(`disabled={fgCaptchaToken === ''}`)
    expect(react).toContain('data["cf-turnstile-response"] = fgCaptchaToken')
    const html = out('html')
    expect(html).toContain('data["cf-turnstile-response"] = fgCaptchaToken')
    expect(html).toContain("button.disabled = waiting\n")
    const razor = out('blazor')
    expect(razor).toContain(`disabled='@(fgCaptchaToken == "")'`)
    expect(razor).toContain('payload["cf-turnstile-response"] = fgCaptchaToken;')
    expect(razor).toContain('public void FgCaptchaToken(string token, bool failed)')
    expect(razor).toContain('await FgJs.InvokeVoidAsync("fgCaptchaWire", fgCaptchaEl, fgSelf);')
  })

  it("the sample server's README explains TURNSTILE_SECRET when the form has a check", () => {
    expect(sampleServerReadme(schemaOf(true))).toContain('TURNSTILE_SECRET=your-secret-key node server/server.mjs')
    expect(sampleServerReadme(schemaOf(false))).not.toContain('TURNSTILE_SECRET')
  })
})
