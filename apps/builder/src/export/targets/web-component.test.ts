import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from '../css'
import { PROJECT_MARKER, withProject } from '../project'
import { getTarget } from './index'

const schema = (): FormSchema => {
  const result = parseFormSchema({
    $schema: 'formsgen/v2',
    meta: { name: 'contact', title: 'Contact us', locale: 'en', dir: 'ltr' },
    tree: [{ id: 'n', type: 'text', name: 'full_name', props: { label: 'Full name' } }],
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const target = getTarget('web-component')!
const css = getCssAdapter('vanilla')

describe('the web-component target', () => {
  it('writes a host page that loads the element script and points it at the project file', () => {
    const files = target.generate({ schema: schema(), css })
    expect(files.map((f) => f.path)).toEqual(['contact.html'])
    const page = files[0]!.content
    expect(page).toContain('<script type="module" src="./formsgen-element.js"></script>')
    expect(page).toContain('<formsgen-form src="./contact.formsgen.json"></formsgen-form>')
    expect(page).toContain('<title>Contact us</title>')
    expect(page).toContain("addEventListener('formsgen-sent'")
  })

  it('carries the element script when the caller has it, never with the project appended', () => {
    const files = withProject(target.generate({ schema: schema(), css, assets: { elementScript: '// bundle' } }), schema())
    expect(files.map((f) => f.path)).toEqual(['contact.html', 'formsgen-element.js'])
    expect(files[0]!.content).toContain(PROJECT_MARKER)
    expect(files[1]!.content).toBe('// bundle')
    expect(files[1]!.project).toBe(false)
  })

  it('without the script, the page may load it from the builder, and the README says where it comes from', () => {
    const url = 'https://builder.example.com/element/formsgen-element.js'
    const page = target.generate({ schema: schema(), css, assets: { elementScriptUrl: url } })[0]!.content
    expect(page).toContain(`<script type="module" src="${url}"></script>`)
    expect(target.readme({ schema: schema(), css, assets: { elementScriptUrl: url } })).toContain(`or load it from \`${url}\``)
    expect(target.readme({ schema: schema(), css, assets: { elementScript: '// bundle' } })).toContain('is in this package')
    expect(target.readme({ schema: schema(), css })).toContain('build:element')
  })
})
