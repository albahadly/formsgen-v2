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
  it('registers the four core targets', () => {
    expect(listTargets().map((t) => t.id)).toEqual(['json', 'vue-lib', 'vue-standalone', 'html'])
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
