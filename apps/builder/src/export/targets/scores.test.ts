// A star rating and an NPS scale in every code target: radios with number
// values, the shared stylesheet block, typed as a nullable number.
import { parseFormSchema, type ElementNode, type FormSchema } from '@albahadly/formsgen-renderer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCORE_CSS } from '../composite'
import { getCssAdapter, type CssFrameworkId } from '../css'
import { getTarget } from './index'

function schema(tree: ElementNode[]): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'scores', locale: 'en', dir: 'ltr' }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema, fw: CssFrameworkId = 'vanilla'): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter(fw) })
    .map((f) => f.content)
    .join('\n')

const tree: ElementNode[] = [
  { id: 'r', type: 'rating', name: 'stars', props: { label: 'Stars', max: 4 }, validation: [{ rule: 'required' }] },
  { id: 'n', type: 'nps', name: 'recommend', props: { label: 'Recommend?', lowLabel: 'Never' } },
]

describe('scores in the code targets', () => {
  const s = schema(tree)

  it('html: radios with number values read as a score, stars in reverse order', () => {
    const html = out('html', s)
    expect(html).toContain('<input id="fg_stars-4" type="radio" name="stars" class="fg-sr-only" value="4" data-fg-path="stars" data-fg-kind="score">')
    expect(html.indexOf('fg_stars-4')).toBeLessThan(html.indexOf('fg_stars-1'))
    expect(html).toContain('<label class="fg-rating-star" for="fg_stars-4"><span class="fg-sr-only">4</span></label>')
    expect(html).toContain('<div class="fg-nps-ends" aria-hidden="true"><span>Never</span><span>Very likely</span></div>')
    expect(html).toContain("if (kind === 'score')")
    expect(html).toContain(SCORE_CSS.trim().split('\n')[1]!)
  })

  it('vue and react bind numbers; blazor binds a double? through a radio group', () => {
    const vue = out('vue-standalone', s)
    expect(vue).toContain('v-model="form.stars" type="radio" class="fg-sr-only" :value="3"')
    const tsx = out('react', s)
    expect(tsx).toContain("checked={form.recommend === 10} onChange={() => { setField('recommend', 10); touch('recommend') }}")
    const razor = out('blazor', s)
    expect(razor).toContain('<InputRadioGroup Name="fg_stars" @bind-Value="Model.Stars">')
    expect(razor).toContain('<InputRadio id="fg_stars-2" class="fg-sr-only" Value="@((double?)2)" />')
    expect(razor).toContain('public double? Stars { get; set; }')
    expect(tsx).toContain('stars: number | null')
    expect(vue).toContain('recommend: number | null')
  })

  it('every flavour carries the score stylesheet; the renderer stylesheet mirrors it', () => {
    for (const fw of ['vanilla', 'tailwind', 'bootstrap5'] as const) {
      expect(out('html', s, fw), fw).toContain('.fg-rating-star::before')
      expect(out('vue-standalone', s, fw), fw).toContain('.fg-nps-option {')
    }
    const rendererCss = readFileSync(resolve(process.cwd(), '../../packages/renderer/src/styles.css'), 'utf8')
    expect(rendererCss).toContain(SCORE_CSS.trim())
  })

  it('the validation export types them as nullable numbers, required when ruled', () => {
    const files = getTarget('validation')!.generate({ schema: s, css: getCssAdapter('vanilla') })
    const zod = files.find((f) => f.path.endsWith('.zod.ts'))!.content
    expect(zod).toContain('stars: z.number().nullable().refine((v) => !fgIsBlank(v), "This field is required")')
    expect(zod).toContain('recommend: z.number().nullable()')
    const json = JSON.parse(files.find((f) => f.path.endsWith('.schema.json'))!.content)
    expect(json.properties.stars).toEqual({ type: 'number' })
    expect(json.properties.recommend).toEqual({ type: ['number', 'null'] })
  })
})
