<script setup lang="ts">
// Repeatable section: an array of item objects with add/remove buttons
// (and move up/down when props.sortable). Adding focuses the new item's
// first control; removing focuses the item that took its place (or the add
// button); moving keeps focus on the moved item. All are announced.
// Sortable items can also be dragged by their handle and dropped on
// another item, taking its place (the buttons stay the keyboard way).
import { computed, inject, nextTick, ref, toRaw } from 'vue'
import { FORM_CONTEXT } from '../context'
import { MESSAGES, fill } from '../messages'
import { movedIndex, nextItemKey, repeaterItemDefaults, repeaterItemLabel, repeaterLimits, repeaterSortable } from '../repeater'
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
// Unique on the page, so nested items' radio group names never collide.
const keys = new WeakMap<object, number>()
function keyOf(item: Record<string, unknown>): number {
  const raw = toRaw(item)
  let key = keys.get(raw)
  if (key === undefined) {
    key = nextItemKey()
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

// ---- drag and drop (per repeater: an inner list's drags never reach the outer one) ----
const dragFrom = ref<number | null>(null)
const dropAt = ref<number | null>(null)
function onGrab(event: DragEvent, index: number): void {
  dragFrom.value = index
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', itemLabel(index))
  const item = itemElements()[index]
  if (item) event.dataTransfer.setDragImage(item, 16, 16)
}
function onDragOver(event: DragEvent, index: number): void {
  if (dragFrom.value === null) return
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropAt.value = index
}
function onDrop(event: DragEvent, index: number): void {
  if (dragFrom.value === null) return
  event.preventDefault()
  event.stopPropagation()
  const from = dragFrom.value
  onRelease()
  void moveTo(from, index)
}
function onRelease(): void {
  dragFrom.value = null
  dropAt.value = null
}
/** Where the dragged item would land: a line above or below the item under it. */
function dropSide(index: number): 'before' | 'after' | undefined {
  if (dropAt.value !== index || dragFrom.value === null || dragFrom.value === index) return undefined
  return index < dragFrom.value ? 'before' : 'after'
}

/** Moves item `from` to `to` (the others close up); the moved item gets focus. */
async function moveTo(from: number, to: number): Promise<void> {
  if (from === to || to < 0 || to >= items.value.length) return
  const label = itemLabel(from)
  const next = [...items.value]
  next.splice(to, 0, next.splice(from, 1)[0]!)
  formCtx.moveItems?.(props.path, from, to)
  formCtx.setValue(props.path, next)
  await nextTick()
  itemElements()[movedIndex(from, from, to)]?.focus()
  formCtx.announce?.(fill(messages.value.itemMoved, { label, n: to + 1 }))
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
        :can-drag="sortable && items.length > 1"
        :data-fg-drag="dragFrom === index ? '' : undefined"
        :data-fg-drop="dropSide(index)"
        @remove="remove(index)"
        @move="(delta) => move(index, delta)"
        @grab="(event) => onGrab(event, index)"
        @release="onRelease"
        @dragover="(event: DragEvent) => onDragOver(event, index)"
        @drop="(event: DragEvent) => onDrop(event, index)"
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
