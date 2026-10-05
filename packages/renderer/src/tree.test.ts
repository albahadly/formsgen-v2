import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../fixtures/kitchen-sink.formsgen.json'
import { parseFormSchema } from './parse'
import type { ElementNode, FormSchema } from './schema'
import {
  buildDefaultData,
  collectNames,
  findNodeById,
  findParent,
  uniqueName,
  walkTree,
} from './tree'

function loadFixture(): FormSchema {
  const result = parseFormSchema(JSON.parse(JSON.stringify(kitchenSink)))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

describe('walkTree / find helpers', () => {
  const { tree } = loadFixture()

  it('visits nested nodes depth-first', () => {
    const ids: string[] = []
    walkTree(tree, (node) => {
      ids.push(node.id)
    })
    expect(ids).toContain('ks-username')
    expect(ids.indexOf('ks-columns')).toBeLessThan(ids.indexOf('ks-city'))
  })

  it('stops when the visitor returns false', () => {
    const ids: string[] = []
    walkTree(tree, (node) => {
      ids.push(node.id)
      return node.id !== 'ks-city'
    })
    expect(ids[ids.length - 1]).toBe('ks-city')
    expect(ids).not.toContain('ks-zip')
  })

  it('finds nested nodes and their parents', () => {
    expect(findNodeById(tree, 'ks-bio')?.name).toBe('bio')
    expect(findParent(tree, 'ks-bio')?.id).toBe('ks-account')
    expect(findParent(tree, 'ks-full-name')).toBeNull()
    expect(findNodeById(tree, 'missing')).toBeNull()
  })

  it('collects every name in the tree', () => {
    const names = collectNames(tree)
    expect(names).toEqual(
      expect.arrayContaining(['full_name', 'account', 'username', 'city', 'terms']),
    )
  })
})

describe('uniqueName', () => {
  it('returns the base when free and suffixes when taken', () => {
    expect(uniqueName('text', [])).toBe('text')
    expect(uniqueName('text', ['text'])).toBe('text_2')
    expect(uniqueName('text', ['text', 'text_2'])).toBe('text_3')
  })
})

describe('buildDefaultData', () => {
  it('builds nested defaults from the kitchen-sink fixture', () => {
    const data = buildDefaultData(loadFixture().tree)
    expect(data).toEqual({
      full_name: '',
      email: '',
      website: '',
      seats: null,
      seat_cost: null,
      satisfaction: 5, // props.default wins over the range min
      // unnamed columns container is transparent:
      city: '',
      zip: '',
      // named group nests an object:
      account: { username: '', password: '', bio: '', birthday: '', avatar: [] },
      plan: null,
      interests: [],
      channels: [],
      topics: [],
      billing: null,
      extras: [],
      notify: true,
      appointment: '',
      brand_color: '#000000',
      volume: 0,
      budget: { from: 200, to: 600 },
      stay: { from: '', to: '' },
      days: [],
      rating: { speed: null, quality: null },
      usage: { forms: [], reports: [] },
      source: 'kitchen-sink',
      references: [{ name: '', may_contact: false, email: '', phone: '' }],
      attachments: [],
      attachments_note: '',
      contact_method: null,
      contact_phone: '',
      contact_other: '',
      // tabs/steps sections are data-transparent:
      twitter: '',
      github: '',
      shipping_city: '',
      order_notes: '',
      newsletter: true, // props.default wins over the type default
      terms: false,
    })
  })

  it('ignores unknown types and unnamed value elements', () => {
    const tree: ElementNode[] = [
      { id: 'a', type: 'mystery', props: {} },
      { id: 'b', type: 'text', props: {} },
    ]
    expect(buildDefaultData(tree)).toEqual({})
  })
})
