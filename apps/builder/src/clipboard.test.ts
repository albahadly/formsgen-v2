import type { ElementNode } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { ELEMENT_CLIPBOARD_TAG, elementFromClipboard, elementToClipboard } from './clipboard'

const node: ElementNode = { id: 'a1', type: 'text', name: 'email', props: { label: 'Email' }, validation: [{ rule: 'required' }] }

describe('element clipboard text', () => {
  it('round-trips a node through the tagged envelope', () => {
    const text = elementToClipboard(node)
    expect(JSON.parse(text)).toEqual({ formsgen: ELEMENT_CLIPBOARD_TAG, node })
    expect(elementFromClipboard(text)).toEqual(node)
  })

  it('accepts a bare node pasted from a schema file, with its children', () => {
    const group: ElementNode = { id: 'g', type: 'group', name: 'home', props: { label: 'Home' }, children: [node] }
    expect(elementFromClipboard(JSON.stringify(group))).toEqual(group)
  })

  it('refuses text that is not an element or a node that would not parse', () => {
    expect(elementFromClipboard('hello')).toBeNull()
    expect(elementFromClipboard('{"formsgen":"other","node":{}}')).toBeNull()
    expect(elementFromClipboard(JSON.stringify({ formsgen: ELEMENT_CLIPBOARD_TAG, node: { id: 'x', type: 'text' } }))).toBeNull()
    expect(elementFromClipboard(JSON.stringify({ id: 'n', type: 'nope', props: {} }))).toBeNull()
  })
})
