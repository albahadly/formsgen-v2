import { describe, expect, it } from 'vitest'
import { dropDirection } from './useDropList'

// A canvas list is a 12-column grid, which SortableJS reads as horizontal;
// the callback keeps rows of full-width cells vertical.
function cell(width: number, gridWidth = 600): HTMLElement {
  return {
    parentElement: { clientWidth: gridWidth },
    getBoundingClientRect: () => ({ width }),
  } as unknown as HTMLElement
}

describe('dropDirection', () => {
  it('is vertical over a cell that fills its row', () => {
    expect(dropDirection(new Event('dragover'), cell(600))).toBe('vertical')
    expect(dropDirection(new Event('dragover'), cell(560))).toBe('vertical') // minus the grid gap
  })

  it('is horizontal over a cell that shares its row', () => {
    expect(dropDirection(new Event('dragover'), cell(296))).toBe('horizontal')
    expect(dropDirection(new Event('dragover'), cell(192))).toBe('horizontal')
  })

  it('is vertical with no target (an empty list)', () => {
    expect(dropDirection(new Event('dragover'), null)).toBe('vertical')
  })
})
