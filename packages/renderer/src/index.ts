// @formsgen/renderer public entry point.
import './styles.css'

export const RENDERER_VERSION = '0.0.1'

export { default as FormsGenForm } from './components/FormsGenForm.vue'

export { evaluateRules, isEmptyValue, type FieldLookup, type RuleViolation } from './rules'

export {
  evaluateCondition,
  getValueByPath,
  isVisible,
  type ValueLookup,
} from './conditions'

export {
  collectVisibleFields,
  joinPath,
  pickVisibleData,
  setValueByPath,
  type VisibleField,
} from './runtime'

export { FORM_CONTEXT, type FormContext } from './context'

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
