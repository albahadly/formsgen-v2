// Field component per core value type (ADR-0001). Shared by <FgNode> and
// the builder's design canvas so the two never drift apart.

import type { Component } from 'vue'
import { TEXT_INPUT_TYPES } from '../elements'
import FgCheckbox from './fields/FgCheckbox.vue'
import FgFile from './fields/FgFile.vue'
import FgCheckboxGroup from './fields/FgCheckboxGroup.vue'
import FgDateRange from './fields/FgDateRange.vue'
import FgDates from './fields/FgDates.vue'
import FgMultiSelect from './fields/FgMultiSelect.vue'
import FgMatrix from './fields/FgMatrix.vue'
import FgNumber from './fields/FgNumber.vue'
import FgPhone from './fields/FgPhone.vue'
import FgRadioGroup from './fields/FgRadioGroup.vue'
import FgRange from './fields/FgRange.vue'
import FgRangeSlider from './fields/FgRangeSlider.vue'
import FgSelect from './fields/FgSelect.vue'
import FgTags from './fields/FgTags.vue'
import FgText from './fields/FgText.vue'
import FgTextarea from './fields/FgTextarea.vue'

export const FIELD_COMPONENTS: Readonly<Record<string, Component>> = {
  ...Object.fromEntries(Object.keys(TEXT_INPUT_TYPES).map((type) => [type, FgText])),
  textarea: FgTextarea,
  number: FgNumber,
  select: FgSelect,
  multiselect: FgMultiSelect,
  tags: FgTags,
  radiogroup: FgRadioGroup,
  checkbox: FgCheckbox,
  toggle: FgCheckbox,
  checkboxgroup: FgCheckboxGroup,
  range: FgRange,
  rangeslider: FgRangeSlider,
  daterange: FgDateRange,
  dates: FgDates,
  matrix: FgMatrix,
  phone: FgPhone,
  file: FgFile,
  imageupload: FgFile,
}

export function fieldComponentFor(type: string): Component | undefined {
  return FIELD_COMPONENTS[type]
}
