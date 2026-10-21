import { getCoreElement } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { createNode } from './factory'
import { getElement, listElements } from './index'

describe('element registry', () => {
  it('registers the full catalog', () => {
    expect(listElements().map((d) => d.type).sort()).toEqual([
      'button',
      'calculated',
      'checkbox',
      'checkboxgroup',
      'color',
      'columns',
      'date',
      'daterange',
      'dates',
      'datetime',
      'divider',
      'email',
      'file',
      'group',
      'heading',
      'hidden',
      'html',
      'image',
      'imageupload',
      'link',
      'location',
      'matrix',
      'month',
      'multiselect',
      'nps',
      'number',
      'paragraph',
      'password',
      'phone',
      'quote',
      'radiogroup',
      'range',
      'rangeslider',
      'rating',
      'repeater',
      'richtext',
      'search',
      'select',
      'signature',
      'step',
      'steps',
      'tab',
      'tabs',
      'tags',
      'text',
      'textarea',
      'time',
      'toggle',
      'url',
      'week',
    ])
  })

  it('filters by category', () => {
    expect(listElements('structure').map((d) => d.type).sort()).toEqual([
      'columns',
      'group',
      'repeater',
      'step',
      'steps',
      'tab',
      'tabs',
    ])
    expect(listElements('static').map((d) => d.type).sort()).toEqual([
      'button',
      'divider',
      'heading',
      'html',
      'image',
      'link',
      'paragraph',
      'quote',
    ])
    expect(listElements('fields')).toHaveLength(35)
  })

  it('every definition matches its core semantics in the renderer', () => {
    for (const def of listElements()) {
      const core = getCoreElement(def.type)
      expect(core, def.type).toBeDefined()
      expect(Boolean(def.hasValue), `${def.type}.hasValue`).toBe(core!.hasValue)
      expect(Boolean(def.isContainer), `${def.type}.isContainer`).toBe(core!.isContainer)
    }
  })

  it('every definition has a property panel and an icon', () => {
    for (const def of listElements()) {
      expect(def.propertyPanel.length, def.type).toBeGreaterThan(0)
      expect(def.icon, def.type).toMatch(/^<svg/)
      // every value element can edit its data key
      if (def.hasValue) {
        const controls = def.propertyPanel.flatMap((s) => s.controls)
        expect(controls.some((c) => c.kind === 'name'), `${def.type} name control`).toBe(true)
        // A hidden input carries a fixed value; a repeater's item count is
        // bounded by its min/max props: neither has rules to validate.
        if (def.type !== 'hidden' && def.type !== 'repeater') {
          expect(controls.some((c) => c.kind === 'validation'), `${def.type} validation`).toBe(true)
        }
      }
    }
  })
})

describe('createNode', () => {
  it('creates value nodes with unique names and cloned props', () => {
    const a = createNode('text', [])
    const b = createNode('text', [a.name!])
    expect(a.name).toBe('text')
    expect(b.name).toBe('text_2')
    expect(a.id).not.toBe(b.id)
    a.props['label'] = 'Changed'
    expect(getElement('text')!.defaultProps['label']).toBe('Text Input')
  })

  it('creates containers with children and no name', () => {
    const node = createNode('columns', [])
    expect(node.children).toEqual([])
    expect(node.name).toBeUndefined()
  })

  it('throws for unknown types', () => {
    expect(() => createNode('mystery', [])).toThrow(/Unknown element type/)
  })
})
