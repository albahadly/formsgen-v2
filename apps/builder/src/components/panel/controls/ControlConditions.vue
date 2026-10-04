<script setup lang="ts">
import type { Condition, ConditionOperator, ElementNode } from '@formsgen/renderer'
import { computed } from 'vue'
import {
  defaultValueFor,
  listConditionSources,
  newCondition,
  operatorsFor,
  valueKindFor,
  withValue,
  type ConditionSource,
  type ConditionValueKind,
} from '@/conditions/sources'
import { t } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'

const props = defineProps<{ node: ElementNode }>()
const store = useBuilderStore()

const sources = computed(() => listConditionSources(store.schema.tree, props.node.id))
const groups = computed<Condition[][]>(() => props.node.conditions ?? [])

const inputClass = 'min-w-0 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs'

function sourceOf(path: string): ConditionSource | undefined {
  return sources.value.find((s) => s.path === path)
}

function kindOf(condition: Condition): ConditionValueKind {
  const source = sourceOf(condition.field)
  return source ? valueKindFor(source, condition.operator) : 'none'
}

/** Writes a new groups structure; the store drops empty groups. */
function write(next: Condition[][]): void {
  store.setConditions(props.node.id, next)
}

function replaceAt(groupIndex: number, conditionIndex: number, condition: Condition | null): void {
  write(
    groups.value.map((group, g) =>
      g !== groupIndex
        ? group
        : condition === null
          ? group.filter((_, c) => c !== conditionIndex)
          : group.map((existing, c) => (c === conditionIndex ? condition : existing)),
    ),
  )
}

function addFirst(): void {
  const source = sources.value[0]
  if (source) write([[newCondition(source)]])
}

function addAnd(groupIndex: number): void {
  const group = groups.value[groupIndex] ?? []
  const last = group[group.length - 1]
  const source = (last && sourceOf(last.field)) ?? sources.value[0]
  if (!source) return
  write(groups.value.map((g, i) => (i === groupIndex ? [...g, newCondition(source)] : g)))
}

function addOr(): void {
  const source = sources.value[0]
  if (source) write([...groups.value, [newCondition(source)]])
}

function setField(groupIndex: number, conditionIndex: number, path: string): void {
  const source = sourceOf(path)
  if (source) replaceAt(groupIndex, conditionIndex, newCondition(source))
}

function setOperator(groupIndex: number, conditionIndex: number, operator: ConditionOperator): void {
  const condition = groups.value[groupIndex]?.[conditionIndex]
  const source = condition && sourceOf(condition.field)
  if (!condition || !source) return
  // Keep the value when the comparison type stays the same (e.g. is → is not).
  const keep = valueKindFor(source, condition.operator) === valueKindFor(source, operator)
  const value = keep ? condition.value : defaultValueFor(source, operator)
  replaceAt(
    groupIndex,
    conditionIndex,
    withValue({ ...condition, operator }, valueKindFor(source, operator) === 'none' ? undefined : value),
  )
}

function setValue(groupIndex: number, conditionIndex: number, raw: string): void {
  const condition = groups.value[groupIndex]?.[conditionIndex]
  if (!condition) return
  const kind = kindOf(condition)
  const value = kind === 'number' ? (raw === '' ? 0 : Number(raw)) : kind === 'boolean' ? raw === 'true' : raw
  replaceAt(groupIndex, conditionIndex, withValue(condition, value))
}

function missingText(path: string): string {
  return t('properties.conditions.missing').replace('{path}', path)
}

function optionsFor(condition: Condition): { value: string; label: string }[] {
  const options = sourceOf(condition.field)?.options ?? []
  const current = String(condition.value ?? '')
  // A value whose option was since removed stays visible so it can be fixed.
  return options.some((o) => o.value === current) || current === ''
    ? options
    : [...options, { value: current, label: current }]
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-testid="conditions-editor"
  >
    <template v-if="groups.length === 0">
      <p class="text-[11px] text-gray-500">
        {{ sources.length > 0 ? t('properties.conditions.always') : t('properties.conditions.noFields') }}
      </p>
      <button
        type="button"
        class="self-start rounded border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
        :disabled="sources.length === 0"
        data-testid="condition-add"
        @click="addFirst"
      >
        + {{ t('properties.conditions.add') }}
      </button>
    </template>

    <template v-else>
      <p class="text-[11px] text-gray-500">
        {{ t('properties.conditions.hint') }}
      </p>
      <template
        v-for="(group, gi) in groups"
        :key="gi"
      >
        <p
          v-if="gi > 0"
          class="text-center text-[11px] font-semibold uppercase text-gray-400"
        >
          {{ t('properties.conditions.or') }}
        </p>
        <div
          class="flex flex-col gap-1.5 rounded border border-gray-200 bg-gray-50 p-2"
          :data-testid="`condition-group-${gi}`"
        >
          <template
            v-for="(condition, ci) in group"
            :key="ci"
          >
            <p
              v-if="ci > 0"
              class="text-[11px] font-semibold text-gray-400"
            >
              {{ t('properties.conditions.and') }}
            </p>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <select
                  :class="[inputClass, 'flex-1']"
                  :value="condition.field"
                  :aria-label="t('properties.conditions.field')"
                  :data-testid="`condition-${gi}-${ci}-field`"
                  @change="setField(gi, ci, ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-if="!sourceOf(condition.field)"
                    :value="condition.field"
                    disabled
                  >
                    {{ condition.field }}
                  </option>
                  <option
                    v-for="source in sources"
                    :key="source.path"
                    :value="source.path"
                  >
                    {{ source.label }}
                  </option>
                </select>
                <button
                  type="button"
                  class="rounded px-1 text-xs text-red-500 hover:bg-red-50"
                  :aria-label="t('properties.conditions.remove')"
                  :data-testid="`condition-${gi}-${ci}-remove`"
                  @click="replaceAt(gi, ci, null)"
                >
                  ✕
                </button>
              </div>
              <p
                v-if="!sourceOf(condition.field)"
                class="text-[11px] text-amber-700"
                data-testid="condition-missing"
              >
                {{ missingText(condition.field) }}
              </p>
              <div
                v-else
                class="flex items-center gap-1"
              >
                <select
                  :class="[inputClass, 'flex-1']"
                  :value="condition.operator"
                  :aria-label="t('properties.conditions.operator')"
                  :data-testid="`condition-${gi}-${ci}-operator`"
                  @change="setOperator(gi, ci, ($event.target as HTMLSelectElement).value as ConditionOperator)"
                >
                  <option
                    v-for="op in operatorsFor(sourceOf(condition.field)!.type)"
                    :key="op"
                    :value="op"
                  >
                    {{ t(`properties.conditions.op.${op}`) }}
                  </option>
                </select>
                <select
                  v-if="kindOf(condition) === 'boolean'"
                  :class="[inputClass, 'flex-1']"
                  :value="String(condition.value === true)"
                  :aria-label="t('properties.conditions.value')"
                  :data-testid="`condition-${gi}-${ci}-value`"
                  @change="setValue(gi, ci, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="true">
                    {{ t('properties.conditions.checked') }}
                  </option>
                  <option value="false">
                    {{ t('properties.conditions.unchecked') }}
                  </option>
                </select>
                <select
                  v-else-if="kindOf(condition) === 'option'"
                  :class="[inputClass, 'flex-1']"
                  :value="String(condition.value ?? '')"
                  :aria-label="t('properties.conditions.value')"
                  :data-testid="`condition-${gi}-${ci}-value`"
                  @change="setValue(gi, ci, ($event.target as HTMLSelectElement).value)"
                >
                  <option
                    v-for="option in optionsFor(condition)"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <input
                  v-else-if="kindOf(condition) === 'number'"
                  type="number"
                  :class="[inputClass, 'w-20']"
                  :value="Number(condition.value ?? 0)"
                  :aria-label="t('properties.conditions.value')"
                  :data-testid="`condition-${gi}-${ci}-value`"
                  @input="setValue(gi, ci, ($event.target as HTMLInputElement).value)"
                >
                <input
                  v-else-if="kindOf(condition) === 'text'"
                  type="text"
                  :class="[inputClass, 'flex-1']"
                  :value="String(condition.value ?? '')"
                  :aria-label="t('properties.conditions.value')"
                  :data-testid="`condition-${gi}-${ci}-value`"
                  @input="setValue(gi, ci, ($event.target as HTMLInputElement).value)"
                >
              </div>
            </div>
          </template>
          <button
            type="button"
            class="self-start rounded px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
            :data-testid="`condition-add-and-${gi}`"
            @click="addAnd(gi)"
          >
            {{ t('properties.conditions.addAnd') }}
          </button>
        </div>
      </template>
      <button
        type="button"
        class="self-start rounded border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
        data-testid="condition-add-or"
        @click="addOr"
      >
        {{ t('properties.conditions.addOr') }}
      </button>
    </template>
  </div>
</template>
