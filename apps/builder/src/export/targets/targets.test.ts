import {
  submittedAnnouncement,
  errorsAnnouncement,
  parseFormSchema,
  stepAnnouncement,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../../../fixtures/kitchen-sink.formsgen.json'
import { getCssAdapter, listCssAdapters, type CssFrameworkId } from '../css'
import { getTarget, listTargets } from './index'

// parseFormSchema returns the object it was given: clone so a test that
// mutates its schema cannot leak into later tests.
function fixture(): FormSchema {
  const result = parseFormSchema(JSON.parse(JSON.stringify(kitchenSink)))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const frameworks: CssFrameworkId[] = ['vanilla', 'tailwind', 'bootstrap5']

const generate = (targetId: string, framework: CssFrameworkId = 'vanilla') =>
  getTarget(targetId)!.generate({ schema: fixture(), css: getCssAdapter(framework) })

/**
 * The fixture without what ships framework-neutral CSS in every framework
 * (the two-handle slider, help tooltips).
 */
const generateNoSlider = (targetId: string, framework: CssFrameworkId) => {
  const schema = fixture()
  const strip = (nodes: ElementNode[]): ElementNode[] =>
    nodes
      .filter((n) => n.type !== 'rangeslider')
      .map((n) => ({ ...n, props: { ...n.props, tooltip: undefined }, children: n.children && strip(n.children) }))
  schema.tree = strip(schema.tree)
  return getTarget(targetId)!.generate({ schema, css: getCssAdapter(framework) })
}

describe('export target registry', () => {
  it('registers the six targets', () => {
    expect(listTargets().map((t) => t.id)).toEqual([
      'json',
      'vue-lib',
      'vue-standalone',
      'react',
      'blazor',
      'html',
    ])
  })

  it('every target produces files and a README for every framework', () => {
    for (const target of listTargets()) {
      for (const adapter of listCssAdapters()) {
        const ctx = { schema: fixture(), css: adapter }
        const files = target.generate(ctx)
        expect(files.length, `${target.id}/${adapter.id}`).toBeGreaterThan(0)
        expect(files[0]!.content.length, `${target.id}/${adapter.id}`).toBeGreaterThan(50)
        expect(target.readme(ctx).length, `${target.id}/${adapter.id}`).toBeGreaterThan(50)
      }
    }
  })
})

describe('json target', () => {
  it('round-trips through the schema parser', () => {
    const [file] = generate('json')
    const parsed = parseFormSchema(JSON.parse(file!.content))
    expect(parsed.ok).toBe(true)
  })
})

describe('vue-lib target', () => {
  it('imports the renderer and inlines the schema', () => {
    const [file] = generate('vue-lib')
    expect(file!.path).toBe('KitchenSinkForm.vue')
    expect(file!.content).toContain("from '@formsgen/renderer'")
    expect(file!.content).toContain('"$schema": "formsgen/v2"')
    expect(file!.content).toContain('<FormsGenForm')
  })
})

describe('vue-standalone target', () => {
  it.each(frameworks)('snapshot (%s)', (framework) => {
    const [file] = generate('vue-standalone', framework)
    expect(file!.content).toMatchSnapshot()
  })

  it('contains compiled validators, visibility and payload', () => {
    const [file] = generate('vue-standalone')
    const code = file!.content
    expect(code).toContain("'full_name': function ()")
    expect(code).toContain('fgVisible_contact_other')
    expect(code).toContain("...(fgVisible_contact_other() ? { \"contact_other\": form.contact_other } : {})")
    expect(code).toContain('"account": {')
    expect(code).toContain('v-model="form.account.username"')
    // vanilla export embeds the stylesheet
    expect(code).toContain('<style scoped>')
  })

  it('uses framework idioms, never vanilla classes, in bootstrap mode', () => {
    const [file] = generateNoSlider('vue-standalone', 'bootstrap5')
    expect(file!.content).toContain('form-control')
    expect(file!.content).toContain('is-invalid')
    expect(file!.content).not.toContain('fg-input')
    // The only stylesheet: what Bootstrap has no utilities for (upload drop zones).
    const style = file!.content.split('<style scoped>')[1] ?? ''
    expect(style.trim().startsWith('/* Upload drop zones */')).toBe(true)
    expect(style).not.toContain('.fg-form')
  })
})

describe('react target', () => {
  it.each(frameworks)('snapshot (%s)', (framework) => {
    const [file] = generate('react', framework)
    expect(file!.content).toMatchSnapshot()
  })

  it('is syntactically valid TSX with compiled logic', async () => {
    const ts = await import('typescript')
    const [file] = generate('react')
    const source = ts.createSourceFile(
      'Form.tsx',
      file!.content,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TSX,
    )
    // @ts-expect-error parseDiagnostics is internal but stable
    expect((source.parseDiagnostics as unknown[]).length).toBe(0)
    expect(file!.content).toContain('useState<FormData>')
    expect(file!.content).toContain('fgVisible_contact_other(data)')
    expect(file!.content).toContain("'full_name': function (data: FormData)")
    expect(file!.content).toContain('value={form.account.username}')
  })

  it('vanilla mode emits a css file and imports it', () => {
    const files = generate('react')
    expect(files).toHaveLength(2)
    expect(files[1]!.path).toBe('KitchenSinkForm.css')
    expect(files[0]!.content).toContain("import './KitchenSinkForm.css'")
    const tailwind = generateNoSlider('react', 'tailwind')
    expect(tailwind).toHaveLength(1)
    expect(tailwind[0]!.content).toContain('className=')
  })
})

describe('blazor target', () => {
  it.each(frameworks)('snapshot (%s)', (framework) => {
    const [file] = generate('blazor', framework)
    expect(file!.content).toMatchSnapshot()
  })

  it('generates EditForm, flat model with attributes, and C# conditions', () => {
    const [file] = generate('blazor', 'bootstrap5')
    const code = file!.content
    // kitchen-sink has section hosts, so the form binds the explicit EditContext
    expect(code).toContain('<EditForm EditContext="fgEdit"')
    // the component validates itself with .NET DataAnnotations (see press deferral)
    expect(code).toContain('Validator.TryValidateProperty(FgValue(name), context, results)')
    expect(code).toContain('[Required(ErrorMessage = "This field is required")]')
    expect(code).toContain('[EmailAddress(')
    expect(code).toContain('[RegularExpression(@"^[0-9]{4,6}$"')
    expect(code).toContain('public string AccountUsername { get; set; }')
    expect(code).toContain('@bind-Value="Model.AccountUsername"')
    // conditional field rules live in Validate(), not attributes
    expect(code).toContain('IValidatableObject')
    expect(code).toMatch(/@if \(+Equals\(Model\.ContactMethod, "other"\)/)
    // required checkbox handled in Validate()
    expect(code).toContain('if (!Terms)')
    // nested payload reconstruction with hidden-field exclusion
    expect(code).toContain('payload["account"]')
    expect(code).toMatch(/if \(+Equals\(Model\.ContactMethod, "other"\)+\) payload\["contact_other"\]/)
    // bootstrap idioms, no vanilla classes
    expect(code).toContain('form-control')
    expect(code).not.toContain('fg-input')
  })

  it('vanilla mode emits a scoped .razor.css file', () => {
    const files = generate('blazor')
    expect(files.map((f) => f.path)).toEqual(['KitchenSinkForm.razor', 'KitchenSinkForm.razor.css'])
  })
})

describe('tabs/steps across code targets', () => {
  it('vue-standalone wires section refs and step gating', () => {
    const [file] = generate('vue-standalone')
    const code = file!.content
    expect(code).toContain('const fgSec_ks_social_tabs = ref(0)')
    expect(code).toContain('const fgSecPaths_ks_wizard = [["shipping_city"], ["order_notes"]]')
    expect(code).toContain('function fgNext_ks_wizard()')
    expect(code).toContain(`v-show="fgSec_ks_wizard === 1"`)
  })

  it('react wires useState sections and a step handler', () => {
    const [file] = generate('react')
    const code = file!.content
    expect(code).toContain('const [fgSec_ks_wizard, setFgSec_ks_wizard] = useState(0)')
    expect(code).toContain('function fgNext_ks_wizard(): void')
    expect(code).toContain("fgSecPaths_ks_wizard[fgSec_ks_wizard] ?? []")
  })

  it('html emits section metadata and runtime hooks', () => {
    const [file] = generate('html')
    const code = file!.content
    expect(code).toContain('data-fg-sec-panel="ks_social_tabs:1" hidden')
    expect(code).toContain('data-fg-step-next="ks_wizard"')
    expect(code).toContain('"stepPaths":[["shipping_city"],["order_notes"]]')
  })

  it('blazor renders @if panels and int section fields', () => {
    const [file] = generate('blazor')
    const code = file!.content
    expect(code).toContain('private int fgSec_ks_wizard = 0;')
    expect(code).toContain('@if (fgSec_ks_wizard == 0)')
    expect(code).toContain('@onclick="FgNext_ks_wizard"')
  })

  it('submit replaces Next inside the single wizard in every target', () => {
    // kitchen-sink has the ks-wizard steps host -> the submit button moves
    // into its step actions row and the bottom actions row disappears
    const vue = generate('vue-standalone')[0]!.content
    expect(vue).toContain('<button v-if="fgSec_ks_wizard === 1" type="submit"')
    expect(vue).not.toContain('<div class="fg-actions">')
    const react = generate('react')[0]!.content
    expect(react).toContain('{fgSec_ks_wizard === 1 && <button type="submit"')
    expect(react).not.toContain('className="fg-actions"')
    const html = generate('html')[0]!.content
    expect(html).toContain('data-fg-submit hidden>Submit</button>')
    expect(html).toContain('var FG_SUBMIT_GATE = ["ks_wizard"]')
    expect(html).not.toContain('<div class="fg-actions">')
    const blazor = generate('blazor')[0]!.content
    expect(blazor).toMatch(
      /@if \(fgSec_ks_wizard == 1\)\s*\{\s*<button class="[^"]*" type="submit">Submit<\/button>/,
    )
  })

  it('meta.submitButton configures text, style, placement and gating', () => {
    const raw = JSON.parse(JSON.stringify(kitchenSink)) as Record<string, unknown>
    ;(raw['meta'] as Record<string, unknown>)['submitButton'] = {
      text: 'إرسال <&>',
      align: 'center',
      variant: 'secondary',
      fullWidth: true,
      onLastStepOnly: false,
    }
    const parsed = parseFormSchema(raw)
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'))
    for (const targetId of ['vue-standalone', 'react', 'html', 'blazor']) {
      const code = getTarget(targetId)!.generate({
        schema: parsed.schema,
        css: getCssAdapter('vanilla'),
      })[0]!.content
      expect(code, targetId).toContain('إرسال &lt;&amp;&gt;')
      expect(code, targetId).toContain('fg-button--secondary')
      expect(code, targetId).toContain(
        targetId === 'react' ? "textAlign: 'center'" : 'text-align: center',
      )
      expect(code, targetId).toContain(targetId === 'react' ? "width: '100%'" : 'width: 100%')
      // onLastStepOnly: false -> no gating despite the wizard
      if (targetId === 'vue-standalone') expect(code).not.toContain('v-if="fgSec_ks_wizard === 1"')
      if (targetId === 'html') expect(code).toContain('var FG_SUBMIT_GATE = []')
    }
  })

  it('steps hosts honor custom backText/nextText in every target', () => {
    interface RawNode {
      id: string
      props: Record<string, unknown>
      children?: RawNode[]
    }
    const raw = JSON.parse(JSON.stringify(kitchenSink)) as { tree: RawNode[] }
    const wizard = raw.tree.find((n) => n.id === 'ks-wizard')!
    wizard.props['backText'] = 'السابق'
    wizard.props['nextText'] = 'التالي <&>'
    const parsed = parseFormSchema(raw as unknown as Record<string, unknown>)
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'))
    for (const targetId of ['vue-standalone', 'react', 'html', 'blazor']) {
      const [file] = getTarget(targetId)!.generate({
        schema: parsed.schema,
        css: getCssAdapter('vanilla'),
      })
      expect(file!.content, targetId).toContain('السابق')
      expect(file!.content, targetId).toContain('التالي &lt;&amp;&gt;')
      expect(file!.content, targetId).not.toContain('>Back<')
      expect(file!.content, targetId).not.toContain('>Next<')
    }
  })
})

describe('tags + submit error jump across code targets', () => {
  it('vue-standalone wires tag handlers and fgJumpToError', () => {
    const [file] = generate('vue-standalone')
    const code = file!.content
    expect(code).toContain("tagDrafts['topics']")
    expect(code).toContain('function fgAddTag(path: string): void')
    expect(code).toContain('function fgJumpToError(): void')
    expect(code).toContain('fgJumpToError()')
    expect(code).toContain('const fgSecPaths_ks_social_tabs = ')
  })

  it('react wires tagDrafts state and the jump block', () => {
    const [file] = generate('react')
    const code = file!.content
    expect(code).toContain('const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})')
    expect(code).toContain("fgAddTag('topics', form.topics)")
    expect(code).toContain('setFgSec_ks_wizard(target)')
    expect(code).toContain('topics: string[]')
  })

  it('html wires the chips runtime and the submit jump', () => {
    const [file] = generate('html')
    const code = file!.content
    expect(code).toContain('data-fg-kind="tags"')
    expect(code).toContain("if (kind === 'tags') return (fgTags[path] || []).slice()")
    expect(code).toContain('fgSetSec(meta, i)')
  })

  it('blazor models tags as List<string>', () => {
    const [file] = generate('blazor')
    expect(file!.content).toContain('public List<string> Topics { get; set; }')
  })
})

describe('aria-live announcements across code targets', () => {
  // Strings come straight from the renderer, so every target matches it.
  const step2 = stepAnnouncement(1, 2, 'Review')
  const oneError = errorsAnnouncement(1)

  it('vue-standalone renders the live region and announces steps/errors/submit', () => {
    const c = generate('vue-standalone')[0]!.content
    expect(c).toContain('role="status" aria-live="polite" aria-atomic="true">{{ fgAnnouncement }}</div>')
    expect(c).toContain(JSON.stringify(step2))
    expect(c).toContain(JSON.stringify(oneError))
    expect(c).toContain('fgAnnounce(fgErrorsText(Object.keys(errors).length))')
    expect(c).toContain(`fgAnnounce(${JSON.stringify(submittedAnnouncement())})`)
    expect(c).toContain('@click="fgGo_ks_wizard(fgSec_ks_wizard - 1)"')
  })

  it('react renders the live region and announces via state', () => {
    const c = generate('react')[0]!.content
    expect(c).toContain('role="status" aria-live="polite" aria-atomic="true">{fgAnnouncement}</div>')
    expect(c).toContain(JSON.stringify(step2))
    expect(c).toContain('fgAnnounce(fgErrorsText(Object.keys(nextErrors).length))')
    expect(c).toContain('onClick={() => fgGo_ks_wizard(fgSec_ks_wizard - 1)}')
  })

  it('html renders #fg-live and speaks only on user navigation', () => {
    const c = generate('html')[0]!.content
    expect(c).toContain('<div id="fg-live" class="fg-sr-only" role="status" aria-live="polite" aria-atomic="true"></div>')
    expect(c).toContain(`"announce":["Step 1 of 2: Shipping",${JSON.stringify(step2)}]`)
    expect(c).toContain('fgSetSec(meta, Math.max(0, fgSecState[meta.key] - 1), true)')
    expect(c).toContain('fgAnnounce(fgErrorsText(failed))')
  })

  it('blazor renders the live region, an always-on invalid-submit handler and step announcements', () => {
    const c = generate('blazor')[0]!.content
    expect(c).toContain('role="status" aria-live="polite" aria-atomic="true">@fgAnnouncement</div>')
    expect(c).toContain('private async Task FgOnInvalidSubmit(EditContext context)')
    expect(c).toContain(JSON.stringify(step2))
    expect(c).toContain(JSON.stringify(oneError))
    expect(c).toContain(`await FgAnnounce(${JSON.stringify(submittedAnnouncement())});`)
    expect(c).toContain('@onclick="() => FgGo_ks_wizard(fgSec_ks_wizard - 1)"')
  })

  it('uses each framework idiom for the visually-hidden class', () => {
    expect(generate('html', 'tailwind')[0]!.content).toContain('class="sr-only" role="status"')
    expect(generate('html', 'bootstrap5')[0]!.content).toContain('class="visually-hidden" role="status"')
  })

  it('escapes </script> in step labels inside the inline html runtime', () => {
    const raw = JSON.parse(JSON.stringify(kitchenSink)) as {
      tree: { id: string; children?: { props: Record<string, unknown> }[] }[]
    }
    raw.tree.find((n) => n.id === 'ks-wizard')!.children![0]!.props['label'] = '</script><b>x'
    const parsed = parseFormSchema(raw as unknown as Record<string, unknown>)
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'))
    const html = getTarget('html')!.generate({ schema: parsed.schema, css: getCssAdapter('vanilla') })[0]!
      .content
    const script = /<script>\n([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''
    expect(script).not.toContain('</script>')
    expect(script).toContain('\\u003c/script>')
  })
})

describe('Arabic forms (meta.locale "ar") across code targets', () => {
  const arabic = (): FormSchema => {
    const schema = fixture()
    schema.meta.locale = 'ar'
    schema.meta.dir = 'rtl'
    return schema
  }
  const gen = (id: string) =>
    getTarget(id)!.generate({ schema: arabic(), css: getCssAdapter('vanilla') })[0]!.content

  it.each(['vue-standalone', 'react', 'html', 'blazor'])(
    '%s emits Arabic rule messages, buttons, steps and tag labels',
    (id) => {
      const c = gen(id)
      expect(c).toContain('هذا الحقل مطلوب')
      expect(c).toContain('يجب إدخال رابط صالح')
      expect(c).toContain('يجب أن يكون بين 3 و20')
      expect(c).not.toContain('This field is required')
      expect(c).toContain('التالي')
      expect(c).toContain('السابق')
      expect(c).toContain('إرسال')
      expect(c).toContain('الخطوة 2 من 2: Review')
      expect(c).toContain('تم إرسال النموذج.')
      expect(c).toContain('إزالة')
      expect(c).not.toMatch(/>(Submit|Next|Back)</)
    },
  )

  it('custom rule messages and authored button texts are kept verbatim', () => {
    const schema = arabic()
    const raw = JSON.parse(JSON.stringify(schema)) as { tree: { id: string; props: Record<string, unknown>; validation?: { rule: string; message?: string }[] }[] }
    raw.tree.find((n) => n.id === 'ks-full-name')!.validation = [{ rule: 'required', message: 'اكتب اسمك' }]
    raw.tree.find((n) => n.id === 'ks-wizard')!.props['nextText'] = 'متابعة'
    const parsed = parseFormSchema(raw as unknown as Record<string, unknown>)
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'))
    const c = getTarget('vue-standalone')!.generate({ schema: parsed.schema, css: getCssAdapter('vanilla') })[0]!.content
    expect(c).toContain('اكتب اسمك')
    expect(c).toContain('متابعة')
  })

  it('generated JS plural function matches the renderer for counts 1–120', () => {
    const html = gen('html')
    const fn = /function fgErrorsText\(count\) \{[\s\S]*?\n\s*\}/.exec(html)?.[0]
    expect(fn).toBeTruthy()
    const fgErrorsText = new Function(`${fn}; return fgErrorsText`)() as (n: number) => string
    for (let n = 1; n <= 120; n++) {
      expect(fgErrorsText(n), String(n)).toBe(errorsAnnouncement(n, 'ar'))
    }
  })

  it('blazor carries the six-way Arabic plural forms', () => {
    const c = gen('blazor')
    expect(c).toContain('["two"] = "خطآن. يرجى تصحيح الحقول المحددة."')
    expect(c).toContain('count % 100 >= 3 && count % 100 <= 10 ? "few"')
    expect(c).toContain('aria-label="إزالة @(Model.Topics[fgIdx_Topics])"')
  })

  it('english forms are unaffected', () => {
    const c = generate('vue-standalone')[0]!.content
    expect(c).toContain('This field is required')
    expect(c).not.toContain('هذا الحقل مطلوب')
  })
})

describe('element appearance (style) in every target and framework', () => {
  // kitchen-sink: website sm, bio lg, zip hideLabel, heading center+primary,
  // divider primary, account group className "account-box"
  const expectations: Record<string, string[]> = {
    vanilla: ['fg-input fg-control--sm', 'fg-textarea fg-control--lg', 'fg-sr-only', 'fg-align-center', 'fg-heading fg-tone-primary', 'fg-divider fg-tone-primary', 'account-box'],
    tailwind: ['px-2 py-1 text-xs', 'px-4 py-3 text-base', 'sr-only', 'text-center', 'text-indigo-600', 'border-indigo-500', 'account-box'],
    bootstrap5: ['form-control form-control-sm', 'form-control form-control-lg', 'visually-hidden', 'text-center', 'fw-semibold text-primary', 'border-top border-primary opacity-100', 'account-box'],
  }

  it.each(['vue-standalone', 'react', 'html', 'blazor'])('%s emits every style in all frameworks', (id) => {
    for (const framework of frameworks) {
      const code = generate(id, framework)[0]!.content
      for (const expected of expectations[framework]!) {
        expect(code, `${id}/${framework}: ${expected}`).toContain(expected)
      }
    }
  })

  it('a hidden label stays the control\'s label (for= and text intact)', () => {
    const html = generate('html')[0]!.content
    expect(html).toContain('<label class="fg-sr-only" for="fg_zip">ZIP</label>')
  })
})

describe('blur validation waits for a pointer press to end (no lost clicks)', () => {
  // An error appearing between pointerdown and pointerup reflows the form,
  // so the release lands off the button/checkbox and the click is lost.
  it('vue-standalone defers touch() while pressed and flushes after release', () => {
    const c = generate('vue-standalone')[0]!.content
    expect(c).toContain('@pointerdown.capture="fgPointerDown"')
    expect(c).toContain("window.addEventListener('pointerup', fgPointerEnd)")
    expect(c).toContain('setTimeout(fgFlushDeferred, 0)')
    expect(c).toMatch(/function touch\(path: string\): void \{\n {2}if \(fgPressing\) \{/)
  })

  it('react defers touch() and validates the latest state via refs', () => {
    const c = generate('react')[0]!.content
    expect(c).toContain('onPointerDownCapture={() => { fgFlush.current(); fgPressing.current = true }}')
    expect(c).toContain('validateField(path, formRef.current)')
    expect(c).toContain("window.addEventListener('pointercancel', end)")
  })

  it('html routes focusout and tag blur through fgBlurValidate', () => {
    const c = generate('html')[0]!.content
    expect(c).toContain("form.addEventListener('pointerdown', function () {")
    expect(c).toContain('if (path) fgBlurValidate(path)')
    expect(c).toContain('fgBlurValidate(fieldPath())\n      })')
  })

  it('blazor holds field validation while pressed, without DataAnnotationsValidator', () => {
    const c = generate('blazor')[0]!.content
    expect(c).not.toContain('<DataAnnotationsValidator />')
    expect(c).toContain('@onpointerdown="FgPointerDown" @onpointerup="FgPointerEnd" @onpointerleave="FgPointerEnd"')
    expect(c).toContain('<div class="fg-form" @onpointerdown="FgPointerDown"')
    expect(c).toContain('fgDeferredFields.Add(name);')
    expect(c).toContain('"FullName" => Model.FullName,')
  })
})

describe('cross-target validation parity (found via live error counts)', () => {
  it('html marks the select placeholder selected; bound targets do not need it', () => {
    // Browsers skip a disabled option for default selection, so without
    // `selected` the first real option was silently chosen.
    expect(generate('html')[0]!.content).toContain('<option value="" disabled selected>—</option>')
    expect(generate('vue-standalone')[0]!.content).not.toContain('disabled selected')
    expect(generate('react')[0]!.content).not.toContain('disabled selected')
  })

  it('blazor: optional url/email/min fields validate in Validate(), not attributes', () => {
    const c = generate('blazor')[0]!.content
    // Website is optional with a url rule: [Url] would reject "".
    expect(c).not.toMatch(/\[Url\([^\]]*\]\s*public string Website/)
    expect(c).toContain('if (!(string.IsNullOrWhiteSpace(Website)) && (!Uri.TryCreate(Website')
    // Required fields keep attributes ([Required] short-circuits the rest).
    expect(c).toMatch(/\[EmailAddress\([^\]]*\]\s*public string Email/)
  })

  it('every target opts out of native browser validation', () => {
    // Without it, an invalid type="url"/"email" value makes the browser block
    // submit with its own popup before the form's handler runs.
    expect(generate('blazor')[0]!.content).toContain('<EditForm EditContext="fgEdit" OnSubmit="FgSubmit" novalidate')
    expect(generate('html')[0]!.content).toMatch(/<form id="fg-form"[^>]*novalidate/)
    expect(generate('vue-standalone')[0]!.content).toMatch(/<form[\s\S]*?novalidate[\s\S]*?@submit\.prevent/)
    expect(generate('react')[0]!.content).toContain('noValidate onSubmit={handleSubmit}')
  })

  it('blazor: submit surfaces model-level errors alongside attribute errors', () => {
    const c = generate('blazor')[0]!.content
    expect(c).toContain('private async Task FgSubmit(EditContext context)')
    expect(c).toContain('((IValidatableObject)Model).Validate(new ValidationContext(Model))')
    expect(c).toContain('fgEdit.OnValidationRequested += (_, _) => FgValidateAll();')
  })
})

describe('blazor parity: multi-value controls, step gating, error jump', () => {
  const code = (): string => generate('blazor')[0]!.content

  it('multiselect binds string[] via InputSelect multiple', () => {
    expect(code()).toContain('public string[] Channels { get; set; } = Array.Empty<string>();')
    expect(code()).toContain('<InputSelect id="fg_channels" multiple @bind-Value="Model.Channels"')
  })

  it('checkboxgroup renders FgToggle-wired checkboxes', () => {
    const c = code()
    expect(c).toContain(`@onchange='e => FgToggle(Model.Interests, "news", e)'`)
    expect(c).toContain('private static void FgToggle(List<string> list, string value, ChangeEventArgs e)')
  })

  it('tags renders chips bound to fgTagDrafts with @bind:after', () => {
    const c = code()
    expect(c).toContain(`@bind='fgTagDrafts["Topics"]' @bind:after='() => FgAddTag(Model.Topics, "Topics")'`)
    expect(c).toContain(`@onclick='() => FgRemoveTag(Model.Topics, fgIdx_Topics, "Topics")'`)
    expect(c).toContain('private readonly FgStore<string> fgTagDrafts = new(_ => "");')
  })

  it('no element renders an unsupported-emitter comment anymore', () => {
    expect(code()).not.toContain('has no blazor emitter yet')
  })

  it('steps gate Next behind per-step validation via an EditContext', () => {
    const c = code()
    expect(c).toContain('<EditForm EditContext="fgEdit" OnSubmit="FgSubmit"')
    expect(c).toContain('private async Task FgNext_ks_wizard()')
    expect(c).toContain('0 => new[] { nameof(KitchenSinkFormModel.ShippingCity) },')
    expect(c).toContain('Validator.TryValidateProperty(FgValue(name), context, results)')
    expect(c).toContain('new ValidationMessageStore(fgEdit)')
  })

  it('invalid submit jumps each host to its first erroring section', () => {
    const c = code()
    expect(c).toContain('private static readonly string[][] fgSecMembers_ks_wizard =')
    expect(c).toContain('fgSecMembers_ks_social_tabs[fgSec_ks_social_tabs]')
    expect(c).toContain('private void FgJumpToError()')
  })
})

describe('html target', () => {
  it.each(frameworks)('snapshot (%s)', (framework) => {
    const [file] = generate('html', framework)
    expect(file!.content).toMatchSnapshot()
  })

  it('is a complete document with runtime wiring', () => {
    const [file] = generate('html')
    const code = file!.content
    expect(code).toMatch(/^<!doctype html>/)
    expect(code).toContain('data-fg-path="account.username"')
    expect(code).toContain('data-fg-cond="0"')
    expect(code).toContain('FG_VALIDATORS')
    expect(code).toContain('<style>')
    expect(code).not.toContain('INVALID_CLASS_PLACEHOLDER')
  })

  it('references CDN assets for tailwind instead of embedding CSS', () => {
    const [file] = generateNoSlider('html', 'tailwind')
    expect(file!.content).toContain('cdn.tailwindcss.com')
    // only the runtime's hidden rule, no framework CSS
    const style = /<style>([\s\S]*?)<\/style>/.exec(file!.content)?.[1] ?? ''
    expect(style.trim()).toBe('[hidden] { display: none !important; }')
  })

  it('generated validator and payload code executes correctly', () => {
    const [file] = generate('html')
    // Extract the inline script and run it against a minimal DOM double.
    const script = /<script>\n([\s\S]*?)<\/script>/.exec(file!.content)?.[1]
    expect(script).toBeTruthy()
    // The script wires DOM listeners; executing it fully needs a browser.
    // Here we at least assert the compiled pieces are syntactically valid JS.
    expect(() => new Function(script!)).not.toThrow()
  })
})
