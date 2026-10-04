import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../fixtures/kitchen-sink.formsgen.json'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import type { FormSchema } from './schema'
import {
  isSafeThemeValue,
  pinsLightScheme,
  readableTextOn,
  resolveTheme,
  shadeColor,
  themeCssVariables,
} from './theme'

function withTheme(theme: unknown): Record<string, unknown> {
  const input = JSON.parse(JSON.stringify(kitchenSink)) as { meta: Record<string, unknown> }
  input.meta['theme'] = theme
  return input
}

describe('theme values', () => {
  it('accepts plain CSS values, including quoted font families', () => {
    for (const value of ['#4f46e5', 'rgb(0 0 0 / 50%)', '12px', '"Helvetica Neue", Arial, sans-serif']) {
      expect(isSafeThemeValue(value), value).toBe(true)
    }
  })

  it('rejects anything that could end a declaration, a rule or a style element', () => {
    for (const value of [
      'red; } body { display: none',
      'red}',
      '</style><script>alert(1)</script>',
      'url(x) \\',
      '@import url(x)',
      'red\nblue',
      '"unbalanced',
      '',
      'x'.repeat(121),
      42,
    ]) {
      expect(isSafeThemeValue(value), String(value)).toBe(false)
    }
  })

  it('derives readable button text from the primary color', () => {
    expect(readableTextOn('#4f46e5')).toBe('#ffffff')
    expect(readableTextOn('#facc15')).toBe('#111827')
    expect(resolveTheme({ 'color-primary': '#fde047' })['color-primary-contrast']).toBe('#111827')
    expect(resolveTheme({ 'color-primary': '#fde047', 'color-primary-contrast': '#000' })['color-primary-contrast']).toBe('#000')
    expect(shadeColor('#ffffff', 0.5)).toBe('#808080')
    expect(shadeColor('red', 0.5)).toBe('red')
  })

  it('drops unsafe tokens and pins the light scheme only for bg/text colors', () => {
    expect(resolveTheme({ radius: '4px', 'Bad Token': '1px', font: 'x;y' })).toEqual({ radius: '4px' })
    expect(pinsLightScheme({ 'color-primary': '#000000' })).toBe(false)
    expect(pinsLightScheme({ 'color-bg': '#fafafa' })).toBe(true)
    expect(pinsLightScheme({ 'color-text': '#111111' })).toBe(true)
    expect(themeCssVariables({ radius: '0px' })).toEqual({ '--fg-radius': '0px' })
  })
})

describe('meta.theme parsing', () => {
  it('rejects injection attempts with their paths', () => {
    const result = parseFormSchema(
      withTheme({ 'color-primary': 'red; } * { display: none', 'Bad Name': '#fff', radius: 4 }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      'meta.theme.color-primary: expected a plain CSS value (no ; { } < > \\ @ or line breaks)',
      'meta.theme.Bad Name: expected a token name (lowercase letters, digits, dashes)',
      'meta.theme.radius: expected a plain CSS value (no ; { } < > \\ @ or line breaks)',
    ])
  })

  it('rejects a non-object theme and accepts a valid one', () => {
    expect(parseFormSchema(withTheme(['#fff'])).ok).toBe(false)
    expect(parseFormSchema(withTheme({ 'color-primary': '#0f766e', font: 'Georgia, serif' })).ok).toBe(true)
  })
})

describe('FormsGenForm theme', () => {
  const mountThemed = (theme: Record<string, string>) => {
    const result = parseFormSchema(withTheme(theme))
    if (!result.ok) throw new Error(result.errors.join('\n'))
    return mount(FormsGenForm, { props: { schema: result.schema as FormSchema } })
  }

  it('applies tokens as --fg-* variables with a derived contrast color', () => {
    const form = mountThemed({ 'color-primary': '#fde047', radius: '0px' }).get('form')
    const style = form.attributes('style') ?? ''
    expect(style).toContain('--fg-color-primary: #fde047')
    expect(style).toContain('--fg-color-primary-contrast: #111827')
    expect(style).toContain('--fg-radius: 0px')
    expect(form.attributes('data-fg-theme')).toBeUndefined()
  })

  it('pins the light scheme when the background or text color is custom', () => {
    const form = mountThemed({ 'color-bg': '#fffbeb' }).get('form')
    expect(form.attributes('data-fg-theme')).toBe('light')
  })
})
