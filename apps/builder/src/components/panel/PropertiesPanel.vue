<script setup lang="ts">
import { computed } from 'vue'
import { t, tOr } from '@/i18n'
import { getElement } from '@/registry'
import type { PanelControl } from '@/registry/types'
import { useBuilderStore } from '@/stores/builder'
import ControlColspan from './controls/ControlColspan.vue'
import ControlConditions from './controls/ControlConditions.vue'
import ControlItems from './controls/ControlItems.vue'
import ControlName from './controls/ControlName.vue'
import ControlNumber from './controls/ControlNumber.vue'
import ControlSelect from './controls/ControlSelect.vue'
import ControlText from './controls/ControlText.vue'
import ControlToggle from './controls/ControlToggle.vue'
import ControlValidation from './controls/ControlValidation.vue'

const store = useBuilderStore()
const node = computed(() => store.selectedNode)
const definition = computed(() => (node.value ? getElement(node.value.type) : undefined))

function key(control: PanelControl, index: number): string {
  return 'prop' in control ? `${control.kind}-${control.prop}` : `${control.kind}-${index}`
}
</script>

<template>
  <div
    class="flex h-full flex-col gap-3 overflow-y-auto"
    data-testid="panel-properties"
  >
    <h2 class="text-sm font-semibold text-gray-700">
      {{ t('properties.title') }}
    </h2>
    <p
      v-if="!node || !definition"
      class="py-8 text-center text-xs text-gray-400"
      data-testid="properties-empty"
    >
      {{ t('properties.empty') }}
    </p>
    <template v-else>
      <p class="text-xs text-gray-500">
        {{ tOr(`element.${node.type}.label`, definition.label) }}
        <code
          v-if="node.name"
          class="ms-1 rounded bg-gray-100 px-1 py-0.5 text-[11px]"
        >{{ node.name }}</code>
      </p>
      <section
        v-for="section in definition.propertyPanel"
        :key="section.title"
        class="flex flex-col gap-2 border-t border-gray-100 pt-3"
      >
        <h3 class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {{ section.title }}
        </h3>
        <template
          v-for="(control, index) in section.controls"
          :key="key(control, index)"
        >
          <ControlText
            v-if="control.kind === 'text'"
            :node="node"
            :prop="control.prop"
            :label="control.label"
            :placeholder="control.placeholder"
          />
          <ControlNumber
            v-else-if="control.kind === 'number'"
            :node="node"
            :prop="control.prop"
            :label="control.label"
            :min="control.min"
            :max="control.max"
          />
          <ControlToggle
            v-else-if="control.kind === 'toggle'"
            :node="node"
            :prop="control.prop"
            :label="control.label"
          />
          <ControlSelect
            v-else-if="control.kind === 'select'"
            :node="node"
            :prop="control.prop"
            :label="control.label"
            :options="control.options"
          />
          <ControlItems
            v-else-if="control.kind === 'items'"
            :node="node"
            :prop="control.prop"
            :label="control.label"
          />
          <ControlName
            v-else-if="control.kind === 'name'"
            :node="node"
          />
          <ControlValidation
            v-else-if="control.kind === 'validation'"
            :node="node"
          />
          <ControlColspan
            v-else-if="control.kind === 'colspan'"
            :node="node"
          />
          <ControlConditions
            v-else-if="control.kind === 'conditions'"
            :node="node"
          />
        </template>
      </section>
    </template>
  </div>
</template>
