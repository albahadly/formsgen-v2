import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBuilderStore } from './builder'
import { HISTORY_LIMIT, useHistoryStore } from './history'

describe('history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  async function flush(): Promise<void> {
    // let the deep watcher fire, then the debounce window elapse
    await vi.advanceTimersByTimeAsync(200)
  }

  it('records one entry per settled change and undoes/redoes it', async () => {
    const builder = useBuilderStore()
    const history = useHistoryStore()
    history.start()

    builder.addElement('text')
    await flush()
    expect(history.canUndo).toBe(true)

    history.undo()
    await flush()
    expect(builder.schema.tree).toHaveLength(0)
    expect(history.canRedo).toBe(true)

    history.redo()
    await flush()
    expect(builder.schema.tree).toHaveLength(1)
    expect(builder.schema.tree[0]?.type).toBe('text')
  })

  it('batches rapid mutations into a single entry', async () => {
    const builder = useBuilderStore()
    const history = useHistoryStore()
    history.start()

    builder.addElement('group')
    builder.addElement('text') // lands inside the selected group, same window
    await flush()
    expect(history.past).toHaveLength(1)

    history.undo()
    await flush()
    expect(builder.schema.tree).toHaveLength(0)
  })

  it('a new change clears the redo stack', async () => {
    const builder = useBuilderStore()
    const history = useHistoryStore()
    history.start()

    builder.addElement('text')
    await flush()
    history.undo()
    await flush()
    builder.addElement('textarea')
    await flush()
    expect(history.canRedo).toBe(false)
    expect(builder.schema.tree[0]?.type).toBe('textarea')
  })

  it('drops the selection when the selected node vanishes on undo', async () => {
    const builder = useBuilderStore()
    const history = useHistoryStore()
    history.start()

    const node = builder.addElement('text')
    await flush()
    builder.select(node.id)
    history.undo()
    await flush()
    expect(builder.selectedId).toBeNull()
  })

  it('caps the stack at HISTORY_LIMIT entries', async () => {
    const builder = useBuilderStore()
    const history = useHistoryStore()
    history.start()

    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      builder.select(null)
      builder.addElement('text')
      await flush()
    }
    expect(history.past.length).toBeLessThanOrEqual(HISTORY_LIMIT)
  })

  it('selection changes alone create no history entries', async () => {
    const builder = useBuilderStore()
    const history = useHistoryStore()
    history.start()

    const node = builder.addElement('text')
    await flush()
    const before = history.past.length
    builder.select(null)
    builder.select(node.id)
    await flush()
    expect(history.past.length).toBe(before)
  })
})
