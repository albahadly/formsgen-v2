import { MESSAGES, fieldsByPath, parseFormSchema, type FormSchema } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { answerHelpers } from './answers'
import { getCssAdapter } from './css'
import { getTarget } from './targets'

function schema(tree: unknown[], locale = 'en'): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'a', locale, dir: locale === 'ar' ? 'rtl' : 'ltr' }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter('vanilla') })
    .map((f) => f.content)
    .join('\n')

const s = schema([
  { id: 'n', type: 'text', name: 'first_name', props: { label: 'Name' } },
  { id: 'h', type: 'heading', props: { text: 'Welcome, {first_name|guest}!', level: 2 } },
  { id: 'r', type: 'select', name: 'room', props: { label: 'Room', items: [{ value: '90', label: 'Standard' }] } },
  { id: 'e', type: 'email', name: 'email', props: { label: 'Email for {first_name|you}', description: 'Room: {room|none}. {nope} stays.' } },
  {
    id: 'g',
    type: 'repeater',
    name: 'guests',
    props: { label: 'Guests' },
    children: [
      { id: 'gn', type: 'text', name: 'gname', props: { label: 'Name' } },
      { id: 'ga', type: 'number', name: 'age', props: { label: 'Age of {guests.gname|this guest}' } },
    ],
  },
  { id: 'o', type: 'paragraph', props: { text: 'Outside: {guests.gname}' } },
])

describe('answers inside text in every code target', () => {
  it('Vue and React insert expressions in the right scope', () => {
    const vue = out('vue-standalone', s)
    expect(vue).toContain(`Welcome, {{ fgOr(fgAnswer(form.first_name, ", "), 'guest') }}!`)
    expect(vue).toContain(`Room: {{ fgOr(fgPick(form.room, {"90":"Standard"}, ", "), 'none') }}. &#123;nope} stays.`)
    expect(vue).toContain(`Age of {{ fgOr(fgAnswer(item.gname, ", "), 'this guest') }}`)
    expect(vue).toContain('Outside: &#123;guests.gname}')
    const react = out('react', s)
    expect(react).toContain(`Welcome, {fgOr(fgAnswer(form.first_name, ", "), "guest")}!`)
    expect(react).toContain(`{'{'}nope{'}'} stays.`)
  })

  it('HTML paints spans (item paths keep their tokens); Blazor uses Razor expressions', () => {
    const html = out('html', s)
    expect(html).toContain('Welcome, <span data-fg-answer="first_name" data-fg-fallback="guest">guest</span>!')
    expect(html).toContain('<span data-fg-answer="guests.__i__.gname" data-fg-fallback="this guest">this guest</span>')
    expect(html).toContain('function updateConditions() {\n      fgPaintAnswers()')
    const razor = out('blazor', s)
    expect(razor).toContain('Welcome, @(FgOr(FgAnswer(Model.FirstName, ", "), "guest"))!')
    expect(razor).toContain('@(FgOr(FgPick(Model.Room, new Dictionary<string, string> { ["90"] = "Standard" }, ", "), "none"))')
    expect(razor).toContain('Age of @(FgOr(FgAnswer(item.Gname, ", "), "this guest"))')
    expect(razor).toContain('private static string FgOr(string text, string fallback)')
  })

  it('Arabic joins lists with an Arabic comma and says نعم / لا', () => {
    const ar = schema(
      [
        { id: 'v', type: 'checkbox', name: 'vip', props: { label: 'VIP' } },
        { id: 'x', type: 'checkboxgroup', name: 'extras', props: { label: 'Extras', items: [{ value: 'a', label: 'أ' }] } },
        { id: 'p', type: 'paragraph', props: { text: '{vip} {extras}' } },
      ],
      'ar',
    )
    expect(out('vue-standalone', ar)).toContain(`fgYesNo(form.vip, "${MESSAGES.ar.yes}", "${MESSAGES.ar.no}")`)
    expect(out('vue-standalone', ar)).toContain('fgPick(form.extras, {"a":"أ"}, "، ")')
  })

  it('the JS helpers match the renderer’s formatting', () => {
    const h = new Function(`${answerHelpers(false)}\nreturn { fgAnswer, fgPick, fgYesNo, fgOr }`)() as Record<string, (...a: unknown[]) => string>
    expect(h.fgAnswer!(null, ', ')).toBe('')
    expect(h.fgAnswer!(12.5, ', ')).toBe('12.5')
    expect(h.fgAnswer!(['a', 'b'], '، ')).toBe('a، b')
    expect(h.fgAnswer!({ from: '2026-01-01', to: '2026-01-05' }, ', ')).toBe('2026-01-01 – 2026-01-05')
    expect(h.fgAnswer!([new File(['x'], 'cv.pdf')], ', ')).toBe('cv.pdf')
    expect(h.fgPick!(['90', 'x'], { '90': 'Standard' }, ', ')).toBe('Standard, x')
    expect(h.fgYesNo!(false, 'Yes', 'No')).toBe('No')
    expect(h.fgOr!('', 'friend')).toBe('friend')
    expect(fieldsByPath(s.tree).get('guests.gname')?.repeater).toBe('guests')
  })
})
