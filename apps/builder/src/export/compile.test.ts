// Behavioral tests: the COMPILED validation/condition code must reproduce
// @formsgen/renderer semantics. Generated source is executed via new
// Function against the same cases as the renderer's own rule tests.

import type { ConditionGroups, Rule } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { RUNTIME_HELPERS, compileConditions, compileValidator } from './compile'

type Data = Record<string, unknown>

function makeValidator(rules: Rule[]) {
  const body = compileValidator(rules, 'data[path]', (field) => `data[${JSON.stringify(field)}]`)
  const fn = new Function(
    'data',
    'path',
    `${RUNTIME_HELPERS}\n  ${body}`,
  ) as (data: Data, path: string) => string | null
  return (value: unknown, data: Data = {}) => fn({ ...data, x: value }, 'x')
}

function makeCondition(groups: ConditionGroups) {
  const expr = compileConditions(groups, (field) => `data[${JSON.stringify(field)}]`)
  return new Function('data', `${RUNTIME_HELPERS}\nreturn ${expr}`) as (data: Data) => boolean
}

describe('compiled validators match renderer semantics', () => {
  it('required: empty values and false fail', () => {
    const v = makeValidator([{ rule: 'required' }])
    expect(v('')).toBe('This field is required')
    expect(v(null)).toBeTruthy()
    expect(v(false)).toBeTruthy()
    expect(v(true)).toBeNull()
    expect(v('x')).toBeNull()
    expect(v(0)).toBeNull()
  })

  it('non-required rules skip empty values', () => {
    const v = makeValidator([{ rule: 'email' }, { rule: 'min', value: 3 }])
    expect(v('')).toBeNull()
    expect(v(null)).toBeNull()
  })

  it('min/max/between over lengths and numbers', () => {
    expect(makeValidator([{ rule: 'min', value: 3 }])('ab')).toBe('Must be at least 3')
    expect(makeValidator([{ rule: 'min', value: 3 }])('abc')).toBeNull()
    expect(makeValidator([{ rule: 'min', value: 3 }])(2)).toBeTruthy()
    expect(makeValidator([{ rule: 'max', value: 2 }])('abc')).toBeTruthy()
    expect(makeValidator([{ rule: 'between', value: [3, 5] }])('ab')).toBeTruthy()
    expect(makeValidator([{ rule: 'between', value: [3, 5] }])('abcd')).toBeNull()
    expect(makeValidator([{ rule: 'between', value: [3, 5] }])('abcdef')).toBeTruthy()
  })

  it('email, url, regex', () => {
    expect(makeValidator([{ rule: 'email' }])('nope')).toBeTruthy()
    expect(makeValidator([{ rule: 'email' }])('a@b.co')).toBeNull()
    expect(makeValidator([{ rule: 'url' }])('not a url')).toBeTruthy()
    expect(makeValidator([{ rule: 'url' }])('https://example.com')).toBeNull()
    expect(makeValidator([{ rule: 'regex', value: '^[0-9]+$' }])('abc')).toBeTruthy()
    expect(makeValidator([{ rule: 'regex', value: '^[0-9]+$' }])('123')).toBeNull()
  })

  it('same-as reads the other field', () => {
    const v = makeValidator([{ rule: 'same-as', value: 'password' }])
    expect(v('secret', { password: 'secret' })).toBeNull()
    expect(v('other', { password: 'secret' })).toBe('Must match password')
  })

  it('custom messages win', () => {
    const v = makeValidator([{ rule: 'required', message: 'Say something' }])
    expect(v('')).toBe('Say something')
  })
})

describe('compiled conditions match renderer semantics', () => {
  const data: Data = { plan: 'pro', seats: 5, tags: ['a', 'b'], note: '', accepted: false }

  it('operators', () => {
    expect(makeCondition([[{ field: 'plan', operator: 'equals', value: 'pro' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'seats', operator: 'equals', value: '5' }]])(data)).toBe(false)
    expect(makeCondition([[{ field: 'plan', operator: 'not-equals', value: 'free' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'tags', operator: 'contains', value: 'b' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'plan', operator: 'contains', value: 'r' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'note', operator: 'empty' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'accepted', operator: 'empty' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'plan', operator: 'not-empty' }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'seats', operator: 'greater-than', value: 3 }]])(data)).toBe(true)
    expect(makeCondition([[{ field: 'seats', operator: 'less-than', value: 3 }]])(data)).toBe(false)
    expect(makeCondition([[{ field: 'plan', operator: 'greater-than', value: 3 }]])(data)).toBe(false)
  })

  it('outer OR, inner AND, empty means visible', () => {
    expect(makeCondition([])(data)).toBe(true)
    const and: ConditionGroups = [
      [
        { field: 'plan', operator: 'equals', value: 'pro' },
        { field: 'seats', operator: 'greater-than', value: 3 },
      ],
    ]
    expect(makeCondition(and)(data)).toBe(true)
    const or: ConditionGroups = [
      [{ field: 'plan', operator: 'equals', value: 'free' }],
      [{ field: 'seats', operator: 'equals', value: 5 }],
    ]
    expect(makeCondition(or)(data)).toBe(true)
  })
})

describe('pruneUnusedHelpers', () => {
  it('drops uncalled fg helpers (and their comments), keeping what is used', async () => {
    const { pruneUnusedHelpers } = await import('./compile')
    const code = `function fgUsed(): number {\n  return fgInner()\n}\n// only inner\nfunction fgInner(): number {\n  return 1\n}\n// never called\nfunction fgUnused(): number {\n  return fgDead()\n}\nfunction fgDead(): number {\n  return 2\n}\nconsole.log(fgUsed())\n`
    expect(pruneUnusedHelpers(code)).toBe(`function fgUsed(): number {\n  return fgInner()\n}\n// only inner\nfunction fgInner(): number {\n  return 1\n}\nconsole.log(fgUsed())\n`)
  })
})
