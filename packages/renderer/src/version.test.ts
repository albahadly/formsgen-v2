import { describe, expect, it } from 'vitest'
import { version } from '../package.json'
import { RENDERER_VERSION } from './index'

// package.json is the version's single source. The constant the builder
// shows is a literal (importing package.json from the library source would
// move the declaration output under dist/src), so this keeps the two equal.
describe('RENDERER_VERSION', () => {
  it('matches package.json', () => {
    expect(RENDERER_VERSION).toBe(version)
  })
})
