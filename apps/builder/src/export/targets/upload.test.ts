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
      expect(code, target).toContain('body: fgMultipart(data)')
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
