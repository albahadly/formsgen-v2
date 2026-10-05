import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { acceptsFile, describeFiles, fileLimits, fileProblem, hasUploadFields, sendSubmission, toSubmission } from './files'
import { MESSAGES } from './messages'
import type { ElementNode, FormSchema } from './schema'

const file = (name: string, type: string, bytes = 10): File => new File([new Uint8Array(bytes)], name, { type })

describe('upload helpers', () => {
  it('accept lists: extensions, wildcards and exact types', () => {
    expect(acceptsFile({ name: 'cv.PDF', type: 'application/pdf' }, '.pdf')).toBe(true)
    expect(acceptsFile({ name: 'a.png', type: 'image/png' }, 'image/*')).toBe(true)
    expect(acceptsFile({ name: 'a.txt', type: 'text/plain' }, 'image/*, .pdf')).toBe(false)
    expect(acceptsFile({ name: 'a.txt', type: 'text/plain' }, '')).toBe(true)
  })

  it('limits come from props; image uploads accept images by default', () => {
    expect(fileLimits({ id: 'f', type: 'file', props: {} })).toEqual({ multiple: false, accept: '', maxSizeMb: 0, maxFiles: 1 })
    expect(fileLimits({ id: 'i', type: 'imageupload', props: { multiple: true, maxFiles: 3, maxSizeMb: 2 } })).toEqual({
      multiple: true,
      accept: 'image/*',
      maxSizeMb: 2,
      maxFiles: 3,
    })
  })

  it('problems: count, then type, then size — with localized messages', () => {
    const limits = { multiple: true, accept: '.pdf', maxSizeMb: 1, maxFiles: 2 }
    expect(fileProblem([file('a.pdf', ''), file('b.pdf', ''), file('c.pdf', '')], limits, MESSAGES.en)).toBe('Choose at most 2 files')
    expect(fileProblem([file('a.doc', '')], limits, MESSAGES.en)).toBe('a.doc is not an accepted file type')
    expect(fileProblem([file('big.pdf', '', 2 * 1024 * 1024)], limits, MESSAGES.ar)).toBe('حجم big.pdf أكبر من 1 ميغابايت')
    expect(fileProblem([file('ok.pdf', '')], limits, MESSAGES.en)).toBeNull()
  })

  it('multipart: a JSON "data" part (files described) + one part per file by data path', async () => {
    const cv = file('cv.pdf', 'application/pdf', 3)
    const photo = file('me.png', 'image/png', 4)
    const payload = { name: 'Ann', cv: [cv], account: { photo: [photo] } }
    const { data, files } = describeFiles(payload)
    expect(data).toEqual({
      name: 'Ann',
      cv: [{ name: 'cv.pdf', size: 3, type: 'application/pdf' }],
      account: { photo: [{ name: 'me.png', size: 4, type: 'image/png' }] },
    })
    expect(files.map((f) => f.path)).toEqual(['cv', 'account.photo'])
    const submission = toSubmission(payload)
    const body = submission.body as FormData
    expect(submission.headers).toEqual({})
    expect(JSON.parse(body.get('data') as string)).toEqual(data)
    expect((body.get('cv') as File).name).toBe('cv.pdf')
    expect(toSubmission({ name: 'Ann' })).toEqual({ body: '{"name":"Ann"}', headers: { 'Content-Type': 'application/json' } })
    const empty = toSubmission({ name: 'Ann', cv: [] }, { multipart: true }).body as FormData
    expect(JSON.parse(empty.get('data') as string)).toEqual({ name: 'Ann', cv: [] })
  })

  it('finds upload fields at any depth', () => {
    const node = (type: string, children?: ElementNode[]): ElementNode => ({ id: type, type, props: {}, children })
    expect(hasUploadFields([node('group', [node('text'), node('imageupload')])])).toBe(true)
    expect(hasUploadFields([node('text')])).toBe(false)
  })
})

describe('<FormsGenForm> with an upload field', () => {
  const tree: ElementNode[] = [
    {
      id: 'docs',
      type: 'file',
      name: 'docs',
      props: { label: 'Documents', multiple: true, accept: '.pdf', maxSizeMb: 1, maxFiles: 2 },
      validation: [{ rule: 'required' }],
    },
  ]
  const schema = { $schema: 'formsgen/v2', meta: { name: 'f', locale: 'en', dir: 'ltr' }, tree } as FormSchema
  const pick = async (input: HTMLInputElement, files: File[]) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    input.dispatchEvent(new Event('change'))
    await flushPromises()
  }

  it('picks, lists, validates, removes and submits real File objects', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    const input = wrapper.get('input[type=file]').element as HTMLInputElement
    expect(input.multiple).toBe(true)
    expect(input.accept).toBe('.pdf')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('This field is required')
    await pick(input, [file('a.pdf', 'application/pdf'), file('b.doc', 'application/msword')])
    expect(wrapper.findAll('.fg-file-item').map((li) => li.get('.fg-file-name').text())).toEqual(['a.pdf', 'b.doc'])
    expect(wrapper.get('.fg-error').text()).toBe('b.doc is not an accepted file type')
    await wrapper.findAll('.fg-file-remove')[1]!.trigger('click')
    expect(wrapper.find('.fg-error').exists()).toBe(false)
    expect(wrapper.get('.fg-file-remove').attributes('aria-label')).toBe('Remove a.pdf')
    await wrapper.get('form').trigger('submit')
    const submitted = wrapper.emitted('submit')?.[0]?.[0] as { docs: File[] }
    expect(submitted.docs).toHaveLength(1)
    expect(submitted.docs[0]).toBeInstanceOf(File)
    // v-model updates keep the File objects too
    const model = wrapper.emitted('update:modelValue')!.at(-1)![0] as { docs: File[] }
    expect(model.docs[0]).toBeInstanceOf(File)
    wrapper.unmount()
  })

  it('wraps the input in a drop zone that highlights while files are dragged over', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    const zone = wrapper.get('.fg-file-drop')
    expect(zone.get('.fg-file-drop-text').text()).toBe('Choose files or drag them here')
    // The input covers the zone, so drops and clicks land on it.
    const input = zone.get('input[type=file]')
    await input.trigger('dragenter')
    expect(zone.attributes('data-fg-dragging')).toBe('')
    await input.trigger('dragleave')
    expect(zone.attributes('data-fg-dragging')).toBeUndefined()
    await input.trigger('dragenter')
    await pick(input.element as HTMLInputElement, [file('a.pdf', 'application/pdf')])
    expect(zone.attributes('data-fg-dragging')).toBeUndefined()
    expect(wrapper.findAll('.fg-file-item')).toHaveLength(1)
    wrapper.unmount()
  })

  it('says "Choose a file" when the field takes one file', () => {
    const single = { ...schema, tree: [{ ...tree[0]!, props: { label: 'CV' } }] } as FormSchema
    const wrapper = mount(FormsGenForm, { props: { schema: single } })
    expect(wrapper.get('.fg-file-drop-text').text()).toBe('Choose a file or drag it here')
  })

  it('shows upload progress from the upload prop and disables submit meanwhile', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    expect(wrapper.find('[data-fg-upload]').exists()).toBe(false)
    await wrapper.setProps({ upload: { state: 'uploading', progress: 0.42 } })
    await flushPromises()
    const bar = wrapper.get('[role=progressbar]')
    expect(bar.attributes('aria-valuenow')).toBe('42')
    expect(bar.attributes('aria-label')).toBe('Upload progress')
    expect(wrapper.get('.fg-progress-bar').attributes('style')).toContain('inline-size: 42%')
    expect(wrapper.get('.fg-progress-text').text()).toBe('Uploading… 42%')
    expect(wrapper.get('[data-fg-live]').text()).toBe('Uploading files…')
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ upload: { state: 'done', progress: 1 } })
    await flushPromises()
    expect(wrapper.get('.fg-progress-text').text()).toBe('Upload complete.')
    expect(wrapper.get('[data-fg-live]').text()).toBe('Form submitted.')
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeUndefined()
    await wrapper.setProps({ upload: { state: 'failed', progress: 0.3 } })
    await flushPromises()
    expect(wrapper.find('[role=progressbar]').exists()).toBe(false)
    expect(wrapper.get('[data-fg-upload] .fg-error').text()).toBe('Upload failed. Please try again.')
    expect(wrapper.get('[data-fg-live]').text()).toBe('Upload failed. Please try again.')
    wrapper.unmount()
  })
})

describe('sendSubmission', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** A stand-in XMLHttpRequest that records the request and lets the test drive it. */
  function fakeXhr() {
    const sent: { method?: string; url?: string; body?: unknown; headers: Record<string, string> } = { headers: {} }
    let current: FakeXhr | null = null
    class FakeXhr {
      status = 0
      upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      onabort: (() => void) | null = null
      constructor() {
        current = this // eslint-disable-line @typescript-eslint/no-this-alias
      }
      open(method: string, url: string) {
        sent.method = method
        sent.url = url
      }
      setRequestHeader(name: string, value: string) {
        sent.headers[name] = value
      }
      send(body: unknown) {
        sent.body = body
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
    return { sent, xhr: () => current! }
  }

  it('posts multipart, reports progress and resolves ok on 2xx', async () => {
    const { sent, xhr } = fakeXhr()
    const progress: number[] = []
    const done = sendSubmission('/api', { cv: [file('a.pdf', 'application/pdf')] }, { onProgress: (p) => progress.push(p) })
    expect(sent.method).toBe('POST')
    expect(sent.url).toBe('/api')
    expect(sent.body).toBeInstanceOf(FormData)
    xhr().upload.onprogress!({ lengthComputable: true, loaded: 25, total: 100 } as ProgressEvent)
    xhr().upload.onprogress!({ lengthComputable: false, loaded: 50, total: 0 } as ProgressEvent)
    xhr().status = 201
    xhr().onload!()
    expect(await done).toEqual({ ok: true, status: 201 })
    expect(progress).toEqual([0.25])
  })

  it('sends JSON without files and resolves not ok on errors', async () => {
    const { sent, xhr } = fakeXhr()
    const failed = sendSubmission('/api', { name: 'Ana' }, { method: 'PUT' })
    expect(sent.method).toBe('PUT')
    expect(sent.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(sent.body).toBe('{"name":"Ana"}')
    xhr().status = 500
    xhr().onload!()
    expect(await failed).toEqual({ ok: false, status: 500 })
    const offline = sendSubmission('/api', { name: 'Ana' })
    xhr().onerror!()
    expect(await offline).toEqual({ ok: false, status: 0 })
  })
})
