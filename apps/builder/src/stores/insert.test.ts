// insertElement (phase 46): a pasted node gets fresh ids and unique names
// and lands after the selected element, inside a selected container that
// takes it, or at the end of the form; what cannot go anywhere is refused.
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilderStore } from './builder'

const text = (id: string, name: string) => ({ id, type: 'text', name, props: { label: name } })

describe('insertElement', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lands after the selected element with a fresh id and a unique name, and is selected', () => {
    const store = useBuilderStore()
    store.schema.tree = [text('a', 'email'), text('b', 'phone')]
    store.select('a')
    const inserted = store.insertElement(text('zzz', 'email'), 'a')
    expect(inserted).not.toBeNull()
    expect(store.schema.tree.map((n) => n.id)).toEqual(['a', inserted!.id, 'b'])
    expect(inserted!.id).not.toBe('zzz')
    expect(inserted!.name).toBe('email_2')
    expect(store.selectedId).toBe(inserted!.id)
  })

  it('goes inside a selected container that takes it, else to the end of the form', () => {
    const store = useBuilderStore()
    store.schema.tree = [{ id: 'g', type: 'group', name: 'home', props: { label: 'Home' }, children: [] }, text('b', 'phone')]
    const inside = store.insertElement(text('x', 'street'), 'g')
    expect(store.schema.tree[0]!.children!.map((n) => n.id)).toEqual([inside!.id])
    const atEnd = store.insertElement(text('y', 'city'), null)
    expect(store.schema.tree.at(-1)!.id).toBe(atEnd!.id)
    // children of a pasted container get fresh ids too
    const copy = store.insertElement({ id: 'g', type: 'group', name: 'home', props: { label: 'Home' }, children: [text('x', 'street')] }, null)
    expect(copy!.id).not.toBe('g')
    expect(copy!.name).toBe('home_2')
    expect(copy!.children![0]!.id).not.toBe('x')
    expect(copy!.children![0]!.name).toBe('street_2')
  })

  it('refuses what cannot go anywhere, and falls back to the root when the anchor cannot take it', () => {
    const store = useBuilderStore()
    store.schema.tree = [{ id: 'r', type: 'repeater', name: 'people', props: { label: 'People' }, children: [text('n', 'name')] }]
    // a currency field cannot sit inside a repeater item: it lands at the root instead
    const price = store.insertElement({ id: 'c', type: 'currency', name: 'price', props: { label: 'Price' } }, 'n')
    expect(price).not.toBeNull()
    expect(store.schema.tree.map((n) => n.type)).toEqual(['repeater', 'currency'])
    // a section cannot stand at the root
    expect(store.insertElement({ id: 't', type: 'tab', props: { label: 'One' }, children: [] }, null)).toBeNull()
  })
})
