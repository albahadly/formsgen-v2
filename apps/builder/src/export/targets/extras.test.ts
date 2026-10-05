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
      expect(code, target).toContain(`aria-label="${MESSAGES.en.moreInfo}" aria-describedby="fg_price_tip">?</button>`)
      expect(code, target).toMatch(/role="tooltip" id="fg_price_tip" class(Name)?="fg-tip-text">Before tax</)
      // the label closes before the tip begins
      expect(code, target).toMatch(/Price<\/label><span class(Name)?="fg-tip">/)
      expect(code, target).toMatch(/I agree<\/label><span class(Name)?="fg-tip">/)
    }
  })

  it('names a group by its legend text only', () => {
    for (const target of TARGETS) {
      const code = out(target, s)
      expect(code, target).toContain('aria-labelledby="fg_plan_legend"')
      expect(code, target).toContain('<span id="fg_plan_legend">Plan</span>')
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
      expect(code, target).toContain('aria-describedby="fg_price_prefix fg_price_suffix"')
      expect(code, target).toContain('aria-describedby="fg_user_prefix"')
      expect(code, target).toMatch(/<span id="fg_price_prefix" class(Name)?="fg-affix">\$<\/span>/)
      expect(out(target, s, 'bootstrap5'), target).toMatch(/class(Name)?="input-group"/)
      expect(out(target, s, 'bootstrap5'), target).toMatch(/<span id="fg_price_suffix" class(Name)?="input-group-text">USD<\/span>/)
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
    expect(html).toMatch(/id="fg_a" type="text" class="form-control form-control-lg"/)
    expect(html).toMatch(/id="fg_b" type="text" class="form-control"/)
    expect(html).toMatch(/id="fg_c" type="text" class="form-control form-control-sm"/)
    const vanilla = out('vue-standalone', schema(tree, { fieldSize: 'sm' }))
    expect(vanilla).toMatch(/id="fg_a" v-model="form.a" type="text" class="fg-input fg-control--sm"/)
    expect(vanilla).toMatch(/id="fg_b" v-model="form.b" type="text" class="fg-input"/)
  })
})
