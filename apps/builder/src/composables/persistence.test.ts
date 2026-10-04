import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBuilderStore } from '@/stores/builder'
import { STORAGE_KEY, clearDraft, readDraft, startAutosave } from './persistence'

describe('draft persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('autosaves the schema after the debounce window', async () => {
    const store = useBuilderStore()
    startAutosave()
    store.addElement('text')
    await vi.advanceTimersByTimeAsync(700)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).tree).toHaveLength(1)
  })

  it('readDraft returns a valid non-empty schema and null otherwise', async () => {
    expect(readDraft()).toBeNull()

    localStorage.setItem(STORAGE_KEY, 'not json {')
    expect(readDraft()).toBeNull()

    const store = useBuilderStore()
    startAutosave()
    store.addElement('checkbox')
    await vi.advanceTimersByTimeAsync(700)
    const draft = readDraft()
    expect(draft?.tree[0]?.type).toBe('checkbox')
  })

  it('an empty tree is not offered as a draft', () => {
    const store = useBuilderStore()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.schema))
    expect(readDraft()).toBeNull()
  })

  it('clearDraft removes the stored draft', async () => {
    const store = useBuilderStore()
    startAutosave()
    store.addElement('text')
    await vi.advanceTimersByTimeAsync(700)
    clearDraft()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
