import { MESSAGES, parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { operatorsFor } from '@/conditions/sources'
import { FILE_HELPERS, compileValidator } from '../compile'
import { getCssAdapter } from '../css'
import { formDataType } from '../structure'
import { getTarget } from './index'

const docs: ElementNode = {
  id: 'docs',
  type: 'file',
  name: 'docs',
  props: { label: 'Documents', multiple: true, accept: '.pdf', maxSizeMb: 1, maxFiles: 2 },
  validation: [{ rule: 'required' }],
}
const photo: ElementNode = {
  id: 'photo',
  type: 'imageupload',
  name: 'photo',
  props: { label: 'Photo', accept: 'image/*', maxSizeMb: 2 },
}
const note: ElementNode = {
  id: 'note',
  type: 'text',
  name: 'note',
  props: { label: 'Note' },
  conditions: [[{ field: 'docs', operator: 'not-empty' }]],
}

function schema(tree: ElementNode[], extra: Partial<FormSchema['meta']> = {}): FormSchema {
  const result = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'up', locale: 'en', dir: 'ltr', submit: { url: 'https://example.com/apply', method: 'POST' }, ...extra },
    tree,
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter('vanilla') })
    .map((f) => f.content)
    .join('\n')

const file = (name: string, type: string, size = 10): File => new File([new Uint8Array(size)], name, { type })

describe('generated upload helpers (JS)', () => {
  const helpers = new Function(`${FILE_HELPERS}\nreturn { fgAccepts, fgFileProblem, fgMultipart, fgFileJson }`)() as {
    fgAccepts: (f: File, accept: string) => boolean
    fgFileProblem: (v: unknown, accept: string, maxMb: number, maxFiles: number, m: Record<string, string>) => string | null
    fgMultipart: (payload: Record<string, unknown>) => FormData
  }
  const m = { tooMany: 'too many', type: '{name} type', size: '{name} size' }

  it('accept tokens: extensions, type wildcards and exact types', () => {
    expect(helpers.fgAccepts(file('a.PDF', ''), '.pdf')).toBe(true)
    expect(helpers.fgAccepts(file('a.png', 'image/png'), 'image/*')).toBe(true)
    expect(helpers.fgAccepts(file('a.txt', 'text/plain'), 'image/*, application/pdf')).toBe(false)
    expect(helpers.fgAccepts(file('a.txt', 'text/plain'), '')).toBe(true)
  })

  it('reports the count first, then each file type before size', () => {
    expect(helpers.fgFileProblem([file('a.pdf', ''), file('b.pdf', ''), file('c.pdf', '')], '.pdf', 1, 2, m)).toBe('too many')
    expect(helpers.fgFileProblem([file('a.exe', '', 5_000_000)], '.pdf', 1, 0, m)).toBe('a.exe type')
    expect(helpers.fgFileProblem([file('a.pdf', '', 2_000_000)], '.pdf', 1, 0, m)).toBe('a.pdf size')
    expect(helpers.fgFileProblem([], '.pdf', 1, 2, m)).toBeNull()
  })

  it('multipart: a JSON data part, then one part per file named by data path', async () => {
    const a = file('a.pdf', 'application/pdf')
    const p = file('me.png', 'image/png')
    const body = helpers.fgMultipart({ name: 'Ann', docs: [a], profile: { photo: [p] }, none: [] })
    expect(JSON.parse(body.get('data') as string)).toEqual({
      name: 'Ann',
      docs: [{ name: 'a.pdf', size: 10, type: 'application/pdf' }],
      profile: { photo: [{ name: 'me.png', size: 10, type: 'image/png' }] },
      none: [],
    })
    expect([...body.keys()]).toEqual(['data', 'docs', 'profile.photo'])
    expect((body.get('profile.photo') as File).name).toBe('me.png')
  })

  it('validators check required, then the files, then other rules', () => {
    const body = compileValidator(
      [{ rule: 'min', value: 1, message: 'min' }, { rule: 'required', message: 'required' }],
      'data.docs',
      (path) => `data.${path}`,
      `fgFileProblem(v, '.pdf', 1, 0, ${JSON.stringify(m)})`,
    )
    const run = new Function('data', `${FILE_HELPERS}\nconst fgIsEmpty = (v) => v == null || (Array.isArray(v) && v.length === 0); const fgIsBlank = fgIsEmpty; const fgSize = (v) => v.length\n${body}`) as (data: unknown) => string | null
    expect(run({ docs: [] })).toBe('required')
    expect(run({ docs: [file('a.exe', '')] })).toBe('a.exe type')
    expect(run({ docs: [file('a.pdf', '')] })).toBeNull()
  })
})

describe('uploads in every code target', () => {
  const s = schema([docs, photo, note])

  it('JS targets post multipart when the form has uploads, JSON otherwise', () => {
    for (const target of ['html', 'react', 'vue-standalone']) {
      const code = out(target, s)
      // sent with XMLHttpRequest (fgSend), which reports upload progress
      expect(code, target).toMatch(/fgSend\(\s*"https:\/\/example\.com\/[a-z]+",\s*"POST",\s*fgMultipart\(data\)/)
      expect(code, target).not.toContain("'Content-Type': 'application/json'")
      const plain = out(target, schema([note]))
      expect(plain, target).toContain("'Content-Type': 'application/json'")
      expect(plain, target).not.toContain('fgMultipart')
    }
  })

  it('typed targets model uploads as File[]', () => {
    expect(formDataType(s)).toContain('docs: File[]')
    expect(out('react', s)).toContain('fgPickFiles(')
    expect(out('vue-standalone', s)).toContain("@change=\"fgPickFiles('docs', $event)\"")
  })

  it('blazor buffers picks, validates in order and posts quoted multipart parts', () => {
    const razor = out('blazor', s)
    expect(razor).toContain('public List<FgUpload> Docs { get; set; } = new();')
    expect(razor).toContain(`FgPickFiles(Model.Docs, e, true, ${1024 * 1024}L, false, "Docs")`)
    expect(razor).toContain(`FgPickFiles(Model.Photo, e, false, ${2 * 1024 * 1024}L, true, "Photo")`)
    expect(razor).toContain('<InputFile @key=\'fgFileKeys["Docs"]\'')
    expect(razor).toContain('new System.Net.Http.MultipartFormDataContent()')
    expect(razor).toContain('body.Add(FgFilePart(file, path));')
    expect(razor).toContain('payload["docs"] = FgFilesPart(parts, "docs", Model.Docs);')
    // required → count → per-file type/size
    const required = razor.indexOf('if (Docs.Count == 0)')
    const tooMany = razor.indexOf('if (Docs.Count > 2)')
    const perFile = razor.indexOf('if (!FgAccepts(file, ".pdf"))')
    expect(required).toBeGreaterThan(0)
    expect(tooMany).toBeGreaterThan(required)
    expect(perFile).toBeGreaterThan(tooMany)
    // list conditions use element semantics, and the helpers are emitted
    expect(razor).toContain('!FgIsBlank(Model.Docs)')
    expect(razor).toContain('private static bool FgIsBlank(object? value)')
    expect(razor).toContain('private static bool FgAccepts(FgUpload file, string accept)')
    expect(razor).not.toContain('private static bool FgContains(')
  })

  it('blazor omits upload machinery for forms without uploads', () => {
    const razor = out('blazor', schema([{ ...note, conditions: undefined }]))
    expect(razor).not.toContain('FgUpload')
    expect(razor).not.toContain('FgIsBlank')
    expect(razor).toContain('PostAsJsonAsync')
  })

  it('arabic forms localize file messages in every target', () => {
    const ar = schema([docs], { locale: 'ar', dir: 'rtl' })
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, ar)
      expect(code, target).toContain(MESSAGES.ar.removeFile)
      expect(code, target).toContain(MESSAGES.ar.tooManyFiles.replace('{n}', '2'))
    }
  })

  it('conditions on uploads offer only presence operators', () => {
    expect(operatorsFor('file')).toEqual(['not-empty', 'empty'])
  })
})

describe('drop zones and upload progress', () => {
  const s = schema([docs, photo])
  const noUrl = (tree: ElementNode[]): FormSchema => {
    const base = schema(tree)
    return { ...base, meta: { ...base.meta, submit: undefined } }
  }

  it('every target puts the file input over a drop zone with its text', () => {
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, s)
      expect(code, target).toContain('class' + (target === 'react' ? 'Name' : '') + '="fg-file-drop"')
      expect(code, target).toContain(MESSAGES.en.dropFiles) // docs: several files
      expect(code, target).toContain(MESSAGES.en.dropFile) // photo: one file
    }
    expect(out('vue-standalone', s)).toContain('@dragenter="fgDrag($event.currentTarget, true)"')
    expect(out('react', s)).toContain('onDragEnter={(e) => fgDrag(e.currentTarget, true)}')
    expect(out('html', s)).toContain("input.addEventListener('dragenter', drag(true))")
    const razor = out('blazor', s)
    expect(razor).toContain(`data-fg-dragging='@(fgDragging["Docs"] ? "" : null)'`)
    expect(razor).toContain(`@ondragenter='() => fgDragging["Docs"] = true'`)
  })

  it('forms that post uploads show progress and disable submit while sending', () => {
    const vue = out('vue-standalone', s)
    expect(vue).toContain('role="progressbar"')
    expect(vue).toContain(`:disabled="fgUpload.state === 'uploading'"`)
    expect(vue).toContain(`fgAnnounce(${JSON.stringify(MESSAGES.en.uploadStarted)})`)
    const react = out('react', s)
    expect(react).toContain('aria-valuenow={fgUpload.percent}')
    expect(react).toContain(`disabled={fgUpload.state === 'uploading'}`)
    const html = out('html', s)
    expect(html).toContain('data-fg-upload hidden')
    expect(html).toContain("fgUploadPaint('uploading', 0)")
    const razor = out('blazor', s)
    expect(razor).toContain('new FgProgressContent(body, percent =>')
    expect(razor).toContain(`disabled='@(fgUploadState == "uploading")'`)
    expect(razor).toContain('ok = response.IsSuccessStatusCode;')
  })

  it('without a submit URL (or without uploads) there is no progress machinery', () => {
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      for (const code of [out(target, noUrl([docs])), out(target, schema([note]))]) {
        expect(code, target).not.toContain('progressbar')
        expect(code, target).not.toMatch(/fgUpload\b|FgProgressContent|fgUploadState/)
      }
    }
  })

  it('Bootstrap exports ship the drop-zone rules Bootstrap has no utilities for', () => {
    const files = getTarget('html')!.generate({ schema: s, css: getCssAdapter('bootstrap5') })
    expect(files[0]!.content).toContain('.fg-file-drop { min-block-size: 4.5rem; border-style: dashed !important; }')
  })

  it('fgSend reports progress in percent and success by status', () => {
    const sent: { method?: string; url?: string; body?: unknown } = {}
    let request: {
      status: number
      upload: { onprogress: ((e: object) => void) | null }
      onload: (() => void) | null
      onerror: (() => void) | null
    } | null = null
    class FakeXhr {
      status = 0
      upload = { onprogress: null }
      onload = null
      onerror = null
      onabort = null
      constructor() {
        request = this // eslint-disable-line @typescript-eslint/no-this-alias
      }
      open(method: string, url: string) {
        sent.method = method
        sent.url = url
      }
      send(body: unknown) {
        sent.body = body
      }
    }
    const fgSend = new Function('XMLHttpRequest', `${FILE_HELPERS}\nreturn fgSend`)(FakeXhr) as (
      url: string,
      method: string,
      body: unknown,
      onProgress: (n: number) => void,
      onDone: (ok: boolean) => void,
    ) => void
    const progress: number[] = []
    const done: boolean[] = []
    fgSend('/up', 'PUT', 'BODY', (n) => progress.push(n), (ok) => done.push(ok))
    expect(sent).toEqual({ method: 'PUT', url: '/up', body: 'BODY' })
    request!.upload.onprogress!({ lengthComputable: true, loaded: 1, total: 3 })
    request!.upload.onprogress!({ lengthComputable: false, loaded: 2, total: 0 })
    request!.status = 204
    request!.onload!()
    fgSend('/up', 'POST', 'BODY', () => {}, (ok) => done.push(ok))
    request!.onerror!()
    expect(progress).toEqual([33])
    expect(done).toEqual([true, false])
  })
})

describe('several files dropped on a one-file field', () => {
  it('the JS helper keeps the first through a change event, and leaves other drops alone', async () => {
    const { dropFirstHelper } = await import('../uploadRuntime')
    const dropFirst = new Function(`${dropFirstHelper(MESSAGES.en, false)}\nreturn fgDropFirst`)() as (
      input: HTMLInputElement,
      event: { dataTransfer: DataTransfer | null; preventDefault(): void },
    ) => string
    // jsdom has no DataTransfer: a stand-in that keeps the added files.
    class FakeTransfer {
      list: File[] = []
      items = { add: (f: File) => this.list.push(f) }
      get files() {
        return this.list as unknown as FileList
      }
    }
    ;(globalThis as unknown as { DataTransfer: unknown }).DataTransfer = FakeTransfer
    const input = document.createElement('input')
    input.type = 'file'
    let assigned: unknown = null
    Object.defineProperty(input, 'files', { set: (v) => (assigned = v), get: () => assigned })
    let changes = 0
    input.addEventListener('change', () => changes++)
    let prevented = 0
    const event = (files: File[]) => ({ dataTransfer: { files } as unknown as DataTransfer, preventDefault: () => prevented++ })
    const a = new File(['a'], 'a.pdf')
    const b = new File(['b'], 'b.pdf')
    expect(dropFirst(input, event([a, b]))).toBe('Only one file fits here, so a.pdf was added.')
    expect([assigned, changes, prevented]).toEqual([[a], 1, 1])
    expect(dropFirst(input, event([a]))).toBe('')
    input.multiple = true
    expect(dropFirst(input, event([a, b]))).toBe('')
    expect([changes, prevented]).toEqual([1, 1])
  })

  it('every target shows the note under the field', () => {
    const s = schema([photo])
    expect(out('vue-standalone', s)).toContain(`@drop="fgDropFiles('photo', $event)"`)
    expect(out('vue-standalone', s)).toContain(`<p v-if="fgFileNotes['photo']" class="fg-description" data-fg-file-note>`)
    expect(out('react', s)).toContain(`onDrop={(e) => fgDropFiles('photo', e)}`)
    expect(out('html', s)).toContain('data-fg-file-note="photo" hidden')
    const razor = out('blazor', s)
    expect(razor).toMatch(/<InputFile [^>]*accept="image\/\*" multiple OnChange/)
    expect(razor).toContain('var all = e.GetMultipleFiles(int.MaxValue);')
    expect(razor).toContain('@fgFileNotes["Photo"]')
  })
})
