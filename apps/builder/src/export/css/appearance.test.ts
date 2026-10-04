import { describe, expect, it } from 'vitest'
import { getCssAdapter, listCssAdapters } from './index'
import { SIZED_SLOTS, TONED_SLOTS, type Slot } from './types'

describe('appearance modifiers in every CSS adapter', () => {
  it('every sized/toned slot yields a distinct variant; other slots ignore modifiers', () => {
    for (const adapter of listCssAdapters()) {
      for (const slot of SIZED_SLOTS) {
        for (const size of ['sm', 'lg'] as const) {
          expect(adapter.classes(slot, { size }), `${adapter.id}:${slot}:${size}`).not.toBe(
            adapter.classes(slot),
          )
        }
      }
      for (const slot of TONED_SLOTS) {
        for (const tone of ['muted', 'primary', 'danger'] as const) {
          expect(adapter.classes(slot, { tone }), `${adapter.id}:${slot}:${tone}`).not.toBe(
            adapter.classes(slot),
          )
        }
      }
      const label: Slot = 'label'
      expect(adapter.classes(label, { size: 'sm', tone: 'danger' })).toBe(adapter.classes(label))
    }
  })

  it('tailwind swaps utilities instead of stacking conflicting ones', () => {
    const tw = getCssAdapter('tailwind')
    const small = tw.classes('input', { size: 'sm' }).split(' ')
    expect(small).toEqual(expect.arrayContaining(['px-2', 'py-1', 'text-xs']))
    expect(small).not.toContain('px-3')
    expect(small).not.toContain('text-sm')
    const danger = tw.classes('paragraph', { tone: 'danger' }).split(' ')
    expect(danger).toContain('text-red-600')
    expect(danger).not.toContain('text-gray-600')
    expect(tw.alignClass('center')).toBe('text-center')
  })

  it('bootstrap uses its native size modifiers and one color utility', () => {
    const bs = getCssAdapter('bootstrap5')
    expect(bs.classes('input', { size: 'sm' })).toBe('form-control form-control-sm')
    expect(bs.classes('select', { size: 'lg' })).toBe('form-select form-select-lg')
    const muted = bs.classes('paragraph', { tone: 'primary' }).split(' ')
    expect(muted).toContain('text-primary')
    expect(muted).not.toContain('text-secondary')
    expect(bs.alignClass('end')).toBe('text-end')
  })

  it('vanilla appends modifier classes that its stylesheet defines', () => {
    const vanilla = getCssAdapter('vanilla')
    expect(vanilla.classes('input', { size: 'sm' })).toBe('fg-input fg-control--sm')
    expect(vanilla.classes('heading', { tone: 'primary' })).toBe('fg-heading fg-tone-primary')
    const css = vanilla.stylesheet!()
    for (const rule of ['.fg-control--sm', '.fg-control--lg', '.fg-align-center', '.fg-align-end']) {
      expect(css).toContain(rule)
    }
    for (const tone of ['muted', 'primary', 'danger']) expect(css).toContain(`.fg-tone-${tone}`)
  })
})
