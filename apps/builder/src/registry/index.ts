import { getCoreElement } from '@formsgen/renderer'
import { checkboxElement } from './elements/checkbox'
import { checkboxGroupElement, radioGroupElement } from './elements/choiceGroups'
import { columnsElement } from './elements/columns'
import { groupElement } from './elements/group'
import { numberElement, rangeElement } from './elements/number'
import { multiSelectElement, selectElement } from './elements/select'
import { tagsElement } from './elements/tags'
import {
  stepElement,
  stepsElement,
  tabElement,
  tabsElement,
} from './elements/sections'
import {
  dividerElement,
  headingElement,
  paragraphElement,
} from './elements/staticElements'
import { textElement } from './elements/text'
import { textareaElement } from './elements/textarea'
import {
  dateElement,
  emailElement,
  passwordElement,
  phoneElement,
  timeElement,
  urlElement,
} from './elements/textVariants'
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

// Element catalog. Adding a type = one file in ./elements plus one entry
// here (order defines palette order within each category).
for (const def of [
  // fields
  textElement,
  textareaElement,
  numberElement,
  emailElement,
  phoneElement,
  passwordElement,
  urlElement,
  dateElement,
  timeElement,
  selectElement,
  multiSelectElement,
  tagsElement,
  radioGroupElement,
  checkboxElement,
  checkboxGroupElement,
  rangeElement,
  // static
  headingElement,
  paragraphElement,
  dividerElement,
  // structure
  groupElement,
  columnsElement,
  tabsElement,
  tabElement,
  stepsElement,
  stepElement,
]) {
  registerElement(def)
}
