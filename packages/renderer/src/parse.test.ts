import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../fixtures/kitchen-sink.formsgen.json'
import { parseFormSchema } from './parse'

const validSchema = () => JSON.parse(JSON.stringify(kitchenSink)) as Record<string, unknown>

describe('parseFormSchema', () => {
  it('accepts the kitchen-sink fixture', () => {
    const result = parseFormSchema(kitchenSink)
    expect(result.ok).toBe(true)
  })

  it('validates element style values (ADR-0002) and reports their paths', () => {
    const input = validSchema() as { tree: Record<string, unknown>[] }
    input.tree[0]!['style'] = {
      size: 'xl',
      align: 'left',
      tone: 'blue',
      hideLabel: 'yes',
      className: 'ok "><script>',
    }
    const result = parseFormSchema(input)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      'tree[0].style.size: expected one of sm, lg',
      'tree[0].style.align: expected one of center, end',
      'tree[0].style.tone: expected one of muted, primary, danger',
      'tree[0].style.hideLabel: expected a boolean',
      'tree[0].style.className: expected space-separated CSS class names',
    ])
  })

  it('accepts Tailwind-style custom classes', () => {
    const input = validSchema() as { tree: Record<string, unknown>[] }
    input.tree[0]!['style'] = { className: 'md:w-1/2 bg-[#fafafa] !mt-2 hover:shadow-lg' }
    expect(parseFormSchema(input).ok).toBe(true)
  })

  it('rejects non-objects', () => {
    expect(parseFormSchema(null).ok).toBe(false)
    expect(parseFormSchema('{}').ok).toBe(false)
  })

  it('rejects a wrong $schema id', () => {
    const input = validSchema()
    input['$schema'] = 'formsgen/v1'
    const result = parseFormSchema(input)
    expect(result).toEqual({ ok: false, errors: ['$schema: expected "formsgen/v2"'] })
  })

  it('rejects bad meta fields', () => {
    const input = validSchema()
    input['meta'] = { name: '2bad', locale: '', dir: 'up' }
    const result = parseFormSchema(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(3)
      expect(result.errors.join(' ')).toMatch(/meta\.name/)
      expect(result.errors.join(' ')).toMatch(/meta\.locale/)
      expect(result.errors.join(' ')).toMatch(/meta\.dir/)
    }
  })

  it('rejects duplicate ids anywhere in the tree', () => {
    const input = validSchema()
    const tree = input['tree'] as Record<string, unknown>[]
    ;(tree[0] as Record<string, unknown>)['id'] = 'ks-bio' // collides with nested node
    const result = parseFormSchema(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/duplicate id "ks-bio"/)
  })

  it('rejects duplicate names among siblings but allows them across levels', () => {
    const input = validSchema()
    const tree = input['tree'] as Record<string, unknown>[]
    // same name on two root siblings -> error
    ;(tree[1] as Record<string, unknown>)['name'] = 'full_name'
    expect(parseFormSchema(input).ok).toBe(false)

    const input2 = validSchema()
    const tree2 = input2['tree'] as Record<string, unknown>[]
    // reusing a root name inside the nested group -> fine
    const group = tree2.find((n) => n['id'] === 'ks-account') as { children: Record<string, unknown>[] }
    ;(group.children[0] as Record<string, unknown>)['name'] = 'full_name'
    expect(parseFormSchema(input2).ok).toBe(true)
  })

  it('rejects unknown rules and condition operators with paths', () => {
    const input = validSchema()
    const tree = input['tree'] as Record<string, unknown>[]
    ;(tree[0] as Record<string, unknown>)['validation'] = [{ rule: 'sparkly' }]
    ;(tree[1] as Record<string, unknown>)['conditions'] = [[{ field: 'x', operator: 'resembles' }]]
    const result = parseFormSchema(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join('\n')).toMatch(/tree\[0\]\.validation\[0\]/)
      expect(result.errors.join('\n')).toMatch(/tree\[1\]\.conditions\[0\]\[0\]/)
    }
  })

  it('rejects malformed nodes with precise paths', () => {
    const result = parseFormSchema({
      $schema: 'formsgen/v2',
      meta: { name: 'f', locale: 'en', dir: 'ltr' },
      tree: [{ id: 'a', type: 'group', props: {}, children: [{ id: '', type: '', props: null }] }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join('\n')).toMatch(/tree\[0\]\.children\[0\]\.id/)
      expect(result.errors.join('\n')).toMatch(/tree\[0\]\.children\[0\]\.type/)
      expect(result.errors.join('\n')).toMatch(/tree\[0\]\.children\[0\]\.props/)
    }
  })
})
