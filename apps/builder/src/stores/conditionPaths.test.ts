import { findNodeById, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick, type WatchStopHandle } from 'vue'
import { createEmptySchema, useBuilderStore } from './builder'
import { startConditionPathTracking } from './conditionPaths'

function schemaWith(tree: ElementNode[]): FormSchema {
  return { ...createEmptySchema(), tree }
}

/** `phone` is shown when `method` equals "phone". */
function sample(): ElementNode[] {
  return [
    { id: 'method', type: 'text', name: 'method', props: {} },
    { id: 'account', type: 'group', name: 'account', props: {}, children: [] },
    {
      id: 'phone',
      type: 'text',
      name: 'phone',
      props: {},
      conditions: [[{ field: 'method', operator: 'equals', value: 'phone' }]],
    },
  ]
}

const fieldOf = (store: ReturnType<typeof useBuilderStore>): string =>
  findNodeById(store.schema.tree, 'phone')!.conditions![0]![0]!.field

describe('condition references follow field path changes', () => {
  let stop: WatchStopHandle
  let store: ReturnType<typeof useBuilderStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useBuilderStore()
    store.loadSchema(schemaWith(sample()))
    stop = startConditionPathTracking()
  })
  afterEach(() => stop())

  it('renaming the referenced field rewrites the condition', async () => {
    expect(store.setName('method', 'contact_method')).toBeNull()
    await nextTick()
    expect(fieldOf(store)).toBe('contact_method')
  })

  it('dragging the field into a named group (two list updates in one tick) rewrites it', async () => {
    const method = findNodeById(store.schema.tree, 'method')!
    // vuedraggable: the target list gains the node, then the source list drops it
    store.setChildren('account', [method])
    store.setChildren(
      null,
      store.schema.tree.filter((n) => n.id !== 'method'),
    )
    await nextTick()
    expect(fieldOf(store)).toBe('account.method')
  })

  it('renaming a named group rewrites references to fields inside it', async () => {
    store.setChildren('account', [findNodeById(store.schema.tree, 'method')!])
    store.setChildren(null, store.schema.tree.filter((n) => n.id !== 'method'))
    await nextTick()
    expect(store.setName('account', 'profile')).toBeNull()
    await nextTick()
    expect(fieldOf(store)).toBe('profile.method')
  })

  it('replacing the whole schema (undo/redo, open project) only re-baselines', async () => {
    const restored = schemaWith(sample())
    findNodeById(restored.tree, 'method')!.name = 'other'
    store.schema = restored // as history.apply() does
    await nextTick()
    // the restored snapshot is kept exactly as it was
    expect(fieldOf(store)).toBe('method')
  })

  it('deleting the referenced field leaves the condition for the author to fix', async () => {
    store.removeElement('method')
    await nextTick()
    expect(fieldOf(store)).toBe('method')
  })
})

describe('setConditions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('drops empty groups and removes the key when nothing is left', () => {
    const store = useBuilderStore()
    store.loadSchema(schemaWith(sample()))
    store.setConditions('phone', [[], [{ field: 'method', operator: 'not-empty' }]])
    expect(findNodeById(store.schema.tree, 'phone')!.conditions).toEqual([
      [{ field: 'method', operator: 'not-empty' }],
    ])
    store.setConditions('phone', [[]])
    expect('conditions' in findNodeById(store.schema.tree, 'phone')!).toBe(false)
  })
})
