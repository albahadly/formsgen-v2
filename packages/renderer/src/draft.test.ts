import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FormsGenForm from './components/FormsGenForm.vue'
import { draftJson, draftKey, draftVersion, memoryStorage, readDraft, removeDraft, writeDraft, type DraftStorage } from './draft'
import type { ElementNode, FormSchema } from './schema'

const node = (id: string, type: string, name: string, props: Record<string, unknown> = {}, children?: ElementNode[]): ElementNode => ({
  id,
  type,
  name,
  props,
  validation: [],
  conditions: [],
  layout: {},
  style: {},
  ...(children ? { children } : {}),
})

const tree = (): ElementNode[] => [
  node('n1', 'text', 'first', { label: 'First name' }),
  node('n2', 'checkbox', 'agree', { label: 'Agree' }),
  node('n3', 'repeater', 'people', { label: 'People', initialItems: 1 }, [node('n4', 'text', 'pname', { label: 'Name' })]),
]

const schema = (extra: Partial<FormSchema['meta']> = {}, nodes: ElementNode[] = tree()): FormSchema => ({
  $schema: 'formsgen/v2',
  meta: { name: 'trip', locale: 'en', dir: 'ltr', saveDraft: true, ...extra },
  tree: nodes,
})

describe('draft helpers', () => {
  it('versions by the data shape and the writer', () => {
    const base = draftVersion(tree(), 'lib')
    expect(base).toMatch(/^[0-9a-f]{8}-lib$/)
    expect(draftVersion(tree(), 'lib')).toBe(base)
    expect(draftVersion(tree(), 'vue')).not.toBe(base)
    // Labels don't matter; names and types do.
    const relabeled = tree()
    relabeled[0]!.props['label'] = 'Given name'
    expect(draftVersion(relabeled, 'lib')).toBe(base)
    const renamed = tree()
    renamed[0]!.name = 'given'
    expect(draftVersion(renamed, 'lib')).not.toBe(base)
    const retyped = tree()
    retyped[0]!.type = 'number'
    expect(draftVersion(retyped, 'lib')).not.toBe(base)
  })

  it('leaves files out', () => {
    const file = new File(['x'], 'cv.pdf', { type: 'application/pdf' })
    expect(draftJson({ name: 'A', cv: [file], photo: file, list: ['a', file] })).toBe('{"name":"A","cv":[],"list":["a"]}')
  })

  it('reads only its own version and survives broken storage', () => {
    const storage = memoryStorage()
    expect(writeDraft(storage, 'trip', 'v1', '{"first":"Ann"}')).toBe(true)
    expect(storage.getItem(draftKey('trip'))).toBe('{"v":"v1","data":{"first":"Ann"}}')
    expect(readDraft(storage, 'trip', 'v1')).toEqual({ first: 'Ann' })
    expect(readDraft(storage, 'trip', 'v2')).toBeNull()
    storage.setItem(draftKey('trip'), '{oops')
    expect(readDraft(storage, 'trip', 'v1')).toBeNull()
    removeDraft(storage, 'trip')
    expect(storage.getItem(draftKey('trip'))).toBeNull()
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('full')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(readDraft(broken, 'trip', 'v1')).toBeNull()
    expect(writeDraft(broken, 'trip', 'v1', '{}')).toBe(false)
    expect(() => removeDraft(broken, 'trip')).not.toThrow()
    expect(readDraft(null, 'trip', 'v1')).toBeNull()
  })
})

describe('FormsGenForm with meta.saveDraft', () => {
  const stored = (storage: DraftStorage) => JSON.parse(storage.getItem(draftKey('trip')) ?? 'null') as { data: Record<string, unknown> } | null

  it('keeps answers as they change and forgets them when back to the start', async () => {
    const storage = memoryStorage()
    const wrapper = mount(FormsGenForm, { props: { schema: schema(), draftStorage: storage } })
    expect(wrapper.get('[data-fg-draft]').text()).toBe('Your answers are saved on this device until you send the form.')
    expect(wrapper.find('[data-fg-draft-clear]').exists()).toBe(false)
    expect(stored(storage)).toBeNull()

    await wrapper.get('input[name="first"]').setValue('Ann')
    expect(stored(storage)?.data).toEqual({ first: 'Ann', agree: false, people: [{ pname: '' }] })
    expect(wrapper.find('[data-fg-draft-clear]').exists()).toBe(true)

    await wrapper.get('input[name="first"]').setValue('')
    expect(stored(storage)).toBeNull()
    expect(wrapper.find('[data-fg-draft-clear]').exists()).toBe(false)
  })

  it('restores saved answers, then clears them on request', async () => {
    const storage = memoryStorage()
    writeDraft(storage, 'trip', draftVersion(tree(), 'lib'), '{"first":"Ann","agree":true,"people":[{"pname":"Bo"},{"pname":"Cy"}],"gone":1}')
    const wrapper = mount(FormsGenForm, { props: { schema: schema(), draftStorage: storage } })
    expect((wrapper.get('input[name="first"]').element as HTMLInputElement).value).toBe('Ann')
    expect((wrapper.get('input[name="agree"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.findAll('[data-fg-item]')).toHaveLength(2)
    expect(wrapper.get('[data-fg-draft]').text()).toContain('Welcome back! Your saved answers were restored.')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ first: 'Ann' })

    await wrapper.get('[data-fg-draft-clear]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(stored(storage)).toBeNull()
    expect((wrapper.get('input[name="first"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.findAll('[data-fg-item]')).toHaveLength(1)
    expect(wrapper.get('[data-fg-draft]').text()).toBe('Your answers are saved on this device until you send the form.')
    expect(wrapper.get('[data-fg-live]').text()).toBe('Saved answers cleared.')
  })

  it('ignores a draft saved for another version of the form', () => {
    const storage = memoryStorage()
    writeDraft(storage, 'trip', 'deadbeef-lib', '{"first":"Ann"}')
    const wrapper = mount(FormsGenForm, { props: { schema: schema(), draftStorage: storage } })
    expect((wrapper.get('input[name="first"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('[data-fg-draft-clear]').exists()).toBe(false)
  })

  it('forgets the answers once the form is sent, and keeps them again if the upload fails', async () => {
    const storage = memoryStorage()
    const wrapper = mount(FormsGenForm, { props: { schema: schema(), draftStorage: storage } })
    await wrapper.get('input[name="first"]').setValue('Ann')
    expect(stored(storage)).not.toBeNull()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(stored(storage)).toBeNull()
    expect(wrapper.find('[data-fg-draft-clear]').exists()).toBe(false)

    await wrapper.setProps({ upload: { state: 'uploading', progress: 0.2 } })
    await wrapper.setProps({ upload: { state: 'failed', progress: 0.2 } })
    expect(stored(storage)?.data).toMatchObject({ first: 'Ann' })
  })

  it('says files are not kept when the form has uploads', () => {
    const nodes = [...tree(), node('n5', 'file', 'cv', { label: 'CV' })]
    const wrapper = mount(FormsGenForm, { props: { schema: schema({}, nodes), draftStorage: memoryStorage() } })
    expect(wrapper.get('[data-fg-draft]').text()).toContain('Files aren’t saved; choose them again before sending.')
  })

  it('keeps nothing without meta.saveDraft', async () => {
    const storage = memoryStorage()
    const wrapper = mount(FormsGenForm, { props: { schema: schema({ saveDraft: undefined }), draftStorage: storage } })
    expect(wrapper.find('[data-fg-draft]').exists()).toBe(false)
    await wrapper.get('input[name="first"]').setValue('Ann')
    expect(stored(storage)).toBeNull()
  })
})
