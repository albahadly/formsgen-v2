import { describe, expect, it } from 'vitest'
import { evaluateRules, isEmptyValue } from './rules'
import type { Rule } from './schema'

const first = (rules: Rule[], value: unknown, lookup?: (f: string) => unknown) =>
  evaluateRules(rules, value, lookup)[0]?.rule ?? null

describe('isEmptyValue', () => {
  it('treats null/undefined/blank/empty-array as empty', () => {
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue(undefined)).toBe(true)
    expect(isEmptyValue('  ')).toBe(true)
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
  })
})

describe('evaluateRules', () => {
  it('required: empty values and false fail', () => {
    expect(first([{ rule: 'required' }], '')).toBe('required')
    expect(first([{ rule: 'required' }], null)).toBe('required')
    expect(first([{ rule: 'required' }], false)).toBe('required')
    expect(first([{ rule: 'required' }], true)).toBeNull()
    expect(first([{ rule: 'required' }], 'x')).toBeNull()
    expect(first([{ rule: 'required' }], 0)).toBeNull()
  })

  it('non-required rules are skipped on empty values', () => {
    expect(evaluateRules([{ rule: 'email' }, { rule: 'min', value: 3 }], '')).toEqual([])
  })

  it('min/max/between use length for strings and value for numbers', () => {
    expect(first([{ rule: 'min', value: 3 }], 'ab')).toBe('min')
    expect(first([{ rule: 'min', value: 3 }], 'abc')).toBeNull()
    expect(first([{ rule: 'min', value: 3 }], 2)).toBe('min')
    expect(first([{ rule: 'max', value: 2 }], 'abc')).toBe('max')
    expect(first([{ rule: 'max', value: 5 }], 4)).toBeNull()
    expect(first([{ rule: 'between', value: [3, 5] }], 'ab')).toBe('between')
    expect(first([{ rule: 'between', value: [3, 5] }], 'abcd')).toBeNull()
    expect(first([{ rule: 'between', value: [3, 5] }], 'abcdef')).toBe('between')
  })

  it('email / url / regex', () => {
    expect(first([{ rule: 'email' }], 'not-an-email')).toBe('email')
    expect(first([{ rule: 'email' }], 'a@b.co')).toBeNull()
    expect(first([{ rule: 'url' }], 'not a url')).toBe('url')
    expect(first([{ rule: 'url' }], 'https://example.com')).toBeNull()
    expect(first([{ rule: 'regex', value: '^[0-9]+$' }], 'abc')).toBe('regex')
    expect(first([{ rule: 'regex', value: '^[0-9]+$' }], '123')).toBeNull()
  })

  it('same-as compares against another field via the lookup', () => {
    const lookup = (f: string) => (f === 'password' ? 'secret' : undefined)
    expect(first([{ rule: 'same-as', value: 'password' }], 'secret', lookup)).toBeNull()
    expect(first([{ rule: 'same-as', value: 'password' }], 'other', lookup)).toBe('same-as')
  })

  it('custom messages override defaults, defaults mention the bound', () => {
    expect(evaluateRules([{ rule: 'required', message: 'Say something' }], '')[0]?.message).toBe(
      'Say something',
    )
    expect(evaluateRules([{ rule: 'min', value: 3 }], 'a')[0]?.message).toBe('Must be at least 3')
  })

  it('collects multiple violations in rule order', () => {
    const rules: Rule[] = [{ rule: 'min', value: 10 }, { rule: 'email' }]
    expect(evaluateRules(rules, 'short').map((v) => v.rule)).toEqual(['min', 'email'])
  })
})
