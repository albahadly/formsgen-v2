// @formsgen/renderer public entry point.
import './styles.css'

export const RENDERER_VERSION = '0.0.1'

export { default as FormsGenForm } from './components/FormsGenForm.vue'

// Field components, exported for design-mode rendering in the builder.
export { default as FgCheckbox } from './components/fields/FgCheckbox.vue'
export { default as FgCheckboxGroup } from './components/fields/FgCheckboxGroup.vue'
export { default as FgMultiSelect } from './components/fields/FgMultiSelect.vue'
export { default as FgNumber } from './components/fields/FgNumber.vue'
export { default as FgRadioGroup } from './components/fields/FgRadioGroup.vue'
export { default as FgRange } from './components/fields/FgRange.vue'
export { default as FgSelect } from './components/fields/FgSelect.vue'
export { default as FgStatic } from './components/fields/FgStatic.vue'
export { default as FgTags } from './components/fields/FgTags.vue'
export { default as FgText } from './components/fields/FgText.vue'
export { default as FgTextarea } from './components/fields/FgTextarea.vue'

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
  type SubmitAlign,
  type SubmitButtonConfig,
  type SubmitConfig,
  type ThemeTokens,
} from './schema'

export {
  SECTION_CONTAINERS,
  SECTION_TYPES,
  TEXT_INPUT_TYPES,
  coreElements,
  getCoreElement,
  type CoreElementMeta,
} from './elements'

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
