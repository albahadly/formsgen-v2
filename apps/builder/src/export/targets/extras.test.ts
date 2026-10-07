import { MESSAGES, parseFormSchema, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from '../css'
import { getTarget } from './index'

const TARGETS = ['html', 'react', 'vue-standalone', 'blazor']

function schema(tree: ElementNode[], meta: Record<string, unknown> = {}): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'x', locale: 'en', dir: 'ltr', ...meta }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema, fw: CssFrameworkId = 'vanilla'): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter(fw) })
    .map((f) => f.content)
    .join('\n')

const price: ElementNode = { id: 'p', type: 'number', name: 'price', props: { label: 'Price', prefix: '$', suffix: 'USD', tooltip: 'Before tax' } }
const plan: ElementNode = {
  id: 'pl',
  type: 'radiogroup',
  name: 'plan',
  props: { label: 'Plan', tooltip: 'Change it any time', items: [{ value: 'a', label: 'A' }] },
}
const agree: ElementNode = { id: 'a', type: 'checkbox', name: 'agree', props: { label: 'I agree', tooltip: 'No spam' } }

describe('help tooltips in every target', () => {
  const s = schema([price, plan, agree])

  it('sits beside the label, never inside it, and describes its button', () => {
    for (const target of TARGETS) {
      const code = out(target, s)
      expect(code, target).toContain(`aria-label="${MESSAGES.en.moreInfo}" aria-describedby="fg_price-tip">?</button>`)
      expect(code, target).toMatch(/role="tooltip" id="fg_price-tip" class(Name)?="fg-tip-text">Before tax</)
      // the label closes before the tip begins
      expect(code, target).toMatch(/Price<\/label><span class(Name)?="fg-tip">/)
      expect(code, target).toMatch(/I agree<\/label><span class(Name)?="fg-tip">/)
    }
  })

  it('names a group by its legend text only', () => {
    for (const target of TARGETS) {
      const code = out(target, s)
      expect(code, target).toContain('aria-labelledby="fg_plan-legend"')
      expect(code, target).toContain('<span id="fg_plan-legend">Plan</span>')
    }
  })

  it('ships the tooltip rules to framework exports only when used', () => {
    for (const target of TARGETS) {
      for (const fw of ['tailwind', 'bootstrap5'] as const) {
        expect(out(target, s, fw), `${target} ${fw}`).toMatch(/\.fg-tip-text[^{,]*\{/)
        expect(out(target, schema([{ ...price, props: { label: 'Price' } }]), fw), `${target} ${fw}`).not.toMatch(/\.fg-tip-text/)
      }
    }
  })

  it('reads Arabic', () => {
    expect(out('html', schema([price], { locale: 'ar', dir: 'rtl' }))).toContain(`aria-label="${MESSAGES.ar.moreInfo}"`)
  })
})

describe('text add-ons', () => {
  const s = schema([price, { id: 'u', type: 'text', name: 'user', props: { label: 'User', prefix: '@' } }])

  it('wrap the control and describe it in every target and framework', () => {
    for (const target of TARGETS) {
      const code = out(target, s)
      expect(code, target).toContain('aria-describedby="fg_price-prefix fg_price-suffix"')
      expect(code, target).toContain('aria-describedby="fg_user-prefix"')
      expect(code, target).toMatch(/<span id="fg_price-prefix" class(Name)?="fg-affix">\$<\/span>/)
      expect(out(target, s, 'bootstrap5'), target).toMatch(/class(Name)?="input-group"/)
      expect(out(target, s, 'bootstrap5'), target).toMatch(/<span id="fg_price-suffix" class(Name)?="input-group-text">USD<\/span>/)
    }
  })

  it('leave plain fields untouched', () => {
    const plain = out('html', schema([{ id: 't', type: 'text', name: 't', props: { label: 'T' } }]))
    expect(plain).not.toContain('class="fg-affix-group"')
    expect(plain).not.toContain('aria-describedby="fg_t')
  })
})

describe('the form-wide field size', () => {
  const tree: ElementNode[] = [
    { id: 'a', type: 'text', name: 'a', props: { label: 'A' } },
    { id: 'b', type: 'text', name: 'b', props: { label: 'B' }, style: { size: 'md' } },
    { id: 'c', type: 'text', name: 'c', props: { label: 'C' }, style: { size: 'sm' } },
  ]

  it('applies to every field unless one sets its own size (md = medium)', () => {
    const html = out('html', schema(tree, { fieldSize: 'lg' }), 'bootstrap5')
    expect(html).toMatch(/id="fg_a" type="text" class="form-control form-control-lg rounded"/)
    expect(html).toMatch(/id="fg_b" type="text" class="form-control"/)
    expect(html).toMatch(/id="fg_c" type="text" class="form-control form-control-sm rounded"/)
    const vanilla = out('vue-standalone', schema(tree, { fieldSize: 'sm' }))
    expect(vanilla).toMatch(/id="fg_a" v-model="form.a" type="text" class="fg-input fg-control--sm"/)
    expect(vanilla).toMatch(/id="fg_b" v-model="form.b" type="text" class="fg-input"/)
  })
})

describe('floating labels', () => {
  const tree: ElementNode[] = [
    { id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }] },
    { id: 'c', type: 'select', name: 'city', props: { label: 'City', items: [{ value: 'm', label: 'Muscat' }] } },
    { id: 'p', type: 'number', name: 'price', props: { label: 'Price', prefix: '$' } },
    { id: 'd', type: 'date', name: 'day', props: { label: 'Day' } },
  ]
  const s = schema(tree, { floatingLabels: true })

  it('put the label after the control in every target, with a placeholder for :placeholder-shown', () => {
    for (const target of TARGETS) {
      const code = out(target, s)
      expect(code, target).toMatch(/<div class(Name)?="fg-floating">\s*<(input|InputText) placeholder=" "[^\n]*\n\s*<label class(Name)?="fg-floating-label" (for|htmlFor)="fg_name">Name<span/)
      expect(code, target).toMatch(/<div class(Name)?="fg-floating">\s*<(select|InputSelect)/)
      // add-ons and date-like inputs keep the label above
      expect(code, target).toMatch(/<label class(Name)?="fg-label" (for|htmlFor)="fg_price">/)
      expect(code, target).toMatch(/<label class(Name)?="fg-label" (for|htmlFor)="fg_day">/)
    }
  })

  it('use each framework idiom', () => {
    expect(out('html', s, 'bootstrap5')).toMatch(/<div class="form-floating">\s*<input placeholder=" " id="fg_name" type="text" class="form-control"/)
    expect(out('html', s, 'tailwind')).toMatch(/class="[^"]*\bpeer\b[^"]*placeholder-transparent/)
    expect(out('html', s, 'tailwind')).toContain('peer-[:not(:placeholder-shown)]:-translate-y-2.5')
    expect(out('html', schema(tree))).not.toContain('class="fg-floating"')
  })
})

describe('column widths per screen size', () => {
  const tree: ElementNode[] = [
    { id: 'a', type: 'text', name: 'a', props: { label: 'A' }, layout: { colSpan: 6, colSpanSm: 6, colSpanLg: 4 } },
    { id: 'b', type: 'text', name: 'b', props: { label: 'B' }, layout: { colSpan: 6 } },
  ]
  const s = schema(tree)

  it('maps to each framework', () => {
    expect(out('html', s, 'tailwind')).toContain('class="col-span-6 md:col-span-6 lg:col-span-4"')
    expect(out('html', s, 'tailwind')).toContain('class="col-span-12 md:col-span-6"')
    expect(out('html', s, 'bootstrap5')).toContain('class="col-6 col-md-6 col-lg-4"')
    expect(out('html', s, 'bootstrap5')).toContain('class="col-12 col-md-6"')
    expect(out('html', s)).toContain('style="--fg-span: 6; --fg-span-sm: 6; --fg-span-lg: 4"')
    expect(out('html', s)).toContain('style="--fg-span: 6; --fg-span-sm: 12; --fg-span-lg: 6"')
    expect(out('html', s)).toContain('@media (min-width: 1024px) { .fg-cell {')
  })

  it('reach React as a typed style object (custom properties kept as-is)', () => {
    expect(out('react', s)).toContain("style={{ '--fg-span': '6', '--fg-span-sm': '6', '--fg-span-lg': '4' } as React.CSSProperties}")
  })
})

describe('found by the examples (strict compiles)', () => {
  it('"contains" on a list goes through fgContains, so typed targets never narrow it to never', () => {
    const extras: ElementNode = {
      id: 'e',
      type: 'checkboxgroup',
      name: 'extras',
      props: { label: 'Extras', items: [{ value: 'airport', label: 'Airport' }] },
    }
    const flight: ElementNode = {
      id: 'f',
      type: 'text',
      name: 'flight',
      props: { label: 'Flight' },
      conditions: [[{ field: 'extras', operator: 'contains', value: 'airport' }]],
    }
    const s = schema([extras, flight])
    for (const target of ['react', 'vue-standalone']) {
      const code = out(target, s)
      expect(code, target).toMatch(/fgContains\((data|form)\.extras, "airport"\)/)
      expect(code, target).toContain('function fgContains(v: unknown, x: unknown): boolean {')
      expect(code, target).not.toMatch(/typeof (data|form)\.extras === /)
    }
    // unused, it is pruned from typed exports
    expect(out('react', schema([extras]))).not.toContain('fgContains')
  })

  it('blazor emits no empty switch when repeater items have no rules', () => {
    const repeater: ElementNode = {
      id: 'r',
      type: 'repeater',
      name: 'jobs',
      props: { label: 'Jobs' },
      children: [{ id: 'c', type: 'text', name: 'company', props: { label: 'Company' } }],
    }
    const razor = out('blazor', schema([repeater]))
    expect(razor).toContain('private string? FgItemError(object model, string name)')
    expect(razor).not.toMatch(/switch \((model|name)\)\s*\{\s*\}/)
    const withRule = out('blazor', schema([{ ...repeater, children: [{ ...repeater.children![0]!, validation: [{ rule: 'required' }] }] }]))
    expect(withRule).toContain('case FgJobsItem item:')
  })
})
