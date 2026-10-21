import { uniqueName, type ElementNode } from '@albahadly/formsgen-renderer'
import { nanoid } from 'nanoid'
import { getElement } from './index'

/**
 * New canvas node for a registry type: fresh id, deep-cloned defaultProps,
 * a unique data key for value elements, an empty children array for
 * containers.
 */
export function createNode(type: string, takenNames: Iterable<string>): ElementNode {
  const def = getElement(type)
  if (!def) throw new Error(`Unknown element type "${type}"`)

  const node: ElementNode = {
    id: nanoid(10),
    type,
    props: structuredClone(def.defaultProps),
  }
  if (def.hasValue) node.name = uniqueName(type, takenNames)
  if (def.defaultValidation) node.validation = structuredClone(def.defaultValidation)
  if (def.isContainer) node.children = def.createChildren ? def.createChildren() : []
  return node
}
