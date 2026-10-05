import { parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { listConditionSources } from '@/conditions/sources'
import { acceptsChildType } from '@/stores/builder'
import { getCssAdapter, type CssFrameworkId } from '../css'
import { defaultsObject, formDataType } from '../structure'
import { getTarget } from './index'

const people: ElementNode = {
  id: 'p',
  type: 'repeater',
  name: 'people',
  props: { label: 'People', itemLabel: 'Person {n}', minItems: 1, maxItems: 3, initialItems: 2 },
  children: [
    { id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }] },
    { id: 'h', type: 'checkbox', name: 'has_pet', props: { label: 'Has a pet' } },
    {
      id: 'pet',
      type: 'text',
      name: 'pet',
      props: { label: 'Pet name' },
      validation: [{ rule: 'required' }],
      conditions: [[{ field: 'people.has_pet', operator: 'equals', value: true }]],
    },
  ],
}

function schema(tree: ElementNode[]): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'demo', locale: 'en', dir: 'ltr' }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, fw: CssFrameworkId = 'vanilla') =>
  getTarget(target)!
    .generate({ schema: schema([people]), css: getCssAdapter(fw) })
    .map((f) => f.content)
    .join('\n')

describe('repeater in the builder', () => {
  it('accepts every field and static element, but no containers', () => {
    for (const type of ['text', 'heading', 'tags', 'file', 'imageupload', 'rangeslider', 'daterange', 'dates', 'matrix', 'phone']) {
      expect(acceptsChildType('repeater', type), type).toBe(true)
    }
    expect(acceptsChildType('repeater', 'group')).toBe(false)
    expect(acceptsChildType('repeater', 'repeater')).toBe(false)
  })

  it('condition sources: siblings inside the same repeater, never items from outside', () => {
    const tree = schema([{ id: 'e', type: 'email', name: 'email', props: { label: 'Email' } }, people]).tree
    const inside = listConditionSources(tree, 'pet').map((s) => `${s.path} | ${s.label}`)
    expect(inside).toEqual(['email | Email', 'people.name | People › Name', 'people.has_pet | People › Has a pet'])
    const outside = listConditionSources(tree, 'e').map((s) => s.path)
    expect(outside).toEqual([])
  })
})

describe('repeater in the export structure', () => {
  it('defaults and the TypeScript data type hold item arrays', () => {
    expect(defaultsObject(schema([people]))).toEqual({
      people: [
        { name: '', has_pet: false, pet: '' },
        { name: '', has_pet: false, pet: '' },
      ],
    })
    expect(formDataType(schema([people]))).toBe('{\n  people: Array<{\n    name: string\n    has_pet: boolean\n    pet: string\n  }>\n}')
  })
})

describe('repeater in every target', () => {
  it('vue: v-for with item bindings, indexed paths and per-item validators', () => {
    const vue = out('vue-standalone')
    expect(vue).toContain('<fieldset v-for="(item, i) in form.people" :key="fgKeyOf(item)"')
    expect(vue).toContain(':id="\'fg_people_\' + i + \'_name\'" v-model="item.name"')
    expect(vue).toContain(`v-if='(item.has_pet === true)'`)
    expect(vue).toContain("'people': {\n    'name': function (item: Record<string, unknown>) {")
    expect(vue).toContain('"people": form.people.map((item) => ({ "name": item.name, "has_pet": item.has_pet, ...((item.has_pet === true) ? { "pet": item.pet } : {}) }))')
    expect(vue).toContain('<div v-if="form.people.length > 1"')
    expect(vue).toContain('<button v-if="form.people.length < 3"')
  })

  it('react: keyed map, setField on indexed paths, typed validators', () => {
    const tsx = out('react')
    expect(tsx).toContain("{form.people.map((item, i) => (")
    expect(tsx).toContain("key={fgKeyAt('people', i)}")
    expect(tsx).toContain("setField(('people.' + i + '.name'), e.target.value)")
    expect(tsx).toContain('function fgValidatorFor(path: string)')
  })

  it('html: a <template> per repeater, cloned and re-indexed at runtime', () => {
    const html = out('html')
    expect(html).toContain('<template data-fg-template="people">')
    expect(html).toContain('id="fg_people___i___name"')
    expect(html).toContain('data-fg-icond="0"')
    expect(html).toContain('"people": fgItemIndexes("people").map(function (i) { return ({ "name": fgGet("people." + i + ".name")')
  })

  it('blazor: item class, @foreach with @key/@ref, interpolated ids, item validation', () => {
    const razor = out('blazor', 'bootstrap5')
    expect(razor).toContain('public List<FgPeopleItem> People { get; set; } = new() { new(), new(), };')
    expect(razor).toContain('public class FgPeopleItem')
    expect(razor).toContain('@foreach (var (item, i) in Model.People.Select((x, n) => (x, n)).ToList())')
    expect(razor).toContain('<fieldset @key="item"')
    expect(razor).toContain('id="@($"fg_people_{i}_name")" @bind-Value="item.Name"')
    expect(razor).toContain('@if ((Equals(item.HasPet, true)))')
    expect(razor).toContain('case FgPeopleItem item:')
    expect(razor).toContain('if (!((Equals(item.HasPet, true)))) return null;')
    expect(razor).toContain('if ((Equals(item.HasPet, true))) item0["pet"] = item.Pet;')
  })
})

describe('sortable repeaters (move up / move down)', () => {
  const sortable = { ...people, props: { ...people.props, sortable: true } }
  const gen = (target: string, node: ElementNode, fw: CssFrameworkId = 'vanilla', locale = 'en') => {
    const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'demo', locale, dir: 'ltr' }, tree: [node] })
    if (!result.ok) throw new Error(result.errors.join('\n'))
    return getTarget(target)!
      .generate({ schema: result.schema, css: getCssAdapter(fw) })
      .map((f) => f.content)
      .join('\n')
  }

  it('every target renders the buttons, a move handler and the labels only when sortable', () => {
    const handler = { 'vue-standalone': 'async function fgMoveItem(', react: 'function fgMoveItem(', html: 'function fgMoveItem(', blazor: 'private async Task FgMoveItem<T>(' }
    for (const [target, fn] of Object.entries(handler)) {
      const code = gen(target, sortable)
      expect(code, target).toContain('data-fg-move="up"')
      expect(code, target).toContain('data-fg-move="down"')
      expect(code, target).toContain(fn)
      expect(code, target).toContain('Move {label} up')
      expect(code, target).toContain('{label} moved to position {n}')
      const plain = gen(target, people)
      expect(plain, target).not.toContain('data-fg-move')
      expect(plain, target).not.toContain(fn)
    }
  })

  it('the first item has no up button and the last no down button; the remove button keeps its minimum', () => {
    expect(gen('vue-standalone', sortable)).toContain(`<button v-if="i > 0" type="button" class="fg-repeater-move" data-fg-move="up"`)
    expect(gen('vue-standalone', sortable)).toContain(`<button v-if="i < form.people.length - 1" type="button" class="fg-repeater-move" data-fg-move="down"`)
    expect(gen('vue-standalone', sortable)).toContain(`<button v-if="form.people.length > 1" type="button" class="fg-repeater-remove"`)
    expect(gen('react', sortable)).toContain(`{i > 0 && <button type="button" className="fg-repeater-move" data-fg-move="up"`)
    expect(gen('blazor', sortable)).toContain('@if (i < Model.People.Count - 1)')
    expect(gen('html', sortable)).toContain('up.hidden = index === 0')
  })

  it('framework classes and Arabic labels', () => {
    expect(gen('react', sortable, 'bootstrap5')).toContain('className="btn btn-outline-secondary btn-sm" data-fg-move="up"')
    expect(gen('vue-standalone', sortable, 'tailwind')).toMatch(/class="inline-flex h-8 w-8[^"]*" data-fg-move="up"/)
    expect(gen('blazor', sortable, 'vanilla', 'ar')).toContain('نقل {label} إلى الأعلى')
  })
})
