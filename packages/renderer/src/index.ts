// @formsgen/renderer public entry point.
// Phase 2: canonical schema types, core element semantics, tree helpers,
// and the structural schema parser. Phase 3 adds the <FormsGenForm>
// component plus validation and condition evaluation.

export const RENDERER_VERSION = '0.0.1'

export {
  NAME_PATTERN,
  SCHEMA_ID,
  type ColSpan,
  type Condition,
  type ConditionGroups,
  type ConditionOperator,
  type ElementNode,
  type FormMeta,
  type FormSchema,
  type LayoutConfig,
  type Rule,
  type RuleName,
  type SubmitConfig,
  type ThemeTokens,
} from './schema'

export { coreElements, getCoreElement, type CoreElementMeta } from './elements'

export {
  buildDefaultData,
  collectNames,
  findNodeById,
  findParent,
  uniqueName,
  walkTree,
} from './tree'

export {
  KNOWN_CONDITION_OPERATORS,
  KNOWN_RULE_NAMES,
  parseFormSchema,
  type ParseResult,
} from './parse'
