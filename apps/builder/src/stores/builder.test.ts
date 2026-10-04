import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  canDropInto,
  containerDepth,
  subtreeHeight,
  useBuilderStore,
} from './builder'

describe('builder store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with an empty valid schema', () => {
    const store = useBuilderStore()
    expect(store.schema.$schema).toBe('formsgen/v2')
    expect(store.schema.tree).toEqual([])
    expect(store.selectedNode).toBeNull()
  })

  it('addElement appends to the root, names uniquely, and selects', () => {
    const store = useBuilderStore()
    const a = store.addElement('text')
    const b = store.addElement('text')
    expect(store.schema.tree).toHaveLength(2)
    expect(a.name).toBe('text')
    expect(b.name).toBe('text_2')
    expect(store.selectedId).toBe(b.id)
  })

  it('addElement adds INTO a selected container', () => {
    const store = useBuilderStore()
    const group = store.addElement('group')
    const field = store.addElement('text')
    expect(store.schema.tree).toHaveLength(1)
    expect(group.children).toHaveLength(1)
    expect(group.children?.[0]?.id).toBe(field.id)
  })

  it('removeElement removes nested nodes and clears the selection', () => {
    const store = useBuilderStore()
    store.addElement('group')
    const field = store.addElement('text')
    store.removeElement(field.id)
    expect(store.schema.tree[0]?.children).toHaveLength(0)
    expect(store.selectedId).toBeNull()
  })

  it('updateProps merges patches', () => {
    const store = useBuilderStore()
    const node = store.addElement('text')
    store.updateProps(node.id, { label: 'Email' })
    expect(node.props['label']).toBe('Email')
    expect(node.props['placeholder']).toBe('')
  })

  it('setName validates the pattern and sibling uniqueness', () => {
    const store = useBuilderStore()
    store.select(null)
    const a = store.addElement('text')
    store.select(null)
    const b = store.addElement('text')
    expect(store.setName(b.id, '2bad')).toBe('invalid')
    expect(store.setName(b.id, a.name!)).toBe('duplicate')
    expect(store.setName(b.id, 'email')).toBeNull()
    expect(b.name).toBe('email')
  })

  it('allows the same name in different container scopes', () => {
    const store = useBuilderStore()
    const a = store.addElement('text')
    store.setName(a.id, 'title')
    store.select(null)
    store.addElement('group')
    const nested = store.addElement('text')
    expect(store.setName(nested.id, 'title')).toBeNull()
  })

  it('setColSpan sets and clears layout', () => {
    const store = useBuilderStore()
    const node = store.addElement('text')
    store.setColSpan(node.id, 6)
    expect(node.layout?.colSpan).toBe(6)
    store.setColSpan(node.id, undefined)
    expect(node.layout).toBeUndefined()
  })

  it('setValidation sets and clears rules', () => {
    const store = useBuilderStore()
    const node = store.addElement('text')
    store.setValidation(node.id, [{ rule: 'required' }])
    expect(node.validation).toEqual([{ rule: 'required' }])
    store.setValidation(node.id, [])
    expect(node.validation).toBeUndefined()
  })

  it('setChildren replaces root and container lists (drag-and-drop path)', () => {
    const store = useBuilderStore()
    const group = store.addElement('group')
    store.select(null)
    const field = store.addElement('text')
    // simulate dragging the field into the group
    store.setChildren(null, [group])
    store.setChildren(group.id, [field])
    expect(store.schema.tree).toHaveLength(1)
    expect(group.children?.[0]?.id).toBe(field.id)
  })

  it('updateMeta merges patches; setMetaName validates; theme tokens set/clear', () => {
    const store = useBuilderStore()
    store.updateMeta({ title: 'Contact us', dir: 'rtl' })
    expect(store.schema.meta.title).toBe('Contact us')
    expect(store.schema.meta.dir).toBe('rtl')

    expect(store.setMetaName('2bad')).toBe('invalid')
    expect(store.schema.meta.name).toBe('untitled_form')
    expect(store.setMetaName('contact_form')).toBeNull()
    expect(store.schema.meta.name).toBe('contact_form')

    store.setThemeToken('color-primary', '#123456')
    expect(store.schema.meta.theme).toEqual({ 'color-primary': '#123456' })
    store.setThemeToken('color-primary', null)
    expect(store.schema.meta.theme).toBeUndefined()
  })

  it('duplicateElement deep-clones with fresh ids and unique names', () => {
    const store = useBuilderStore()
    const group = store.addElement('group')
    const field = store.addElement('text') // nested via selected container
    const copy = store.duplicateElement(group.id)!
    expect(store.schema.tree).toHaveLength(2)
    expect(copy.id).not.toBe(group.id)
    expect(copy.children?.[0]?.id).not.toBe(field.id)
    expect(copy.children?.[0]?.name).not.toBe(field.name)
    expect(store.selectedId).toBe(copy.id)
  })
})

describe('drop guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('subtreeHeight and containerDepth', () => {
    const store = useBuilderStore()
    const g1 = store.addElement('group')
    const g2 = store.addElement('group') // nested in g1 (selected container)
    store.addElement('text') // nested in g2
    expect(subtreeHeight(g1)).toBe(3)
    expect(containerDepth(store.schema.tree, null)).toBe(0)
    expect(containerDepth(store.schema.tree, g1.id)).toBe(1)
    expect(containerDepth(store.schema.tree, g2.id)).toBe(2)
  })

  it('rejects dropping a container into its own subtree', () => {
    const store = useBuilderStore()
    const g1 = store.addElement('group')
    const g2 = store.addElement('group')
    expect(canDropInto(store.schema.tree, g1, g2.id)).toBe(false)
    expect(canDropInto(store.schema.tree, g1, g1.id)).toBe(false)
    expect(canDropInto(store.schema.tree, g2, null)).toBe(true)
  })

  it('rejects drops beyond the max nesting depth', () => {
    const store = useBuilderStore()
    store.addElement('group') // depth 1 container
    store.addElement('group') // depth 2
    store.addElement('group') // depth 3
    const g4 = store.addElement('group') // depth 4
    const tall = store.duplicateElement(store.schema.tree[0]!.id)! // height-4 subtree
    expect(canDropInto(store.schema.tree, tall, g4.id)).toBe(false)
    const flat = store.addElement('text')
    expect(canDropInto(store.schema.tree, flat, g4.id)).toBe(true)
  })
})

describe('keyboard move actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('moveSibling swaps within bounds and reports edges', () => {
    const store = useBuilderStore()
    const a = store.addElement('text')
    store.select(null)
    const b = store.addElement('textarea')
    expect(store.moveSibling(b.id, -1)).toBe(true)
    expect(store.schema.tree.map((n) => n.id)).toEqual([b.id, a.id])
    expect(store.moveSibling(b.id, -1)).toBe(false)
  })

  it('moveOut lifts a nested node after its container', () => {
    const store = useBuilderStore()
    const group = store.addElement('group')
    const field = store.addElement('text') // nested (selected container)
    expect(store.moveOut(field.id)).toBe(true)
    expect(group.children).toHaveLength(0)
    expect(store.schema.tree.map((n) => n.id)).toEqual([group.id, field.id])
    expect(store.moveOut(field.id)).toBe(false) // already at root
  })

  it('moveInto drops a node into the nearest preceding container', () => {
    const store = useBuilderStore()
    const group = store.addElement('group')
    store.select(null)
    const field = store.addElement('text')
    expect(store.moveInto(field.id)).toBe(true)
    expect(group.children?.map((n) => n.id)).toEqual([field.id])
    // no preceding container -> refused
    store.select(null)
    const lonely = store.addElement('text')
    store.setChildren(null, [lonely])
    expect(store.moveInto(lonely.id)).toBe(false)
  })
})
