import { bootstrap5Adapter } from './bootstrap5'
import { tailwindAdapter } from './tailwind'
import type { CssFrameworkAdapter, CssFrameworkId } from './types'
import { vanillaAdapter } from './vanilla'

const adapters: Record<CssFrameworkId, CssFrameworkAdapter> = {
  vanilla: vanillaAdapter,
  tailwind: tailwindAdapter,
  bootstrap5: bootstrap5Adapter,
}

export function getCssAdapter(id: CssFrameworkId): CssFrameworkAdapter {
  return adapters[id]
}

export function listCssAdapters(): CssFrameworkAdapter[] {
  return Object.values(adapters)
}

export type { CssFrameworkAdapter, CssFrameworkId, Slot } from './types'
