import type { ElementNode } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import {
  defaultValueFor,
  listConditionSources,
  newCondition,
  operatorsFor,
  valueKindFor,
  withValue,
  type ConditionSource,
} from './sources'

const tree: ElementNode[] = [
  { id: 'n-name', type: 'text', name: 'full_name', props: { label: 'Full name' } },
  {
    id: 'n-plan',
    type: 'select',
    name: 'plan',
    props: { label: 'Plan', items: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
  },
  { id: 'n-terms', type: 'checkbox', name: 'terms', props: { label: 'Terms' } },
  { id: 'n-seats', type: 'number', name: 'seats', props: {} },
  {
    id: 'n-account',
    type: 'group',
    name: 'account',
    props: {},
    children: [{ id: 'n-user', type: 'text', name: 'username', props: { label: 'Username' } }],
  },
  {
    id: 'n-box',
    type: 'group',
    props: {},
    children: [{ id: 'n-inner', type: 'text', name: 'inner', props: {} }],
  },
  { id: 'n-heading', type: 'heading', props: { text: 'Hi' } },
]

const source = (type: string, options: ConditionSource['options'] = []): ConditionSource => ({
  path: 'x',
  label: 'X',
  type,
  options,
})

describe('listConditionSources', () => {
  it('lists named value fields with root-relative paths, labels and options', () => {
    const sources = listConditionSources(tree, 'nothing')
    expect(sources.map((s) => s.path)).toEqual([
      'full_name',
      'plan',
      'terms',
      'seats',
      'account.username',
      'inner',
    ])
    expect(sources.find((s) => s.path === 'seats')!.label).toBe('seats') // falls back to the name
    expect(sources.find((s) => s.path === 'plan')!.options).toEqual([
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
    ])
  })

  it('excludes the element itself and, for containers, its descendants', () => {
    expect(listConditionSources(tree, 'n-plan').map((s) => s.path)).not.toContain('plan')
    expect(listConditionSources(tree, 'n-account').map((s) => s.path)).not.toContain(
      'account.username',
    )
  })
})

describe('operators and value kinds follow the field type', () => {
  it('offers only operators that make sense', () => {
    expect(operatorsFor('checkbox')).toEqual(['equals'])
    expect(operatorsFor('number')).toContain('greater-than')
    expect(operatorsFor('text')).not.toContain('greater-than')
    expect(operatorsFor('select')).not.toContain('contains')
    expect(operatorsFor('multiselect')).toEqual(['contains', 'empty', 'not-empty'])
    expect(operatorsFor('file')).toEqual(['not-empty', 'empty'])
    expect(operatorsFor('imageupload')).toEqual(['not-empty', 'empty'])
    expect(operatorsFor('daterange')).toEqual(['not-empty', 'empty'])
    expect(operatorsFor('dates')).toEqual(['contains', 'empty', 'not-empty'])
  })

  it('stores values with the runtime type the renderer compares with ===', () => {
    expect(valueKindFor(source('checkbox'), 'equals')).toBe('boolean')
    expect(defaultValueFor(source('checkbox'), 'equals')).toBe(true)
    expect(valueKindFor(source('number'), 'equals')).toBe('number')
    expect(defaultValueFor(source('range'), 'less-than')).toBe(0)
    const plan = source('select', [{ value: 'free', label: 'Free' }])
    expect(valueKindFor(plan, 'equals')).toBe('option')
    expect(defaultValueFor(plan, 'equals')).toBe('free')
    expect(valueKindFor(source('text'), 'contains')).toBe('text')
    expect(valueKindFor(source('text'), 'empty')).toBe('none')
    // free-text tags have no options -> typed value
    expect(valueKindFor(source('tags'), 'contains')).toBe('text')
  })

  it('newCondition / withValue never store a value for empty checks', () => {
    expect(newCondition({ ...source('checkbox'), path: 'terms' })).toEqual({
      field: 'terms',
      operator: 'equals',
      value: true,
    })
    expect(withValue({ field: 'a', operator: 'empty', value: 'x' }, undefined)).toEqual({
      field: 'a',
      operator: 'empty',
    })
  })
})
