import { blazorTarget } from './blazor'
import { htmlTarget } from './html'
import { jsonTarget } from './json'
import { reactTarget } from './react'
import type { ExportTarget } from './types'
import { vueLibTarget } from './vue-lib'
import { vueStandaloneTarget } from './vue-standalone'

const targets = new Map<string, ExportTarget>()

export function registerTarget(target: ExportTarget): void {
  if (targets.has(target.id)) {
    throw new Error(`Export target "${target.id}" is already registered`)
  }
  targets.set(target.id, target)
}

export function getTarget(id: string): ExportTarget | undefined {
  return targets.get(id)
}

export function listTargets(): ExportTarget[] {
  return [...targets.values()]
}

for (const target of [
  jsonTarget,
  vueLibTarget,
  vueStandaloneTarget,
  reactTarget,
  blazorTarget,
  htmlTarget,
]) {
  registerTarget(target)
}

export { componentName } from './types'
export type { ExportContext, ExportedFile, ExportTarget } from './types'
