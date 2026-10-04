import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FormsGenForm from './components/FormsGenForm.vue'
import { FIELD_COMPONENTS } from './components/fieldComponents'
import { coreElements, isSafeUrl } from './elements'
import { parseFormSchema } from './parse'
import type { ElementNode, FormSchema } from './schema'

function schema(tree: ElementNode[]): FormSchema {
  return { $schema: 'formsgen/v2', meta: { name: 'demo', locale: 'en', dir: 'ltr' }, tree } as FormSchema
}
const mountTree = (tree: ElementNode[]) => mount(FormsGenForm, { props: { schema: schema(tree) }, attachTo: document.body })

describe('safe URLs', () => {
  it('allows web, mail, phone and relative links; blocks script and data URLs', () => {
    for (const url of ['https://example.com/a?b=1#c', 'http://x.io', 'mailto:hi@example.com', 'tel:+96812345678', '/docs', 'docs/intro', '#top', '?q=1']) {
      expect(isSafeUrl(url), url).toBe(true)
    }
    for (const url of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>', 'vbscript:x', 'file:///etc/passwd', 'https://a.com/"onerror=', '', 42]) {
      expect(isSafeUrl(url), String(url)).toBe(false)
    }
  })

  it('the parser rejects unsafe link and image targets with their paths', () => {
    const result = parseFormSchema(
      schema([
        { id: 'a', type: 'link', props: { text: 'x', href: 'javascript:alert(1)' } },
        { id: 'b', type: 'image', props: { src: 'data:image/svg+xml,<svg onload=alert(1)>', alt: '' } },
        { id: 'c', type: 'link', props: { text: 'ok', href: 'https://example.com' } },
      ]),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      'tree[0].props.href: expected an http(s), mailto:, tel: or relative URL',
      'tree[1].props.src: expected an http(s), mailto:, tel: or relative URL',
    ])
  })
})

describe('new elements in the renderer', () => {
  it('every value type except hidden has a field component', () => {
    const valueTypes = Object.values(coreElements).filter((m) => m.hasValue && !m.isContainer).map((m) => m.type)
    expect(valueTypes.filter((t) => !FIELD_COMPONENTS[t])).toEqual(['hidden'])
  })

  it('toggle: a switch carrying a boolean; required means on', async () => {
    const wrapper = mountTree([
      { id: 't', type: 'toggle', name: 'agree', props: { label: 'Agree' }, validation: [{ rule: 'required' }] },
    ])
    const input = wrapper.get('input')
    expect(input.attributes('role')).toBe('switch')
    expect(input.classes()).toContain('fg-switch')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('This field is required')
    await input.setValue(true)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ agree: true }])
    wrapper.unmount()
  })

  it('choice groups render blocks and segmented buttons, still as native inputs', () => {
    const items = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    const wrapper = mountTree([
      { id: 'r', type: 'radiogroup', name: 'r', props: { label: 'R', items, display: 'buttons' } },
      { id: 'c', type: 'checkboxgroup', name: 'c', props: { label: 'C', items, display: 'blocks' } },
    ])
    const [radios, checks] = wrapper.findAll('.fg-options')
    expect(radios!.classes()).toContain('fg-options--buttons')
    expect(radios!.findAll('label.fg-option--button')).toHaveLength(2)
    expect(radios!.findAll('input[type=radio].fg-sr-only')).toHaveLength(2)
    expect(checks!.classes()).toContain('fg-options--blocks')
    expect(checks!.findAll('label.fg-option--block input[type=checkbox].fg-checkbox')).toHaveLength(2)
    wrapper.unmount()
  })

  it('vertical slider and color input', () => {
    const wrapper = mountTree([
      { id: 'v', type: 'range', name: 'v', props: { label: 'V', orientation: 'vertical' } },
      { id: 'k', type: 'color', name: 'k', props: { label: 'K' } },
    ])
    const range = wrapper.get('input[type=range]')
    expect(range.classes()).toContain('fg-range--vertical')
    expect(range.attributes('aria-orientation')).toBe('vertical')
    const color = wrapper.get('input[type=color]')
    expect(color.classes()).toContain('fg-input--color')
    expect((color.element as HTMLInputElement).value).toBe('#000000')
    wrapper.unmount()
  })

  it('hidden input: no markup, value submitted (only while visible)', async () => {
    const wrapper = mountTree([
      { id: 's', type: 'hidden', name: 'source', props: { value: 'landing' } },
      { id: 'x', type: 'checkbox', name: 'more', props: { label: 'More' } },
      { id: 'h', type: 'hidden', name: 'extra', props: { value: 'yes' }, conditions: [[{ field: 'more', operator: 'equals', value: true }]] },
    ])
    expect(wrapper.findAll('.fg-cell')).toHaveLength(1)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ source: 'landing', more: false }])
    await wrapper.get('input').setValue(true)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[1]).toEqual([{ source: 'landing', more: true, extra: 'yes' }])
    wrapper.unmount()
  })

  it('image, link and quote; unsafe URLs are dropped', () => {
    const wrapper = mountTree([
      { id: 'i', type: 'image', props: { src: 'https://example.com/a.png', alt: 'Logo', width: 120 } },
      { id: 'l', type: 'link', props: { text: 'Docs', href: 'https://example.com', newTab: true } },
      { id: 'u', type: 'link', props: { text: 'Bad', href: 'javascript:alert(1)' } },
      { id: 'q', type: 'quote', props: { text: 'Hello', cite: 'Someone' } },
    ])
    const img = wrapper.get('img.fg-image')
    expect(img.attributes()).toMatchObject({ src: 'https://example.com/a.png', alt: 'Logo', width: '120' })
    const [docs, bad] = wrapper.findAll('a.fg-link')
    expect(docs!.attributes()).toMatchObject({ href: 'https://example.com', target: '_blank', rel: 'noopener noreferrer' })
    expect(docs!.text()).toBe('Docs (opens in a new tab)')
    expect(bad!.attributes('href')).toBeUndefined()
    expect(wrapper.get('figure.fg-quote blockquote').text()).toBe('Hello')
    expect(wrapper.get('figure.fg-quote figcaption').text()).toBe('Someone')
    wrapper.unmount()
  })

  it('reset button restores the initial values, clears errors and announces it', async () => {
    const wrapper = mountTree([
      { id: 'n', type: 'text', name: 'name', props: { label: 'Name', default: 'Ann' }, validation: [{ rule: 'required' }] },
      { id: 'b', type: 'button', props: { text: 'Start over', action: 'reset', variant: 'danger' } },
      { id: 'k', type: 'button', props: { text: 'Help', action: 'link', href: '/help' } },
    ])
    const input = wrapper.get('input')
    await input.setValue('')
    await input.trigger('blur')
    expect(wrapper.text()).toContain('This field is required')
    const reset = wrapper.get('button.fg-button--danger')
    expect(reset.attributes('type')).toBe('button')
    await reset.trigger('click')
    await nextTick()
    await nextTick()
    expect((input.element as HTMLInputElement).value).toBe('Ann')
    expect(wrapper.text()).not.toContain('This field is required')
    expect(wrapper.get('[role=status]').text()).toBe('The form was reset.')
    expect(wrapper.get('a.fg-button').attributes('href')).toBe('/help')
    wrapper.unmount()
  })
})
