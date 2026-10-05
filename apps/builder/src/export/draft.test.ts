import { draftKey, draftVersion, memoryStorage, parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from './css'
import { phoneHelpers } from './composite'
import { draftHelpers } from './draft'
import { getTarget } from './targets'

const field = (id: string, type: string, name: string, props: Record<string, unknown> = {}): ElementNode => ({
  id,
  type,
  name,
  props: { label: name, ...props },
  validation: [],
  conditions: [],
  layout: {},
  style: {},
})

function schemaOf(tree: ElementNode[], meta: Record<string, unknown> = {}): FormSchema {
  const result = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'trip', locale: 'en', dir: 'ltr', saveDraft: true, ...meta },
    tree,
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const TREE = [field('a', 'text', 'first'), field('b', 'checkbox', 'agree')]
const out = (target: string, schema: FormSchema, css: CssFrameworkId = 'vanilla'): string =>
  getTarget(target)!.generate({ schema, css: getCssAdapter(css) })[0]!.content

describe('draft storage helpers (JS)', () => {
  const run = (schema: FormSchema, storage: ReturnType<typeof memoryStorage> | null) =>
    new Function('window', 'Blob', `${draftHelpers(schema, 'html', false)}
return { json: fgDraftJson, read: fgDraftRead, write: fgDraftWrite, remove: fgDraftRemove }`)(
      { localStorage: storage },
      Blob,
    ) as { json: (v: unknown) => string; read: () => Record<string, unknown> | null; write: (json: string) => boolean; remove: () => void }

  it('stores in the renderer format, under the form key, for this version only', () => {
    const schema = schemaOf(TREE)
    const storage = memoryStorage()
    const helpers = run(schema, storage)
    const file = new File(['x'], 'cv.pdf')
    const json = helpers.json({ first: 'Ann', cv: [file], photo: file })
    expect(json).toBe('{"first":"Ann","cv":[]}')
    expect(helpers.write(json)).toBe(true)
    expect(JSON.parse(storage.getItem(draftKey('trip'))!)).toEqual({ v: draftVersion(schema.tree, 'html'), data: { first: 'Ann', cv: [] } })
    expect(helpers.read()).toEqual({ first: 'Ann', cv: [] })
    storage.setItem(draftKey('trip'), JSON.stringify({ v: draftVersion(schema.tree, 'vue'), data: { first: 'Bo' } }))
    expect(helpers.read()).toBeNull()
    helpers.remove()
    expect(storage.getItem(draftKey('trip'))).toBeNull()
  })

  it('never throws without storage', () => {
    const helpers = run(schemaOf(TREE), null)
    expect(helpers.read()).toBeNull()
    expect(helpers.write('{}')).toBe(false)
    expect(() => helpers.remove()).not.toThrow()
  })
})

describe('save and continue later in the exports', () => {
  const schema = schemaOf(TREE)
  const version = (writer: string) => draftVersion(schema.tree, writer)

  it('each target keeps its own version and shows the note', () => {
    for (const [target, writer] of [
      ['vue-standalone', 'vue'],
      ['react', 'react'],
      ['html', 'html'],
      ['blazor', 'blazor'],
    ] as const) {
      const code = out(target, schema)
      expect(code, target).toContain(JSON.stringify(draftKey('trip')))
      expect(code, target).toContain(JSON.stringify(version(writer)))
      expect(code, target).toContain('data-fg-draft-clear')
      expect(code, target).toContain('Your answers are saved on this device until you send the form.')
      expect(code, target).toContain('Welcome back! Your saved answers were restored.')
      expect(code, target).not.toContain('Files aren’t saved')
    }
  })

  it('nothing is generated without meta.saveDraft', () => {
    const plain = schemaOf(TREE, { saveDraft: undefined })
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      expect(out(target, plain), target).not.toMatch(/fgDraft|FgDraft|data-fg-draft/)
    }
  })

  it('forgets the answers only once the server accepted them', () => {
    const posting = schemaOf(TREE, { submit: { url: 'https://example.com/submit' } })
    expect(out('vue-standalone', posting)).toContain('if (response.ok) fgDraftForget()')
    expect(out('react', posting)).toContain('.then((response) => { if (response.ok) fgDraftForget(form) })')
    expect(out('html', posting)).toContain('.then(function (response) { if (response.ok) fgDraftForget() })')
    expect(out('blazor', posting)).toContain('if (response.IsSuccessStatusCode) await FgDraftForget();')
    // Without a submit URL a valid submit is the end.
    expect(out('vue-standalone', schema)).toMatch(/emit\('submit', data\)\n {2}fgDraftForget\(\)/)
    expect(out('blazor', schema)).toContain('        await FgDraftForget();\n')
  })

  it('upload forms say files are not kept; Blazor stores upload lists empty', () => {
    const withFiles = schemaOf([...TREE, field('c', 'file', 'cv')], { submit: { url: 'https://example.com/submit' } })
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      expect(out(target, withFiles), target).toContain('Files aren’t saved; choose them again before sending.')
    }
    const razor = out('blazor', withFiles)
    expect(razor).toContain('@inject Microsoft.JSInterop.IJSRuntime FgJs')
    expect(razor).toContain('private sealed class FgNoFiles : System.Text.Json.Serialization.JsonConverter<List<FgUpload>>')
    expect(razor).toContain('if (ok) await FgDraftForget();')
  })

  it('uses the framework classes for the note', () => {
    expect(out('html', schema, 'bootstrap5')).toContain('class="alert alert-secondary')
    expect(out('react', schema, 'tailwind')).toContain('data-fg-draft-clear onClick={fgDraftClear}')
  })
})

describe('restored phone numbers', () => {
  it('take their country from the number when none was picked', () => {
    const phone = field('p', 'phone', 'phone', { countrySelect: true, defaultCountry: 'OM' })
    const from = new Function(`${phoneHelpers([{ node: phone }] as never, 'en', false)}\nreturn fgPhoneFrom`)() as (v: unknown, fallback: string) => string
    expect(from('+44 7700 900123', 'OM')).toBe('GB')
    expect(from('+968 9123 4567', 'OM')).toBe('OM')
    expect(from('', 'OM')).toBe('OM')
    expect(from(null, 'OM')).toBe('OM')
    const schema = schemaOf([phone])
    expect(out('vue-standalone', schema)).toContain('return fgPhoneCountry[path] ?? fgPhoneFrom(fgGet(path), FG_PHONE_DEFAULTS[fgTpl(path)]!)')
    expect(out('react', schema)).toContain('return phoneCountry[path] ?? fgPhoneFrom(value, FG_PHONE_DEFAULTS[fgTpl(path)]!)')
    expect(out('blazor', schema)).toContain(`value='@FgPhoneCountryOf("Phone", Model.Phone)'`)
  })
})
