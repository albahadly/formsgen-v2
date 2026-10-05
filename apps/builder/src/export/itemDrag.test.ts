import { movedIndex, parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from './css'
import { movedIndexJs } from './itemDrag'
import { getTarget } from './targets'

const people = (sortable: boolean): ElementNode => ({
  id: 'p',
  type: 'repeater',
  name: 'people',
  props: { label: 'People', itemLabel: 'Person {n}', sortable, initialItems: 2 },
  children: [{ id: 'n', type: 'text', name: 'name', props: { label: 'Name' } }],
})
const out = (target: string, sortable: boolean, css: CssFrameworkId = 'vanilla'): string => {
  const r = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'drag', locale: 'en', dir: 'ltr' }, tree: [people(sortable)] })
  if (!r.ok) throw new Error(r.errors.join())
  return getTarget(target)!.generate({ schema: r.schema, css: getCssAdapter(css) }).map((f) => f.content).join('\n')
}

describe('dragging sortable items in the exports', () => {
  it('the JS index helper matches the renderer for every move', () => {
    const moved = new Function(`${movedIndexJs(false)}\nreturn fgMovedIndex`)() as (n: number, from: number, to: number) => number
    for (let from = 0; from < 4; from++)
      for (let to = 0; to < 4; to++)
        for (let n = 0; n < 4; n++) expect(moved(n, from, to)).toBe(movedIndex(n, from, to))
  })

  it('every target has the handle and the drop targets, only when sortable', () => {
    const title = 'title="Drag to reorder"'
    expect(out('vue-standalone', true)).toContain(`@dragstart="fgDragStart($event, 'people', i)"`)
    expect(out('vue-standalone', true)).toContain(`@drop="fgDropItem($event, 'people', i)"`)
    expect(out('react', true)).toContain(`onDragStart={(e) => fgDragStart(e, 'people', i)}`)
    expect(out('react', true)).toContain(`onDrop={(e) => fgDropItem(e, 'people', i)}`)
    expect(out('html', true)).toContain('fgWireItemDrag(item, listPath)')
    const razor = out('blazor', true)
    expect(razor).toContain(`data-fg-list='@FgListId(Model.People, "people")'`)
    expect(razor).toContain('if (firstRender) await FgInteropInit();')
    expect(razor).toContain('@ref="fgFormRoot"')
    expect(razor).toContain('@implements IDisposable')
    expect(razor).toContain('[Microsoft.JSInterop.JSInvokable]')
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      expect(out(target, true), target).toContain(title)
      expect(out(target, true), target).toContain('aria-hidden="true"')
      expect(out(target, false), target).not.toMatch(/data-fg-handle|fgItemDrag|FgItemDrag|data-fg-list/)
    }
  })

  it('Tailwind marks the dragged item with classes; Bootstrap ships a few rules', () => {
    expect(out('react', true, 'tailwind')).toContain('data-[fg-drop=before]:shadow-[0_-3px_0_0_#4f46e5]')
    expect(out('html', true, 'bootstrap5')).toContain('[data-fg-item][data-fg-drop="before"] { box-shadow: 0 -3px 0 0 var(--bs-primary); }')
  })
})
