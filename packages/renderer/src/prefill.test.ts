import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { prefillKind, prefillValue, queryPrefill } from './prefill'
import type { ElementNode, FormSchema } from './schema'

const node = (type: string, name: string, props: Record<string, unknown> = {}, children?: ElementNode[]): ElementNode => {
  const n: ElementNode = { id: `id_${name}`, type: type as ElementNode['type'], props }
  if (name) n.name = name
  if (children) n.children = children
  return n
}

const tree: ElementNode[] = [
  node('text', 'name'),
  node('email', 'email'),
  node('number', 'age'),
  node('range', 'level', { min: 1, max: 5 }),
  node('toggle', 'agree'),
  node('checkbox', 'news'),
  node('checkboxgroup', 'topics', { items: [] }),
  node('multiselect', 'langs', { items: [] }),
  node('select', 'plan', { items: [] }),
  node('password', 'secret'),
  node('calculated', 'total', { formula: 'age * 2' }),
  node('group', 'address', {}, [node('text', 'city'), node('text', 'zip')]),
  node('columns', '', { count: 2 }, [node('date', 'when')]),
  node('repeater', 'guests', {}, [node('text', 'guest')]),
  node('hidden', 'source', { value: 'web', param: 'utm_source' }),
  node('hidden', 'plain', { value: 'fixed' }),
]

describe('prefillKind', () => {
  it('classes every field type that a URL can fill', () => {
    const kinds = Object.fromEntries(tree.filter((n) => n.name).map((n) => [n.name, prefillKind(n)]))
    expect(kinds).toEqual({
      name: 'string',
      email: 'string',
      age: 'number',
      level: 'number',
      agree: 'bool',
      news: 'bool',
      topics: 'list',
      langs: 'list',
      plan: 'string',
      secret: null,
      total: null,
      address: null,
      guests: null,
      source: null,
      plain: null,
    })
  })
})

describe('prefillValue', () => {
  it('converts by kind and refuses what does not fit', () => {
    expect(prefillValue('string', ['Ada Lovelace'])).toBe('Ada Lovelace')
    expect(prefillValue('number', ['42'])).toBe(42)
    expect(prefillValue('number', ['4.5'])).toBe(4.5)
    expect(prefillValue('number', ['forty'])).toBeUndefined()
    expect(prefillValue('number', [''])).toBeUndefined()
    expect(prefillValue('bool', ['1'])).toBe(true)
    expect(prefillValue('bool', ['YES'])).toBe(true)
    expect(prefillValue('bool', ['off'])).toBe(false)
    expect(prefillValue('bool', ['maybe'])).toBeUndefined()
    expect(prefillValue('list', ['news', 'offers'])).toEqual(['news', 'offers'])
    expect(prefillValue('list', ['news, offers,'])).toEqual(['news', 'offers'])
    expect(prefillValue('list', [])).toBeUndefined()
  })
})

describe('queryPrefill', () => {
  it('fills fields by data path, converted, in tree order', () => {
    const entries = queryPrefill(
      tree,
      '?name=Ada+Lovelace&age=36&level=9&agree=true&news=0&topics=a&topics=b&langs=en,ar&plan=pro&secret=x&total=1&address.city=London&when=2026-01-02&guests=nope&guests.0.guest=nope',
      { fields: true },
    )
    expect(entries).toEqual([
      { path: 'name', value: 'Ada Lovelace' },
      { path: 'age', value: 36 },
      { path: 'level', value: 9 },
      { path: 'agree', value: true },
      { path: 'news', value: false },
      { path: 'topics', value: ['a', 'b'] },
      { path: 'langs', value: ['en', 'ar'] },
      { path: 'plan', value: 'pro' },
      { path: 'address.city', value: 'London' },
      { path: 'when', value: '2026-01-02' },
    ])
  })

  it('a hidden field takes its named parameter, with or without the flag', () => {
    const search = '?utm_source=newsletter&source=ignored&plain=ignored&name=Ada'
    expect(queryPrefill(tree, search, { fields: false })).toEqual([{ path: 'source', value: 'newsletter' }])
    expect(queryPrefill(tree, search, { fields: true })).toEqual([
      { path: 'name', value: 'Ada' },
      { path: 'source', value: 'newsletter' },
    ])
  })

  it('leaves a field alone when its value does not convert', () => {
    expect(queryPrefill(tree, '?age=old&agree=perhaps&name=', { fields: true })).toEqual([{ path: 'name', value: '' }])
  })

  it('reads nothing from an empty query', () => {
    expect(queryPrefill(tree, '', { fields: true })).toEqual([])
    expect(queryPrefill(tree, '?', { fields: true })).toEqual([])
  })
})

describe('FormsGenForm with prefillSearch', () => {
  const form = (meta: Partial<FormSchema['meta']> = {}): FormSchema => ({
    $schema: 'formsgen/v2',
    meta: { name: 'prefill_demo', locale: 'en', dir: 'ltr', ...meta },
    tree: [
      node('text', 'name'),
      node('number', 'age'),
      node('checkboxgroup', 'topics', { items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }),
      node('hidden', 'source', { value: 'web', param: 'utm_source' }),
    ],
  })

  it('fills the answers from the string it is given and reports them', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: form({ prefillFromQuery: true }), prefillSearch: '?name=Ada&age=36&topics=a,b&utm_source=mail' },
    })
    await flushPromises()
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.at(-1)?.[0]).toEqual({ name: 'Ada', age: 36, topics: ['a', 'b'], source: 'mail' })
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('Ada')
  })

  it('without the flag only the hidden field listens to the address', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: form(), prefillSearch: '?name=Ada&utm_source=mail' },
    })
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ name: '', age: null, topics: [], source: 'mail' })
  })

  it('null reads nothing, even with the flag', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: form({ prefillFromQuery: true }), prefillSearch: null } })
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
