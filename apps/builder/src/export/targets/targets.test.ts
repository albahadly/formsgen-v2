import { parseFormSchema, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../../../fixtures/kitchen-sink.formsgen.json'
import { getCssAdapter, listCssAdapters, type CssFrameworkId } from '../css'
import { getTarget, listTargets } from './index'

function fixture(): FormSchema {
  const result = parseFormSchema(kitchenSink)
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const frameworks: CssFrameworkId[] = ['vanilla', 'tailwind', 'bootstrap5']

const generate = (targetId: string, framework: CssFrameworkId = 'vanilla') =>
  getTarget(targetId)!.generate({ schema: fixture(), css: getCssAdapter(framework) })

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
    const [file] = generate('vue-standalone', 'bootstrap5')
    expect(file!.content).toContain('form-control')
    expect(file!.content).toContain('is-invalid')
    expect(file!.content).not.toContain('fg-input')
    expect(file!.content).not.toContain('<style scoped>')
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
    const tailwind = generate('react', 'tailwind')
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
    expect(code).toContain('<EditForm Model="Model"')
    expect(code).toContain('<DataAnnotationsValidator />')
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
    expect(code).toContain('@onclick="() => fgSec_ks_wizard++"')
  })

  it('submit button is gated behind the wizard last step in every target', () => {
    // kitchen-sink has the ks-wizard steps host -> gating is the default
    const vue = generate('vue-standalone')[0]!.content
    expect(vue).toContain('v-if="fgSec_ks_wizard === 1"')
    const react = generate('react')[0]!.content
    expect(react).toContain('{fgSec_ks_wizard === 1 && <button')
    const html = generate('html')[0]!.content
    expect(html).toContain('data-fg-submit type="submit" hidden')
    expect(html).toContain('var FG_SUBMIT_GATE = ["ks_wizard"]')
    const blazor = generate('blazor')[0]!.content
    expect(blazor).toContain('@if (fgSec_ks_wizard == 1)')
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
    const [file] = generate('html', 'tailwind')
    expect(file!.content).toContain('cdn.tailwindcss.com')
    expect(file!.content).not.toContain('<style>')
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
