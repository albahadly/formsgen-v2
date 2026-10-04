<script setup lang="ts">
// One repeater item: provides the item scope (sibling references, unique
// ids) to its fields and renders the remove button.
import { computed, inject, provide, reactive, watch } from 'vue'
import { FORM_CONTEXT, ITEM_SCOPE } from '../context'
import { MESSAGES, fill } from '../messages'
import type { ElementNode } from '../schema'
import FgNode from './FgNode.vue'

const props = defineProps<{
  node: ElementNode
  /** Repeater path, e.g. "people". */
  path: string
  index: number
  label: string
  canRemove: boolean
}>()
const emit = defineEmits<{ remove: [] }>()

const ctx = inject(FORM_CONTEXT)
const messages = computed(() => ctx?.messages?.() ?? MESSAGES.en)

const scope = reactive({ template: props.path, actual: `${props.path}.${props.index}`, index: props.index })
watch(
  () => [props.path, props.index] as const,
  ([path, index]) => {
    scope.template = path
    scope.actual = `${path}.${index}`
    scope.index = index
  },
)
provide(ITEM_SCOPE, scope)
</script>

<template>
  <fieldset
    class="fg-repeater-item"
    data-fg-item
    tabindex="-1"
  >
    <legend class="fg-repeater-item-label">
      {{ label }}
    </legend>
    <div class="fg-grid">
      <FgNode
        v-for="child in node.children ?? []"
        :key="child.id"
        :node="child"
        :parent-path="scope.actual"
        :default-span="12"
      />
    </div>
    <div
      v-if="canRemove"
      class="fg-repeater-item-actions"
    >
      <button
        type="button"
        class="fg-repeater-remove"
        :aria-label="fill(messages.removeItemLabel, { label })"
        @click="emit('remove')"
      >
        {{ messages.removeItem }}
      </button>
    </div>
  </fieldset>
</template>
