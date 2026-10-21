// After submit (meta.afterSubmit) in every code target: the thank-you block
// that replaces the form, the redirect that wins over it, the order against
// a saved draft, and the answer helpers a piped message needs.
import { parseFormSchema, type ElementNode, type FormSchema } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from '../css'
import { getTarget } from './index'

function schema(tree: ElementNode[], meta: Record<string, unknown> = {}): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'x', locale: 'en', dir: 'ltr', ...meta }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter('vanilla') })
    .map((f) => f.content)
    .join('\n')

const tree: ElementNode[] = [
  { id: 'n', type: 'text', name: 'full_name', props: { label: 'Full name' } },
  { id: 'g', type: 'toggle', name: 'agree', props: { label: 'Agree' } },
]
const posting = { submit: { url: 'https://example.com/submit', method: 'POST' } }
const SENT_RULE = '[data-fg-sent] > :not([data-fg-thanks]) { display: none; }'
const TARGETS = ['html', 'react', 'vue-standalone', 'blazor', 'vue-lib']

describe('a thank-you message after submit', () => {
  const s = schema(tree, { ...posting, afterSubmit: { message: 'Thanks, {full_name}!' } })

  it('html: the block, the rule that hides the rest, the way back, and the reset it needs', () => {
    const html = out('html', s)
    expect(html).toContain(`<style>${SENT_RULE}</style>`)
    expect(html).toContain('role="status" data-fg-thanks hidden')
    expect(html).toContain('<span data-fg-answer="full_name"')
    expect(html).toContain('data-fg-again>Send another response</button>')
    expect(html).toContain("form.setAttribute('data-fg-sent', '')")
    expect(html).toContain('.then(function (response) { if (response.ok) fgAfterSubmit() })')
    expect(html).toContain('function fgResetForm() {')
    expect(html).toContain('[data-fg-again]')
  })

  it('react: state, the block inside the form, and a reset even without a reset button', () => {
    const tsx = out('react', s)
    expect(tsx).toContain('const [fgSent, setFgSent] = useState(false)')
    expect(tsx).toContain("data-fg-sent={fgSent ? '' : undefined}")
    expect(tsx).toContain(`<style>{${JSON.stringify(SENT_RULE)}}</style>`)
    expect(tsx).toContain('{fgSent && (')
    expect(tsx).toContain('fgOr(fgAnswer(form.full_name')
    expect(tsx).toContain('onClick={fgSendAnother}')
    expect(tsx).toContain('function fgReset(): void')
    expect(tsx).toContain('.then((response) => { if (response.ok) fgAfterSubmit() })')
  })

  it('vue: the same with a scoped rule', () => {
    const vue = out('vue-standalone', s)
    expect(vue).toContain('const fgSent = ref(false)')
    expect(vue).toContain(`:data-fg-sent="fgSent ? '' : undefined"`)
    expect(vue).toContain('<div v-if="fgSent"')
    expect(vue).toContain('fgOr(fgAnswer(form.full_name')
    expect(vue).toContain('@click="fgSendAnother"')
    expect(vue).toContain('function fgReset(): void')
    expect(vue).toContain('if (response.ok) fgAfterSubmit()')
    expect(vue).toContain('<style scoped>')
    expect(vue).toContain(`${SENT_RULE}\n</style>`)
  })

  it('blazor: the field, the block, the attribute on the root and the success check', () => {
    const razor = out('blazor', s)
    expect(razor).toContain('private bool fgSent;')
    expect(razor).toContain('@if (fgSent)')
    expect(razor).toContain('data-fg-sent="@(fgSent ? "" : null)"')
    expect(razor).toContain(`<style>${SENT_RULE}</style>`)
    expect(razor).toMatch(/FgOr\(FgAnswer\(Model\.Full_?[Nn]ame/)
    expect(razor).toContain('@onclick="FgSendAnother"')
    expect(razor).toContain('private async Task FgReset()')
    expect(razor).toContain('if (response.IsSuccessStatusCode) FgAfterSubmit();')
    expect(razor).not.toContain('NavigationManager')
  })

  it('vue-lib: the host tells the renderer, which shows the thank-you', () => {
    const host = out('vue-lib', s)
    expect(host).toContain('const sent = ref(false)')
    expect(host).toContain('sent.value = true')
    expect(host).toContain(':sent="sent"')
    expect(host).toContain('@again="sent = false"')
  })

  it('vue, Tailwind flavour: the scoped block holds the rule alone (no stylesheet, no "undefined")', () => {
    const vue = getTarget('vue-standalone')!
      .generate({ schema: s, css: getCssAdapter('tailwind') })
      .map((f) => f.content)
      .join('\n')
    expect(vue).toContain(`<style scoped>\n${SENT_RULE}\n</style>`)
    expect(vue).not.toContain('undefined[')
  })

  it('needs the answer helpers even when no label pipes an answer', () => {
    expect(out('react', s)).toContain('function fgOr(')
    expect(out('vue-standalone', s)).toContain('function fgOr(')
    expect(out('blazor', s)).toContain('FgOr(')
    expect(out('html', s)).toContain('data-fg-answer')
  })
})

describe('a redirect after submit', () => {
  const s = schema(tree, { ...posting, afterSubmit: { redirectUrl: '/done', message: 'ignored: the redirect wins' } })

  it('every target goes to the address and shows no thank-you', () => {
    expect(out('html', s)).toContain('window.location.assign("/done")')
    expect(out('react', s)).toContain('window.location.assign("/done")')
    expect(out('vue-standalone', s)).toContain('window.location.assign("/done")')
    expect(out('vue-lib', s)).toContain('window.location.assign("/done")')
    const razor = out('blazor', s)
    expect(razor).toContain('@inject Microsoft.AspNetCore.Components.NavigationManager FgNav')
    expect(razor).toContain('FgNav.NavigateTo("/done", forceLoad: true)')
    for (const target of TARGETS) expect(out(target, s), target).not.toContain('data-fg-thanks')
  })
})

describe('after submit with the rest', () => {
  it('a saved draft goes first, then what comes after', () => {
    const s = schema(tree, { ...posting, saveDraft: true, afterSubmit: { message: 'Thanks' } })
    expect(out('html', s)).toContain('.then(function (response) { if (response.ok) { fgDraftForget(); fgAfterSubmit() } })')
    expect(out('react', s)).toContain('.then((response) => { if (response.ok) { fgDraftForget(form); fgAfterSubmit() } })')
    expect(out('vue-standalone', s)).toContain('if (response.ok) fgDraftForget()\n      if (response.ok) fgAfterSubmit()')
    expect(out('blazor', s)).toContain('if (response.IsSuccessStatusCode) await FgDraftForget();\n        if (response.IsSuccessStatusCode) FgAfterSubmit();')
  })

  it('without a submit address, passing validation is the success', () => {
    const s = schema(tree, { afterSubmit: { message: 'Thanks' } })
    expect(out('html', s)).toContain("console.log('Form submitted', data)\n      fgAfterSubmit()")
    expect(out('react', s)).toContain('onSubmit?.(data)\n    fgAfterSubmit()')
    expect(out('vue-standalone', s)).toContain("emit('submit', data)\n  fgAfterSubmit()")
    expect(out('blazor', s)).toContain('FgAfterSubmit();')
  })

  it('nothing is emitted when nothing is configured', () => {
    const s = schema(tree, posting)
    for (const target of TARGETS) expect(out(target, s), target).not.toMatch(/fgAfterSubmit|FgAfterSubmit|data-fg-thanks|fgSent|sent\.value/)
  })
})
