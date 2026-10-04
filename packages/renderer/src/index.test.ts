import { describe, expect, it } from 'vitest'
import { RENDERER_VERSION, SCHEMA_ID } from './index'

describe('@formsgen/renderer entry', () => {
  it('exposes the package version', () => {
    expect(RENDERER_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('exposes the canonical schema identifier', () => {
    expect(SCHEMA_ID).toBe('formsgen/v2')
  })
})
