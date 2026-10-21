// Prefill from the page address (meta.prefillFromQuery, hidden `param`) in
// every code target: the fields a link can fill, typed readers, and the
// order against a restored draft (the link wins).
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

const items = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]
const tree: ElementNode[] = [
  { id: 'n', type: 'text', name: 'name', props: { label: 'Name' } },
  { id: 'a', type: 'number', name: 'age', props: { label: 'Age' } },
  { id: 'g', type: 'toggle', name: 'agree', props: { label: 'Agree' } },
  { id: 't', type: 'checkboxgroup', name: 'topics', props: { label: 'Topics', items } },
  { id: 'l', type: 'multiselect', name: 'langs', props: { label: 'Languages', items } },
  { id: 'grp', type: 'group', name: 'address', props: { label: 'Address' }, children: [{ id: 'c', type: 'text', name: 'city', props: { label: 'City' } }] },
  { id: 'p', type: 'password', name: 'secret', props: { label: 'Secret' } },
  { id: 'h', type: 'hidden', name: 'source', props: { value: 'web', param: 'utm_source' } },
]

describe('prefill from the page address in every code target', () => {
  const on = schema(tree, { prefillFromQuery: true })

  it('html: the fields with their kinds, run once the page is set up', () => {
    const html = out('html', on)
    expect(html).toContain('{ p: "name", k: "string" }')
    expect(html).toContain('{ p: "age", k: "number" }')
    expect(html).toContain('{ p: "agree", k: "bool" }')
    expect(html).toContain('{ p: "topics", k: "list" }')
    expect(html).toContain('{ p: "langs", k: "list" }')
    expect(html).toContain('{ p: "address.city", k: "string" }')
    expect(html).toContain('{ p: "source", k: "string", q: "utm_source" }')
    expect(html).not.toContain('p: "secret"')
    expect(html).toContain('updateConditions()\n    fgPrefill()')
  })

  it('react: typed readers over a copy of the state, applied once after mount', () => {
    const tsx = out('react', on)
    expect(tsx).toContain('fgQueryString(q, "name"); if (v !== undefined) { next.name = v; changed = true }')
    expect(tsx).toContain('fgQueryNumber(q, "age")')
    expect(tsx).toContain('fgQueryBool(q, "agree")')
    expect(tsx).toContain('fgQueryList(q, "topics")')
    expect(tsx).toContain('next.address.city = v')
    expect(tsx).toContain('fgQueryString(q, "utm_source"); if (v !== undefined) { next.source = v; changed = true }')
    expect(tsx).not.toContain('"secret")')
    expect(tsx).toContain('const next = fgPrefill(current)')
  })

  it('vue: assignments on the reactive form after mount', () => {
    const vue = out('vue-standalone', on)
    expect(vue).toContain('fgQueryList(q, "langs"); if (v !== undefined) form.langs = v')
    expect(vue).toContain('form.address.city = v')
    expect(vue).toContain('fgQueryString(q, "utm_source"); if (v !== undefined) form.source = v')
    expect(vue).not.toContain('"secret")')
  })

  it('blazor: the navigation manager, typed readers and the model members', () => {
    const razor = out('blazor', on)
    expect(razor).toContain('@inject Microsoft.AspNetCore.Components.NavigationManager FgNav')
    expect(razor).toContain('FgInitEdit();\n        FgPrefill();')
    expect(razor).toContain('FgQueryString(query, "name"); if (v is not null) Model.Name = v;')
    expect(razor).toContain('FgQueryNumber(query, "age"); if (v is not null) Model.Age = v;')
    expect(razor).toContain('FgQueryBool(query, "agree"); if (v is not null) Model.Agree = v.Value;')
    expect(razor).toContain('FgQueryList(query, "topics"); if (v is not null) Model.Topics = v;')
    expect(razor).toContain('FgQueryList(query, "langs"); if (v is not null) Model.Langs = v.ToArray();')
    expect(razor).toMatch(/FgQueryString\(query, "address\.city"\); if \(v is not null\) Model\.Address\w*ity = v;/)
    expect(razor).toContain('FgQueryString(query, "utm_source"); if (v is not null) Model.Source = v;')
    expect(razor).not.toContain('"secret")')
  })

  it('without the flag only the hidden field reads the address; nothing is emitted otherwise', () => {
    const html = out('html', schema(tree))
    expect(html).toContain('{ p: "source", k: "string", q: "utm_source" }')
    expect(html).not.toContain('p: "name"')
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const none = out(target, schema(tree.filter((n) => n.type !== 'hidden')))
      expect(none, target).not.toMatch(/fgPrefill|FgPrefill|FgNav/)
    }
  })

  it('with a saved draft the link wins: restore first, then prefill', () => {
    const both = schema(tree, { prefillFromQuery: true, saveDraft: true })
    expect(out('html', both)).toContain('fgDraftStart()\n    fgPrefill()')
    expect(out('blazor', both)).toContain('FgInitEdit();\n            FgPrefill();')
    const tsx = out('react', both)
    expect(tsx.indexOf('const saved = fgDraftRead()')).toBeLessThan(tsx.indexOf('const next = fgPrefill(current)'))
    const vue = out('vue-standalone', both)
    expect(vue.indexOf('const saved = fgDraftRead()')).toBeLessThan(vue.indexOf('fgQueryString(q, "name")'))
  })
})
