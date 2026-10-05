<script setup lang="ts">
// Repeatable section: an array of item objects with add/remove buttons
// (and move up/down when props.sortable). Adding focuses the new item's
// first control; removing focuses the item that took its place (or the add
// button); moving keeps focus on the moved item. All are announced.
import { computed, inject, nextTick, ref, toRaw } from 'vue'
import { FORM_CONTEXT } from '../context'
import { MESSAGES, fill } from '../messages'
import { repeaterItemDefaults, repeaterItemLabel, repeaterLimits, repeaterSortable } from '../repeater'
import type { ElementNode } from '../schema'
import FgRepeaterItem from './FgRepeaterItem.vue'

const props = defineProps<{ node: ElementNode; path: string }>()

const ctx = inject(FORM_CONTEXT)
if (!ctx) throw new Error('<FgRepeater> must be used inside <FormsGenForm>')
const formCtx = ctx
const messages = computed(() => formCtx.messages?.() ?? MESSAGES.en)

const items = computed<Record<string, unknown>[]>(() => {
  const value = formCtx.getValue(props.path)
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
})
const limits = computed(() => repeaterLimits(props.node))
const sortable = computed(() => repeaterSortable(props.node))
const legend = computed(() => {
  const l = props.node.props['label']
  return typeof l === 'string' && l !== '' ? l : null
})
const addText = computed(() => {
  const t = props.node.props['addText']
  return typeof t === 'string' && t !== '' ? t : messages.value.addItem
})
const itemLabel = (index: number): string => repeaterItemLabel(props.node, index, messages.value.item)

// Stable keys per item object, so removing an item never re-keys the rest.
const keys = new WeakMap<object, number>()
let nextKey = 0
function keyOf(item: Record<string, unknown>): number {
  const raw = toRaw(item)
  let key = keys.get(raw)
  if (key === undefined) {
    key = nextKey++
    keys.set(raw, key)
  }
  return key
}

const root = ref<HTMLElement | null>(null)
const addButton = ref<HTMLButtonElement | null>(null)
const itemElements = (): HTMLElement[] =>
  [...(root.value?.querySelectorAll<HTMLElement>(':scope > .fg-repeater-items > [data-fg-item]') ?? [])]

async function add(): Promise<void> {
  if (items.value.length >= limits.value.max) return
  const index = items.value.length
  formCtx.setValue(props.path, [...items.value, repeaterItemDefaults(props.node)])
  await nextTick()
  const item = itemElements()[index]
  const control = item?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')
  ;(control ?? item)?.focus()
  formCtx.announce?.(fill(messages.value.itemAdded, { label: itemLabel(index) }))
}

async function remove(index: number): Promise<void> {
  if (items.value.length <= limits.value.min) return
  const label = itemLabel(index)
  formCtx.shiftItems?.(props.path, index)
  formCtx.setValue(
    props.path,
    items.value.filter((_, i) => i !== index),
  )
  await nextTick()
  const remaining = itemElements()
  const target = remaining[Math.min(index, remaining.length - 1)]
  ;(target ?? addButton.value)?.focus()
  formCtx.announce?.(fill(messages.value.itemRemoved, { label }))
}

/** Swaps item `index` with its neighbour; focus stays on the moved item. */
async function move(index: number, delta: -1 | 1): Promise<void> {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  const label = itemLabel(index)
  const next = [...items.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  formCtx.swapItems?.(props.path, index, target)
  formCtx.setValue(props.path, next)
  await nextTick()
  const item = itemElements()[target]
  // The same button when it is still there, else the other direction's.
  const buttons = [...(item?.querySelectorAll<HTMLButtonElement>('[data-fg-move]') ?? [])]
  const same = buttons.find((b) => b.dataset['fgMove'] === (delta < 0 ? 'up' : 'down'))
  ;(same ?? buttons[0] ?? item)?.focus()
  formCtx.announce?.(fill(messages.value.itemMoved, { label, n: target + 1 }))
}
</script>

<template>
  <fieldset
    ref="root"
    class="fg-group fg-repeater"
  >
    <legend
      v-if="legend"
      class="fg-group-label"
    >
      {{ legend }}
    </legend>
    <div class="fg-repeater-items">
      <FgRepeaterItem
        v-for="(item, index) in items"
        :key="keyOf(item)"
        :node="node"
        :path="path"
        :index="index"
        :item-key="keyOf(item)"
        :label="itemLabel(index)"
        :can-remove="items.length > limits.min"
        :can-move-up="sortable && index > 0"
        :can-move-down="sortable && index < items.length - 1"
        @remove="remove(index)"
        @move="(delta) => move(index, delta)"
      />
    </div>
    <button
      v-if="items.length < limits.max"
      ref="addButton"
      type="button"
      class="fg-button fg-button--secondary fg-repeater-add"
      @click="add"
    >
      {{ addText }}
    </button>
  </fieldset>
</template>
