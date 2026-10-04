import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilderStore } from './builder'

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
})
