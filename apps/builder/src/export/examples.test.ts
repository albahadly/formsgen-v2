// The example projects under examples/ implement one form template,
// examples/form/event-registration.formsgen.json, in every stack. Their
// generated files are exactly what the builder's Download button writes for
// that template (each target, each CSS framework, with the project block), so
// the examples never drift from the targets: this test regenerates the files
// in memory and fails when a committed one differs. Run `pnpm examples:update`
// (this test with FG_EXAMPLES_WRITE=1) after changing a target or the template.
import { parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from './css'
import { withProject } from './project'
import { getTarget } from './targets'

// vitest runs with apps/builder as its working directory.
const EXAMPLES = resolve(process.cwd(), '../../examples')
const TEMPLATE = join(EXAMPLES, 'form/event-registration.formsgen.json')
const WRITE = process.env['FG_EXAMPLES_WRITE'] === '1'

/** Where each export of the template lives (directory under examples/). */
const PLACES: { target: string; css: CssFrameworkId; dir: string }[] = [
  { target: 'html', css: 'vanilla', dir: 'html/vanilla' },
  { target: 'html', css: 'tailwind', dir: 'html/tailwind' },
  { target: 'html', css: 'bootstrap5', dir: 'html/bootstrap5' },
  { target: 'react', css: 'vanilla', dir: 'react/src/forms/vanilla' },
  { target: 'react', css: 'tailwind', dir: 'react/src/forms/tailwind' },
  { target: 'react', css: 'bootstrap5', dir: 'react/src/forms/bootstrap5' },
  { target: 'vue-standalone', css: 'vanilla', dir: 'vue/src/forms/vanilla' },
  { target: 'vue-standalone', css: 'tailwind', dir: 'vue/src/forms/tailwind' },
  { target: 'vue-standalone', css: 'bootstrap5', dir: 'vue/src/forms/bootstrap5' },
  { target: 'vue-lib', css: 'vanilla', dir: 'vue/src/forms/renderer' },
  { target: 'blazor', css: 'vanilla', dir: 'dotnet/EventRegistration/Components/Forms/Vanilla' },
  { target: 'blazor', css: 'tailwind', dir: 'dotnet/EventRegistration/Components/Forms/Tailwind' },
  { target: 'blazor', css: 'bootstrap5', dir: 'dotnet/EventRegistration/Components/Forms/Bootstrap5' },
]

function template(): FormSchema {
  const result = parseFormSchema(JSON.parse(readFileSync(TEMPLATE, 'utf8')))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

describe('examples/ holds the current exports of the event-registration template', () => {
  const schema = template()

  for (const place of PLACES) {
    it(`${place.dir}: ${place.target} (${place.css})`, () => {
      const files = withProject(getTarget(place.target)!.generate({ schema, css: getCssAdapter(place.css) }), schema)
      expect(files.length).toBeGreaterThan(0)
      for (const file of files) {
        const path = join(EXAMPLES, place.dir, file.path)
        if (WRITE) {
          mkdirSync(dirname(path), { recursive: true })
          writeFileSync(path, file.content)
          continue
        }
        const committed = existsSync(path) ? readFileSync(path, 'utf8') : null
        expect(committed, `${path} differs from the current export: run pnpm examples:update`).toBe(file.content)
      }
    })
  }

  it('the template is what the JSON target exports', () => {
    const [json] = getTarget('json')!.generate({ schema, css: getCssAdapter('vanilla') })
    expect(JSON.parse(json!.content)).toEqual(JSON.parse(readFileSync(TEMPLATE, 'utf8')))
  })
})
