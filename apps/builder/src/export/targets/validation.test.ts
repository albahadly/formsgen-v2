// The "Validation" target: the form's rules as a zod schema and a JSON
// Schema, run here against payloads (zod transpiled and evaluated, JSON
// Schema through ajv) so the semantics are proven, not just emitted.
import { parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import * as zodModule from 'zod'
import kitchenSink from '../../../../../fixtures/kitchen-sink.formsgen.json'
import { getCssAdapter } from '../css'
import { getTarget } from './index'

function schema(tree: ElementNode[], meta: Record<string, unknown> = {}): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'signup', locale: 'en', dir: 'ltr', ...meta }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const files = (s: FormSchema) => getTarget('validation')!.generate({ schema: s, css: getCssAdapter('vanilla') })

/** The generated zod schema, transpiled to CommonJS and evaluated with the real zod. */
function zodOf(s: FormSchema): zodModule.ZodTypeAny {
  const source = files(s).find((f) => f.path.endsWith('.zod.ts'))!.content
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const exported: Record<string, unknown> = {}
  new Function('require', 'exports', js)((name: string) => {
    if (name !== 'zod') throw new Error(`unexpected import ${name}`)
    return zodModule
  }, exported)
  const found = Object.values(exported).find((v) => v && typeof v === 'object' && 'safeParse' in (v as object))
  if (!found) throw new Error('no zod schema exported')
  return found as zodModule.ZodTypeAny
}

/** The generated JSON Schema, compiled by ajv (draft 2020-12, formats on). */
function ajvOf(s: FormSchema) {
  const json = JSON.parse(files(s).find((f) => f.path.endsWith('.schema.json'))!.content)
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)
  return { validate: ajv.compile(json), json }
}

const zodPaths = (result: zodModule.SafeParseReturnType<unknown, unknown>): string[] =>
  result.success ? [] : [...new Set(result.error.issues.map((i) => i.path.join('.')))].sort()
const ajvPaths = (validate: ReturnType<typeof ajvOf>['validate']): string[] =>
  [...new Set((validate.errors ?? []).map((e) => e.instancePath.replace(/^\//, '').replace(/\//g, '.')))].sort()

const options = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
]
const tree: ElementNode[] = [
  { id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }, { rule: 'min', value: 2 }] },
  { id: 'e', type: 'email', name: 'email', props: { label: 'Email' }, validation: [{ rule: 'email' }] },
  { id: 'w', type: 'url', name: 'site', props: { label: 'Site' }, validation: [{ rule: 'url' }] },
  { id: 'a', type: 'number', name: 'age', props: { label: 'Age' }, validation: [{ rule: 'required' }, { rule: 'min', value: 18 }] },
  { id: 'g', type: 'toggle', name: 'agree', props: { label: 'Agree' }, validation: [{ rule: 'required' }] },
  { id: 'p', type: 'select', name: 'plan', props: { label: 'Plan', items: options }, validation: [{ rule: 'required' }] },
  { id: 't', type: 'checkboxgroup', name: 'topics', props: { label: 'Topics', items: options }, validation: [{ rule: 'required' }], conditions: [[{ field: 'plan', operator: 'equals', value: 'pro' }]] },
  { id: 'b', type: 'textarea', name: 'bio', props: { label: 'Bio' }, validation: [{ rule: 'max', value: 5 }, { rule: 'regex', value: '^[a-z]*$' }] },
  { id: 'pw', type: 'password', name: 'password', props: { label: 'Password' } },
  { id: 'pc', type: 'password', name: 'confirm', props: { label: 'Confirm' }, validation: [{ rule: 'same-as', value: 'password' }] },
  { id: 'addr', type: 'group', name: 'address', props: { label: 'Address' }, children: [{ id: 'c', type: 'text', name: 'city', props: { label: 'City' }, validation: [{ rule: 'required' }] }] },
  { id: 'r', type: 'repeater', name: 'guests', props: { label: 'Guests', minItems: 1, maxItems: 3 }, children: [{ id: 'gn', type: 'text', name: 'guest', props: { label: 'Guest' }, validation: [{ rule: 'required' }] }] },
  { id: 'f', type: 'file', name: 'attachments', props: { label: 'Files', multiple: true, maxFiles: 2, maxSizeMb: 1 } },
  { id: 'd', type: 'daterange', name: 'stay', props: { label: 'Stay' }, validation: [{ rule: 'required' }] },
  { id: 'l', type: 'location', name: 'place', props: { label: 'Place' } },
  { id: 'h', type: 'hidden', name: 'source', props: { value: 'web' } },
]
const valid = {
  name: 'Ada',
  email: 'ada@example.com',
  site: '',
  age: 36,
  agree: true,
  plan: 'free',
  bio: 'abc',
  password: 'x',
  confirm: 'x',
  address: { city: 'London' },
  guests: [{ guest: 'Bo' }],
  attachments: [{ name: 'a.pdf', size: 1024, type: 'application/pdf' }],
  stay: { from: '2026-01-01', to: '2026-01-05' },
  place: null,
  source: 'web',
}

describe('the validation target', () => {
  const s = schema(tree)

  it('emits a zod schema and a JSON Schema, both named after the form', () => {
    const out = files(s)
    expect(out.map((f) => f.path)).toEqual(['signup.zod.ts', 'signup.schema.json'])
    expect(out[0]!.content).toContain("import { z } from 'zod'")
    expect(out[0]!.content).toContain('export const SignupFormSchema')
    expect(JSON.parse(out[1]!.content).$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(getTarget('validation')!.readme({ schema: s, css: getCssAdapter('vanilla') })).toContain('ajv-formats')
  })

  it('a valid submission passes both', () => {
    expect(zodOf(s).safeParse(valid).success).toBe(true)
    const { validate } = ajvOf(s)
    expect(validate(valid), JSON.stringify(validate.errors)).toBe(true)
  })

  it('required fields: blank text, a null number, an unchecked box, no choice, an empty item, an empty date range', () => {
    const payload = { ...valid, name: '   ', age: null, agree: false, plan: null, address: { city: '' }, guests: [{ guest: '' }], stay: { from: '', to: '' } }
    expect(zodPaths(zodOf(s).safeParse(payload))).toEqual(['address.city', 'age', 'agree', 'guests.0.guest', 'name', 'plan', 'stay'])
    const { validate } = ajvOf(s)
    expect(validate(payload)).toBe(false)
    expect(ajvPaths(validate)).toEqual(['address.city', 'age', 'agree', 'guests.0.guest', 'name', 'plan', 'stay.from', 'stay.to'])
  })

  it('rules other than required are skipped while the value is empty, as in the renderer', () => {
    const payload = { ...valid, email: '', site: '', bio: '' }
    expect(zodOf(s).safeParse(payload).success).toBe(true)
    expect(ajvOf(s).validate(payload)).toBe(true)
  })

  it('sizes, email, url, regex and choices', () => {
    const payload = { ...valid, name: 'A', age: 17, email: 'nope', site: 'not a url', bio: 'toolong1', plan: 'gold' }
    expect(zodPaths(zodOf(s).safeParse(payload))).toEqual(['age', 'bio', 'email', 'name', 'plan', 'site'])
    const { validate } = ajvOf(s)
    expect(validate(payload)).toBe(false)
    expect(ajvPaths(validate)).toEqual(['age', 'bio', 'email', 'name', 'plan', 'site'])
  })

  it('a field hidden by a condition may be absent; when the condition holds zod re-checks required', () => {
    expect(zodOf(s).safeParse({ ...valid, plan: 'free' }).success).toBe(true)
    expect(zodPaths(zodOf(s).safeParse({ ...valid, plan: 'pro' }))).toEqual(['topics'])
    expect(zodPaths(zodOf(s).safeParse({ ...valid, plan: 'pro', topics: [] }))).toEqual(['topics'])
    expect(zodOf(s).safeParse({ ...valid, plan: 'pro', topics: ['pro'] }).success).toBe(true)
    expect(zodPaths(zodOf(s).safeParse({ ...valid, plan: 'pro', topics: ['gold'] }))).toEqual(['topics.0'])
    // JSON Schema cannot say "required when": the field is simply optional there
    const { validate, json } = ajvOf(s)
    expect(json.required).not.toContain('topics')
    expect(validate({ ...valid, plan: 'pro' })).toBe(true)
    expect(validate({ ...valid, plan: 'pro', topics: ['gold'] })).toBe(false)
  })

  it('same-as is a zod refinement; a date range must end after it starts', () => {
    expect(zodPaths(zodOf(s).safeParse({ ...valid, confirm: 'y' }))).toEqual(['confirm'])
    expect(zodPaths(zodOf(s).safeParse({ ...valid, stay: { from: '2026-01-05', to: '2026-01-01' } }))).toEqual(['stay'])
    expect(ajvOf(s).validate({ ...valid, confirm: 'y' })).toBe(true)
  })

  it('repeater limits, file limits, a point on the map', () => {
    const z = zodOf(s)
    expect(zodPaths(z.safeParse({ ...valid, guests: [] }))).toEqual(['guests'])
    expect(zodPaths(z.safeParse({ ...valid, guests: [{ guest: 'a' }, { guest: 'b' }, { guest: 'c' }, { guest: 'd' }] }))).toEqual(['guests'])
    expect(zodPaths(z.safeParse({ ...valid, attachments: [{ name: 'big', size: 2 * 1024 * 1024, type: '' }] }))).toEqual(['attachments.0.size'])
    expect(z.safeParse({ ...valid, place: { lat: 51.5, lng: -0.1 } }).success).toBe(true)
    expect(zodPaths(z.safeParse({ ...valid, place: { lat: 'x' } }))).toEqual(['place.lat', 'place.lng'])
    const { validate } = ajvOf(s)
    expect(validate({ ...valid, guests: [] })).toBe(false)
    expect(validate({ ...valid, attachments: [{ name: 'big', size: 2 * 1024 * 1024, type: '' }] })).toBe(false)
    expect(validate({ ...valid, place: { lat: 51.5, lng: -0.1 } })).toBe(true)
  })

  it('a spam-checked form accepts the token field', () => {
    const checked = schema(tree, { captcha: { provider: 'turnstile', siteKey: '1x00000000000000000000AA' } })
    expect(zodOf(checked).safeParse({ ...valid, 'cf-turnstile-response': 'tok' }).success).toBe(true)
    expect(ajvOf(checked).json.properties['cf-turnstile-response']).toEqual({ type: 'string' })
  })

  it('the kitchen sink generates, transpiles and compiles', () => {
    const result = parseFormSchema(JSON.parse(JSON.stringify(kitchenSink)))
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(typeof zodOf(result.schema).safeParse).toBe('function')
    expect(typeof ajvOf(result.schema).validate).toBe('function')
  })
})
