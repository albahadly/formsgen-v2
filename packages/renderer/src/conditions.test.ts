import { describe, expect, it } from 'vitest'
import { evaluateCondition, getValueByPath, isVisible } from './conditions'
import type { Condition } from './schema'

const data: Record<string, unknown> = {
  plan: 'pro',
  seats: 5,
  tags: ['a', 'b'],
  note: '',
  account: { username: 'jane' },
  accepted: false,
}

const lookup = (f: string) => getValueByPath(data, f)
const cond = (field: string, operator: Condition['operator'], value?: unknown): Condition =>
  value === undefined ? { field, operator } : { field, operator, value }

describe('getValueByPath', () => {
  it('reads flat and nested paths, undefined for misses', () => {
    expect(getValueByPath(data, 'plan')).toBe('pro')
    expect(getValueByPath(data, 'account.username')).toBe('jane')
    expect(getValueByPath(data, 'account.missing')).toBeUndefined()
    expect(getValueByPath(data, 'nope.deep')).toBeUndefined()
  })
})

describe('evaluateCondition operators', () => {
  it('equals / not-equals are strict', () => {
    expect(evaluateCondition(cond('plan', 'equals', 'pro'), lookup)).toBe(true)
    expect(evaluateCondition(cond('seats', 'equals', '5'), lookup)).toBe(false)
    expect(evaluateCondition(cond('plan', 'not-equals', 'free'), lookup)).toBe(true)
  })

  it('contains works on strings and arrays', () => {
    expect(evaluateCondition(cond('account.username', 'contains', 'an'), lookup)).toBe(true)
    expect(evaluateCondition(cond('tags', 'contains', 'b'), lookup)).toBe(true)
    expect(evaluateCondition(cond('tags', 'contains', 'z'), lookup)).toBe(false)
    expect(evaluateCondition(cond('seats', 'contains', '5'), lookup)).toBe(false)
  })

  it('empty / not-empty treat false as empty (unchecked checkbox)', () => {
    expect(evaluateCondition(cond('note', 'empty'), lookup)).toBe(true)
    expect(evaluateCondition(cond('accepted', 'empty'), lookup)).toBe(true)
    expect(evaluateCondition(cond('plan', 'not-empty'), lookup)).toBe(true)
  })

  it('greater-than / less-than are numeric and NaN-safe', () => {
    expect(evaluateCondition(cond('seats', 'greater-than', 3), lookup)).toBe(true)
    expect(evaluateCondition(cond('seats', 'less-than', 3), lookup)).toBe(false)
    expect(evaluateCondition(cond('plan', 'greater-than', 3), lookup)).toBe(false)
  })
})

describe('isVisible', () => {
  it('no groups means visible', () => {
    expect(isVisible(undefined, lookup)).toBe(true)
    expect(isVisible([], lookup)).toBe(true)
  })

  it('inner groups AND, outer groups OR', () => {
    const andGroup = [cond('plan', 'equals', 'pro'), cond('seats', 'greater-than', 3)]
    expect(isVisible([andGroup], lookup)).toBe(true)
    expect(isVisible([[...andGroup, cond('plan', 'equals', 'free')]], lookup)).toBe(false)
    expect(
      isVisible([[cond('plan', 'equals', 'free')], [cond('seats', 'equals', 5)]], lookup),
    ).toBe(true)
  })
})
