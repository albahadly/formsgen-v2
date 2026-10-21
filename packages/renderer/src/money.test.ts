import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { currencyCode, currencySymbol, formatMoney, moneyDecimals, moneySeparators, parseMoney } from './money'
import type { ElementNode, FormSchema } from './schema'
import { suggestMinChars, suggestUrl, suggestionTexts } from './suggest'

const node = (type: string, props: Record<string, unknown> = {}): ElementNode => ({ id: 'n', type, name: 'n', props })
const schema = (tree: ElementNode[], locale = 'en'): FormSchema => ({ $schema: 'formsgen/v2', meta: { name: 'money', locale, dir: 'ltr' }, tree })

describe('money', () => {
  it('knows the separators of the five languages and falls back to English', () => {
    expect(moneySeparators('en-GB')).toEqual({ group: ',', decimal: '.' })
    expect(moneySeparators('de')).toEqual({ group: '.', decimal: ',' })
    expect(moneySeparators('fr_CA')).toEqual({ group: ' ', decimal: ',' })
    expect(moneySeparators('xx')).toEqual({ group: ',', decimal: '.' })
  })

  it('formats with grouping, fixed decimals and a sign', () => {
    expect(formatMoney(1234.5, 'en', 2)).toBe('1,234.50')
    expect(formatMoney(1234.5, 'de', 2)).toBe('1.234,50')
    expect(formatMoney(1234567, 'fr', 0)).toBe('1 234 567')
    expect(formatMoney(-0.5, 'es', 2)).toBe('-0,50')
    expect(formatMoney(12, 'en', 0)).toBe('12')
    expect(formatMoney(null, 'en', 2)).toBe('')
    expect(formatMoney('12', 'en', 2)).toBe('')
  })

  it('parses what people type in any locale', () => {
    expect(parseMoney('1,234.50', 2)).toBe(1234.5)
    expect(parseMoney('1.234,50', 2)).toBe(1234.5)
    expect(parseMoney('1 234,5', 2)).toBe(1234.5)
    expect(parseMoney('1,234', 2)).toBe(1234)
    expect(parseMoney('12,5', 2)).toBe(12.5)
    expect(parseMoney('$ 99.999', 2)).toBe(99999) // three digits after the mark: grouping
    expect(parseMoney('99.999', 3)).toBe(99.999)
    expect(parseMoney('2.675', 2)).toBe(2675)
    expect(parseMoney('2,675', 3)).toBe(2.675)
    expect(parseMoney('-7', 2)).toBe(-7)
    expect(parseMoney('1.5', 0)).toBe(15)
    expect(parseMoney('', 2)).toBeNull()
    expect(parseMoney('abc', 2)).toBeNull()
  })

  it('reads the props: code, symbol and decimals', () => {
    expect(currencyCode(node('currency'))).toBe('USD')
    expect(currencyCode(node('currency', { currency: ' eur ' }))).toBe('EUR')
    expect(currencyCode(node('currency', { currency: 'euros' }))).toBe('USD')
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('OMR')).toBe('OMR')
    expect(moneyDecimals(node('currency'))).toBe(2)
    expect(moneyDecimals(node('currency', { decimals: 9 }))).toBe(4)
    expect(moneyDecimals(node('currency', { decimals: 'x' }))).toBe(2)
  })

  it('the field shows the formatted value, reads typing, formats again on blur', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: schema([node('currency', { label: 'Price', currency: 'EUR' })], 'de'), modelValue: { n: 1234.5 } },
    })
    const input = wrapper.get<HTMLInputElement>('input#fg-n')
    expect(input.element.value).toBe('1.234,50')
    expect(wrapper.get('#fg-n-prefix').text()).toBe('€')
    await input.setValue('99,9')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ n: 99.9 })
    expect(input.element.value).toBe('99,9')
    await input.trigger('blur')
    expect(input.element.value).toBe('99,90')
    await input.setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ n: null })
    await input.trigger('blur')
    expect(input.element.value).toBe('')
  })
})

describe('address suggestions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('reads the props and the provider answer loosely', () => {
    expect(suggestUrl(node('address'))).toContain('nominatim')
    expect(suggestUrl(node('address', { suggestUrl: 'https://geo.example/s?q={q}' }))).toBe('https://geo.example/s?q={q}')
    expect(suggestUrl(node('address', { suggestUrl: 'ftp://x/{q}' }))).toContain('nominatim')
    expect(suggestUrl(node('address', { suggestUrl: 'https://geo.example/s' }))).toContain('nominatim')
    expect(suggestMinChars(node('address'))).toBe(3)
    expect(suggestMinChars(node('address', { minChars: 0 }))).toBe(1)
    expect(suggestionTexts(['A', ' B ', 'A', ''])).toEqual(['A', 'B'])
    expect(suggestionTexts([{ display_name: 'Muscat, Oman' }, { label: 'Berlin' }, { name: 'X' }, { other: 1 }])).toEqual(['Muscat, Oman', 'Berlin', 'X'])
    expect(suggestionTexts({ features: [{ properties: { label: 'Paris' } }] })).toEqual(['Paris'])
    expect(suggestionTexts({ results: Array.from({ length: 12 }, (_, i) => `r${i}`) })).toHaveLength(8)
    expect(suggestionTexts('nope')).toEqual([])
  })

  it('the field asks the provider after a pause once enough is typed and fills its datalist', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (url: string) => ({ json: async () => (url.includes('mus') ? [{ display_name: 'Muscat, Oman' }, { display_name: 'Musandam' }] : []) }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(FormsGenForm, {
      props: { schema: schema([node('address', { label: 'Where', suggestUrl: 'https://geo.example/s?q={q}', minChars: 3 })]) },
    })
    const input = wrapper.get<HTMLInputElement>('input#fg-n')
    expect(input.attributes('list')).toBe('fg-n-list')
    await input.setValue('mu')
    vi.advanceTimersByTime(400)
    expect(fetchMock).not.toHaveBeenCalled()
    await input.setValue('mus')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ n: 'mus' })
    vi.advanceTimersByTime(400)
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('https://geo.example/s?q=mus')
    expect(wrapper.findAll('datalist#fg-n-list option').map((o) => o.attributes('value'))).toEqual(['Muscat, Oman', 'Musandam'])
  })
})
