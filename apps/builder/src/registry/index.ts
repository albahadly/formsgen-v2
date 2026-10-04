import { getCoreElement } from '@formsgen/renderer'
import { checkboxElement } from './elements/checkbox'
import { columnsElement } from './elements/columns'
import { groupElement } from './elements/group'
import { selectElement } from './elements/select'
import { textElement } from './elements/text'
import { textareaElement } from './elements/textarea'
import type { ElementCategory, ElementDefinition } from './types'

const definitions = new Map<string, ElementDefinition>()

export function registerElement(def: ElementDefinition): void {
  if (definitions.has(def.type)) {
    throw new Error(`Element type "${def.type}" is already registered`)
  }
  if (!getCoreElement(def.type)) {
    throw new Error(
      `Element type "${def.type}" has no core semantics in @formsgen/renderer`,
    )
  }
  definitions.set(def.type, def)
}

export function getElement(type: string): ElementDefinition | undefined {
  return definitions.get(type)
}

export function listElements(category?: ElementCategory): ElementDefinition[] {
  const all = [...definitions.values()]
  return category ? all.filter((d) => d.category === category) : all
}

// Pilot set (phase 2). Later phases extend this list; adding an element
// type = one file in ./elements plus one register call here.
for (const def of [
  textElement,
  textareaElement,
  selectElement,
  checkboxElement,
  groupElement,
  columnsElement,
]) {
  registerElement(def)
}
