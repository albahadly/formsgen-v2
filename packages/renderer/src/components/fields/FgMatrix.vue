<script setup lang="ts">
// Matrix: a table with one radio group per row (each radio is named
// "<row>: <column>"; the table headers give the same context visually).
import { computed } from 'vue'
import { matrixColumns, matrixRows } from '../../matrix'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'

const props = defineProps<{ node: ElementNode; path: string }>()
const { value, error, label, description, required, fieldId, errorId, describedBy, onBlur, labelClass } =
  useField(props)

const rows = computed(() => matrixRows(props.node))
const columns = computed(() => matrixColumns(props.node))
const answers = computed(() => (value.value && typeof value.value === 'object' ? (value.value as Record<string, unknown>) : {}))

function choose(row: string, column: string): void {
  value.value = { ...Object.fromEntries(rows.value.map((r) => [r.value, answers.value[r.value] ?? null])), [row]: column }
}

const radioId = (ri: number, ci: number): string => (ri === 0 && ci === 0 ? fieldId.value : `${fieldId.value}-${ri}-${ci}`)
</script>

<template>
  <fieldset
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <legend :class="labelClass">
      {{ label }}<span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
    </legend>
    <div class="fg-matrix-scroll">
      <table class="fg-matrix">
        <thead>
          <tr>
            <td />
            <th
              v-for="column in columns"
              :key="column.value"
              scope="col"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, ri) in rows"
            :key="row.value"
          >
            <th scope="row">
              {{ row.label }}
            </th>
            <td
              v-for="(column, ci) in columns"
              :key="column.value"
            >
              <input
                :id="radioId(ri, ci)"
                type="radio"
                :name="`${fieldId}-${row.value}`"
                :value="column.value"
                :checked="answers[row.value] === column.value"
                :aria-label="`${row.label}: ${column.label}`"
                :aria-describedby="describedBy"
                @change="choose(row.value, column.value)"
                @blur="onBlur"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-if="description"
      class="fg-description"
    >
      {{ description }}
    </p>
    <p
      v-if="error"
      :id="errorId"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </fieldset>
</template>
