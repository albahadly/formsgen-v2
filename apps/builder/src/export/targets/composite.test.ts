import { MESSAGES, parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RUNTIME_HELPERS } from '../compile'
import { COMPOSITE_CSS } from '../composite'
import { getCssAdapter, type CssFrameworkId } from '../css'
import { builtinCheckExpr } from '../logic'
import { formDataType } from '../structure'
import { getTarget } from './index'

const budget: ElementNode = {
  id: 'b',
  type: 'rangeslider',
  name: 'budget',
  props: { label: 'Budget', min: 0, max: 1000, step: 50, defaultFrom: 200, defaultTo: 600 },
}
const stay: ElementNode = { id: 's', type: 'daterange', name: 'stay', props: { label: 'Stay' }, validation: [{ rule: 'required' }] }
const days: ElementNode = { id: 'd', type: 'dates', name: 'days', props: { label: 'Days' } }
const note: ElementNode = {
  id: 'n',
  type: 'text',
  name: 'note',
  props: { label: 'Note' },
  conditions: [[{ field: 'stay', operator: 'not-empty' }]],
}

function schema(tree: ElementNode[], locale = 'en'): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'trip', locale, dir: 'ltr' }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema, fw: CssFrameworkId = 'vanilla'): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter(fw) })
    .map((f) => f.content)
    .join('\n')

describe('composite values in the shared runtime', () => {
  const run = new Function(`${RUNTIME_HELPERS}\nreturn { fgIsEmpty, fgIsBlank }`)() as {
    fgIsEmpty: (v: unknown) => boolean
  }

  it('a { from, to } value is empty while any part is (like the renderer)', () => {
    expect(run.fgIsEmpty({ from: '2026-01-01', to: '' })).toBe(true)
    expect(run.fgIsEmpty({ from: '2026-01-01', to: '2026-01-02' })).toBe(false)
    expect(run.fgIsEmpty({ from: 0, to: 0 })).toBe(false)
  })

  it('the date range order check runs after required', () => {
    const expr = builtinCheckExpr(stay, MESSAGES.en)!
    const check = new Function('v', `${RUNTIME_HELPERS}\nreturn ${expr}`) as (v: unknown) => string | null
    expect(check({ from: '2026-11-05', to: '2026-11-01' })).toBe(MESSAGES.en.dateOrder)
    expect(check({ from: '2026-11-05', to: '' })).toBeNull()
    expect(check({ from: '2026-11-05', to: '2026-11-05' })).toBeNull()
  })

  it('typed targets get { from, to } and string[] shapes', () => {
    const type = formDataType(schema([budget, stay, days]))
    expect(type).toContain('budget: { from: number; to: number }')
    expect(type).toContain('stay: { from: string; to: string }')
    expect(type).toContain('days: string[]')
  })
})

describe('composite fields in every code target', () => {
  const s = schema([budget, stay, note, days])

  it('the vanilla stylesheet mirrors the renderer block; other frameworks get the slider rules', () => {
    const renderer = readFileSync(resolve(process.cwd(), '../../packages/renderer/src/styles.css'), 'utf8')
    expect(renderer).toContain(COMPOSITE_CSS.trim())
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const trackRule = /\.fg-dual-track[^{,]*\{/
      expect(out(target, s), target).toMatch(trackRule)
      for (const fw of ['tailwind', 'bootstrap5'] as const) {
        expect(out(target, s, fw), `${target} ${fw}`).toMatch(trackRule)
        // ...but only when the form has a slider
        expect(out(target, schema([days]), fw), `${target} ${fw}`).not.toMatch(trackRule)
      }
    }
  })

  it('handles carry part labels and no target lets them cross', () => {
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, s)
      expect(code, target).toContain('aria-label="Budget: Minimum"')
      expect(code, target).toContain('aria-label="Budget: Maximum"')
      expect(code, target).toContain('aria-label="Stay: Start date"')
    }
    expect(out('vue-standalone', s)).toContain('function fgDualClamp(')
    expect(out('react', s)).toContain("fgDualChange('budget', form.budget, 'from', Number(e.target.value))")
    expect(out('html', s)).toContain('if (Number(from.value) > Number(to.value)) from.value = to.value')
    expect(out('blazor', s)).toContain('if (from) range.From = Math.Min(n, range.To);')
  })

  it('blazor models FgRange / FgDateRange and validates the order after required', () => {
    const razor = out('blazor', s)
    expect(razor).toContain('public FgRange Budget { get; set; } = new(200, 600);')
    expect(razor).toContain('public FgDateRange Stay { get; set; } = new();')
    expect(razor).toContain('public List<string> Days { get; set; } = new();')
    const required = razor.indexOf('if ((string.IsNullOrWhiteSpace(Stay.From) || string.IsNullOrWhiteSpace(Stay.To)))')
    const order = razor.indexOf('string.CompareOrdinal(Stay.To, Stay.From) < 0')
    expect(required).toBeGreaterThan(0)
    expect(order).toBeGreaterThan(required)
    expect(razor).toContain('FgDateRange range => string.IsNullOrWhiteSpace(range.From) || string.IsNullOrWhiteSpace(range.To),')
    expect(razor).toContain('payload["budget"] = new Dictionary<string, object?> { ["from"] = Model.Budget.From, ["to"] = Model.Budget.To };')
    // Razor binds type="date" as DateTime: the ISO strings use value + @onchange
    expect(razor).not.toMatch(/type="date"[^>]*@bind=/)
  })

  it('arabic forms localize part labels and the date messages', () => {
    const ar = schema([budget, stay, days], 'ar')
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, ar)
      expect(code, target).toContain(`Budget: ${MESSAGES.ar.rangeFrom}`)
      expect(code, target).toContain(MESSAGES.ar.dateOrder)
      expect(code, target).toContain(MESSAGES.ar.addDate)
    }
  })
})

describe('matrix and phone country in every code target', () => {
  const rating: ElementNode = {
    id: 'r',
    type: 'matrix',
    name: 'rating',
    props: {
      label: 'Rate',
      rows: [{ value: 'speed', label: 'Speed' }, { value: 'quality', label: 'Quality' }],
      columns: [{ value: '1', label: 'Poor' }, { value: '2', label: 'Great' }],
    },
    validation: [{ rule: 'required' }],
  }
  const phone: ElementNode = {
    id: 'p',
    type: 'phone',
    name: 'phone',
    props: { label: 'Phone', countrySelect: true, defaultCountry: 'AE', countries: 'OM, AE' },
  }
  const s = schema([rating, phone])

  it('types each matrix row and keeps the phone a string', () => {
    const type = formDataType(s)
    expect(type).toContain('rating: { speed: string | null; quality: string | null }')
    expect(type).toContain('phone: string')
  })

  it('names radios "<row>: <column>" and offers the countries in the form language', () => {
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, s)
      expect(code, target).toContain('aria-label="Quality: Great"')
      expect(code, target).toContain('aria-label="Country code"')
      expect(code, target).toMatch(/<option value="AE"[^>]*>United Arab Emirates \(\+971\)<\/option>/)
      const ar = out(target, schema([rating, phone], 'ar'))
      expect(ar, target).toContain('عُمان (+968)')
      expect(ar, target).toContain(`aria-label="${MESSAGES.ar.countryCode}"`)
    }
    // the starting country: selected in HTML, the store default elsewhere
    expect(out('html', s)).toContain('<option value="AE" data-dial="971" selected>')
    expect(out('vue-standalone', s)).toContain('const FG_PHONE_DEFAULTS: Record<string, string> = {"phone":"AE"}')
    expect(out('blazor', s)).toContain('new() { ["Phone"] = "AE" }')
  })

  it('blazor answers cells through a dictionary and treats an unanswered row as empty', () => {
    const razor = out('blazor', s)
    expect(razor).toContain('public Dictionary<string, string?> Rating { get; set; } = new() { ["speed"] = null, ["quality"] = null };')
    expect(razor).toContain(`@onchange='() => FgSetCell(Model.Rating, "quality", "2", "Rating")'`)
    expect(razor).toContain('if (Rating.Values.Any(string.IsNullOrEmpty))')
    expect(razor).toContain('["AE"] = "971",')
  })

  it('a matrix with several answers per row uses checkboxes and lists per row', () => {
    const multi = schema([{ ...rating, props: { ...rating.props, multiple: true } }])
    expect(formDataType(multi)).toContain('rating: { speed: string[]; quality: string[] }')
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const code = out(target, multi)
      expect(code, target).toMatch(/type="checkbox"[^>]*aria-label="Quality: Great"/)
      expect(code, target).not.toContain('type="radio"')
    }
    expect(out('vue-standalone', multi)).toContain(
      `@change="form.rating['quality'] = fgToggleCell(['1', '2'], form.rating['quality'], '2'); revalidate('rating')"`,
    )
    expect(out('vue-standalone', multi)).toContain('function fgToggleCell(columns: string[], current: string[], column: string): string[]')
    expect(out('react', multi)).toContain(`["quality"]: fgToggleCell(['1', '2'], form.rating["quality"], '2')`)
    expect(out('html', multi)).toContain("var several = cell.type === 'checkbox'")
    const razor = out('blazor', multi)
    expect(razor).toContain('public Dictionary<string, List<string>> Rating { get; set; } = new() { ["speed"] = new(), ["quality"] = new() };')
    expect(razor).toContain(`@onchange='() => FgToggleCell(Model.Rating, "quality", "2", new[] { "1", "2" }, "Rating")'`)
    expect(razor).toContain('if (Rating.Values.Any(answers => answers.Count == 0))')
    expect(razor).not.toContain('private void FgSetCell(')
    // single-answer forms keep their radios and no toggle helper
    expect(out('vue-standalone', s)).not.toContain('fgToggleCell')
    expect(out('blazor', s)).not.toContain('FgToggleCell')
  })

  it('the selector needs countrySelect, and works per repeater item', () => {
    const plain = schema([{ ...phone, props: { label: 'Phone' } }])
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      expect(out(target, plain), target).not.toContain('Country code')
    }
    const inRepeater = schema([
      { id: 'rep', type: 'repeater', name: 'people', props: { label: 'People' }, children: [{ ...phone, id: 'p2' }] },
    ])
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      expect(out(target, inRepeater), target).toContain('Country code')
    }
    // the chosen country is kept per item; the default is found by template path
    expect(out('vue-standalone', inRepeater)).toContain(`:value="fgPhoneCountryOf(('people.' + i + '.phone'))"`)
    expect(out('vue-standalone', inRepeater)).toContain('const FG_PHONE_DEFAULTS: Record<string, string> = {"people.phone":"AE"}')
    expect(out('react', inRepeater)).toContain(`value={fgPhoneCountryOf(('people.' + i + '.phone'))}`)
    expect(out('blazor', inRepeater)).toContain(`value='@FgPhoneCountryOf(FgItemKey(item, "PeopleIPhone", "Phone"), item.Phone)'`)
    expect(out('blazor', inRepeater)).toContain('FgPhoneDefaults = new() { ["PeopleIPhone"] = "AE" }')
  })
})
