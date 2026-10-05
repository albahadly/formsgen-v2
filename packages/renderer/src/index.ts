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
  scopedLookup,
  joinPath,
  pickVisibleData,
  setValueByPath,
  type VisibleField,
} from './runtime'

export { FORM_CONTEXT, type FormContext } from './context'

export {
  CLASS_TOKEN_PATTERN,
  NAME_PATTERN,
  SCHEMA_ID,
  type ColSpan,
  type ControlSize,
  type ElementStyle,
  type TextAlign,
  type TextTone,
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
  BOOLEAN_TYPES,
  SECTION_CONTAINERS,
  SECTION_TYPES,
  STATIC_TYPES,
  TEXT_INPUT_TYPES,
  choiceDisplay,
  coreElements,
  getCoreElement,
  isSafeUrl,
  isVerticalRange,
  type ChoiceDisplay,
  type CoreElementMeta,
} from './elements'
export { FIELD_COMPONENTS, fieldComponentFor } from './components/fieldComponents'
export {
  REPEATER_EXCLUDED_TYPES,
  REPEATER_TYPE,
  allowedInRepeater,
  itemPlacementProblem,
  MAX_REPEATER_DEPTH,
  pathIndexes,
  templatePath,
  isRepeater,
  repeaterItemDefaults,
  repeaterItemLabel,
  repeaterLimits,
  repeaterSortable,
  resolveScoped,
  type ItemScope,
} from './repeater'
export { default as FgRepeater } from './components/FgRepeater.vue'
export { default as FgFile } from './components/fields/FgFile.vue'
export {
  FILE_TYPES,
  acceptsFile,
  cloneData,
  describeFiles,
  fileLimits,
  fileProblem,
  firstFieldError,
  hasFiles,
  hasUploadFields,
  isFile,
  toSubmission,
  type FileLimits,
} from './files'
export { default as FgButton } from './components/fields/FgButton.vue'
export {
  COUNTRY_DIAL_CODES,
  composePhone,
  countryName,
  defaultPhoneCountry,
  hasCountrySelect,
  initialPhoneCountry,
  phoneCountries,
  splitPhone,
  type CountryOption,
} from './countries'
export { FLOATING_TYPES, floatsLabel } from './labels'
export { MATRIX_TYPE, matrixColumns, matrixDefault, matrixRows, type MatrixOption } from './matrix'
export {
  DATES_TYPE,
  DATE_RANGE_TYPE,
  OBJECT_VALUE_TYPES,
  RANGE_SLIDER_TYPE,
  addDate,
  dateOrderProblem,
  rangeBounds,
  rangePercent,
  rangeSliderDefault,
  type RangeBounds,
} from './composite'

export {
  buildDefaultData,
  collectNames,
  findNodeById,
  findParent,
  uniqueName,
  walkTree,
} from './tree'

export { errorsAnnouncement, stepAnnouncement, submittedAnnouncement } from './announcements'

export {
  FONT_PRESETS,
  RADIUS_PRESETS,
  SPACE_PRESETS,
  THEME_COLOR_TOKENS,
  THEME_DEFAULTS,
  THEME_PALETTES,
  THEME_TOKEN_PATTERN,
  contrastRatio,
  isSafeThemeValue,
  parseHexColor,
  pinsLightScheme,
  readableTextOn,
  resolveTheme,
  shadeColor,
  themeColorScheme,
  themeCssVariables,
  themeInlineStyle,
  themeValue,
  type ThemePalette,
  type ThemePreset,
} from './theme'

export {
  MESSAGES,
  defaultRuleMessage,
  fill,
  pluralCategory,
  pluralText,
  resolveMessages,
  type MessageCatalog,
  type PluralCategory,
  type PluralForms,
} from './messages'

export {
  KNOWN_CONDITION_OPERATORS,
  KNOWN_RULE_NAMES,
  parseFormSchema,
  type ParseResult,
} from './parse'
