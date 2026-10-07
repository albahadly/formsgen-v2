import { parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { listConditionSources } from '@/conditions/sources'
import { acceptsChildType, canDropInto } from '@/stores/builder'
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
  it('accepts every field, static element, layout container and one inner repeater; never tabs/steps', () => {
    for (const type of ['text', 'heading', 'tags', 'file', 'imageupload', 'rangeslider', 'daterange', 'dates', 'matrix', 'phone', 'group', 'columns', 'repeater']) {
      expect(acceptsChildType('repeater', type), type).toBe(true)
    }
    expect(acceptsChildType('repeater', 'tabs')).toBe(false)
    expect(acceptsChildType('repeater', 'steps')).toBe(false)
    const tree: ElementNode[] = [{ ...people, children: [{ id: 'in', type: 'repeater', name: 'inner', props: {}, children: [] }] }]
    const third: ElementNode = { id: 'x', type: 'repeater', name: 'x', props: {} }
    expect(canDropInto(tree, third, 'p')).toBe(true) // a second level
    expect(canDropInto(tree, third, 'in')).toBe(false) // never a third
    expect(canDropInto(tree, { id: 'g', type: 'group', name: 'grp', props: {} }, 'p')).toBe(false) // named group
    expect(canDropInto(tree, { id: 'g2', type: 'group', props: {}, children: [{ id: 't', type: 'tabs', props: {} }] }, 'p')).toBe(false)
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
    expect(razor).toContain('for (var n0 = 0; n0 < Model.People.Count; n0++)')
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
    expect(gen('react', sortable, 'bootstrap5')).toContain('className="btn btn-outline-secondary fg-repeater-move" data-fg-move="up"')
    expect(gen('vue-standalone', sortable, 'tailwind')).toMatch(/class="inline-flex h-8 w-8[^"]*" data-fg-move="up"/)
    expect(gen('blazor', sortable, 'vanilla', 'ar')).toContain('نقل {label} إلى الأعلى')
  })
})

describe('nested repeaters and layout inside items', () => {
  const trips: ElementNode = {
    id: 't',
    type: 'repeater',
    name: 'travellers',
    props: { label: 'Travellers', initialItems: 1 },
    children: [
      {
        id: 'c',
        type: 'columns',
        props: { count: 2 },
        children: [
          { id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }] },
          { id: 'h', type: 'checkbox', name: 'has_bags', props: { label: 'Has bags' } },
        ],
      },
      {
        id: 'b',
        type: 'repeater',
        name: 'bags',
        props: { label: 'Bags', initialItems: 1, minItems: 0 },
        conditions: [[{ field: 'travellers.has_bags', operator: 'equals', value: true }]],
        children: [{ id: 'w', type: 'number', name: 'weight', props: { label: 'Weight' }, validation: [{ rule: 'required' }] }],
      },
    ],
  }
  const gen = (target: string) => {
    const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'trip', locale: 'en', dir: 'ltr' }, tree: [trips] })
    if (!result.ok) throw new Error(result.errors.join('\n'))
    return getTarget(target)!
      .generate({ schema: result.schema, css: getCssAdapter('vanilla') })
      .map((f) => f.content)
      .join('\n')
  }
  const tripSchema = () => {
    const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'trip', locale: 'en', dir: 'ltr' }, tree: [trips] })
    if (!result.ok) throw new Error(result.errors.join('\n'))
    return result.schema
  }

  it('the data shape nests inner items; fields inside columns stay on the item', () => {
    expect(defaultsObject(tripSchema())).toEqual({ travellers: [{ name: '', has_bags: false, bags: [{ weight: null }] }] })
    const type = formDataType(tripSchema())
    expect(type).toMatch(/travellers: Array<\{\s*name: string\s*has_bags: boolean\s*bags: Array<\{\s*weight: number \| null\s*\}>\s*\}>/)
  })

  it('vue and react loop inner items as item2/j inside item/i', () => {
    const vue = gen('vue-standalone')
    expect(vue).toContain('v-for="(item2, j) in item.bags" :key="fgKeyOf(item2)"')
    expect(vue).toContain(`v-if='(item.has_bags === true)'`)
    expect(vue).toContain(`:id="('fg_travellers_' + i + '_bags_') + j + '_weight'"`)
    expect(vue).toContain(`'travellers.bags': (path) => {`)
    expect(vue).toContain('"bags": item.bags.map((item2) => ({ "weight": item2.weight }))')
    const react = gen('react')
    expect(react).toContain('{item.bags.map((item2, j) => (')
    expect(react).toContain(`key={fgKeyAt(('travellers.' + i + '.bags'), j)}`)
  })

  it('html nests the inner <template> and stamps it with the outer item', () => {
    const html = gen('html')
    expect(html).toContain('<template data-fg-template="travellers.__i__.bags">')
    expect(html).toContain('id="fg_travellers___i___bags___j___weight"')
    expect(html).toContain('fgItemIndexes("travellers." + i + ".bags").map(function (j)')
    expect(html).toContain("'weight': function (i, j) {")
  })

  it('blazor keeps the inner list on the outer item class and validates it per visible item', () => {
    const razor = gen('blazor')
    expect(razor).toContain('public List<FgTravellersBagsItem> Bags { get; set; } = new() { new(), };')
    expect(razor).not.toContain('public List<FgTravellersBagsItem> TravellersBags')
    expect(razor).toContain('@foreach (var (item2, j) in item.Bags.Select((x, n) => (x, n)).ToList())')
    expect(razor).toContain('id="@($"fg_travellers_{i}_bags_{j}_weight")"')
    expect(razor).toContain('if ((Equals(item.HasBags, true))) foreach (var item2 in item.Bags)')
    expect(razor).toContain('if ((Equals(item.HasBags, true))) item0["bags"] = list1;')
    // radio groups in items get their own name (the default would be shared: "item.Plan")
    const radios = getTarget('blazor')!
      .generate({ schema: schema([{ ...people, children: [{ id: 'pl', type: 'radiogroup', name: 'plan', props: { label: 'Plan', items: [{ value: 'a', label: 'A' }] } }] }]), css: getCssAdapter('vanilla') })
      .map((f) => f.content)
      .join('\n')
    expect(radios).toContain('<InputRadioGroup Name="@($"fg_people_{FgItemId(item)}_plan")" @bind-Value="item.Plan">')
  })

  it('condition sources: an inner field sees its own item and the top level; the inner repeater sees the outer item', () => {
    const tree = [{ id: 'trip', type: 'text', name: 'trip', props: { label: 'Trip' } }, trips] as ElementNode[]
    expect(listConditionSources(tree, 'w').map((x) => x.path)).toEqual(['trip'])
    const withFragile = structuredClone(tree)
    ;(withFragile[1]!.children![1]!.children ??= []).push({ id: 'f', type: 'checkbox', name: 'fragile', props: { label: 'Fragile' } })
    expect(listConditionSources(withFragile, 'w').map((x) => `${x.path} | ${x.label}`)).toEqual(['trip | Trip', 'travellers.bags.fragile | Bags › Fragile'])
    expect(listConditionSources(tree, 'b').map((x) => x.path)).toEqual(['trip', 'travellers.name', 'travellers.has_bags'])
  })
})

