import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { openProjectFile } from '@/composables/openProject'
import kitchenSink from '../../../../fixtures/kitchen-sink.formsgen.json'
import { getCssAdapter } from './css'
import { PROJECT_MARKER, readProject, withProject } from './project'
import { getTarget, listTargets } from './targets'

const parsed = parseFormSchema(kitchenSink)
if (!parsed.ok) throw new Error('fixture')
const schema = parsed.schema

describe('reopenable exports', () => {
  it('every code file of every target carries the project and reads back exactly', () => {
    for (const target of listTargets().filter((t) => t.id !== 'json')) {
      for (const fw of ['vanilla', 'tailwind', 'bootstrap5'] as const) {
        const files = withProject(target.generate({ schema, css: getCssAdapter(fw) }), schema)
        for (const file of files) {
          const carries = /\.(html|vue|tsx|ts|razor)$/.test(file.path)
          expect(file.content.includes(PROJECT_MARKER), `${target.id} ${fw} ${file.path}`).toBe(carries)
          if (carries) expect(readProject(file.content), file.path).toEqual(schema)
        }
      }
    }
  })

  it('uses each language’s comment syntax, at the end of the file', () => {
    const block = (id: string): string => {
      const file = withProject(getTarget(id)!.generate({ schema, css: getCssAdapter('vanilla') }), schema)[0]!
      return file.content.slice(file.content.lastIndexOf('\n\n') + 2)
    }
    expect(block('html')).toMatch(/^<!--\n {2}FormsGen project: to change this form, open this file in the FormsGen builder \(Open\)\.\n {2}formsgen-project:v1\n[\s\S]*\n-->\n$/)
    expect(block('vue-standalone')).toMatch(/^<!--\n[\s\S]*-->\n$/)
    expect(block('react')).toMatch(/^\/\*\n[\s\S]*\*\/\n$/)
    expect(block('blazor')).toMatch(/^@\*\n[\s\S]*\*@\n$/)
  })

  it('survives text that would close a comment, and non-Latin text', () => {
    const tricky = {
      ...schema,
      meta: { ...schema.meta, title: 'نموذج --> */ *@ </script>' },
    } as FormSchema
    for (const id of ['html', 'react', 'blazor', 'vue-standalone']) {
      const file = withProject(getTarget(id)!.generate({ schema: tricky, css: getCssAdapter('vanilla') }), tricky)[0]!
      const block = file.content.slice(file.content.indexOf(PROJECT_MARKER))
      expect(block, id).not.toMatch(/-->[\s\S]*-->|\*\/[\s\S]*\*\//)
      expect((readProject(file.content) as FormSchema).meta.title, id).toBe('نموذج --> */ *@ </script>')
    }
  })

  it('Open reads a project file, an exported file, a ZIP, and explains files without a project', async () => {
    const html = withProject(getTarget('html')!.generate({ schema, css: getCssAdapter('tailwind') }), schema)[0]!
    const fromHtml = await openProjectFile(new File([html.content], html.path))
    expect(fromHtml.ok && fromHtml.schema).toEqual(schema)

    const fromJson = await openProjectFile(new File([JSON.stringify(schema)], 'x.formsgen.json'))
    expect(fromJson.ok).toBe(true)

    const zip = new JSZip()
    zip.file('Form.razor', withProject(getTarget('blazor')!.generate({ schema, css: getCssAdapter('vanilla') }), schema)[0]!.content)
    zip.file('README.md', '# readme')
    const zipped = await zip.generateAsync({ type: 'uint8array' })
    const fromZip = await openProjectFile(new File([zipped], 'form-blazor.zip', { type: 'application/zip' }))
    expect(fromZip.ok && fromZip.schema).toEqual(schema)

    const plain = getTarget('react')!.generate({ schema, css: getCssAdapter('vanilla') })[0]!
    expect(await openProjectFile(new File([plain.content], plain.path))).toEqual({ ok: false, reason: 'no-project' })
    expect(await openProjectFile(new File(['{ nope'], 'bad.json'))).toEqual({ ok: false, reason: 'unreadable' })
    const invalid = await openProjectFile(new File(['{"$schema":"other"}'], 'x.json'))
    expect(invalid.ok).toBe(false)
    expect(!invalid.ok && invalid.reason).toBe('invalid')
  })
})
