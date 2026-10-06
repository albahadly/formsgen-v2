<script setup lang="ts">
// Rich text: a contenteditable editor with a small toolbar (bold, italic,
// lists, link). The value is the cleaned HTML (richAnswer.ts); pasting
// inserts plain text. Changes from elsewhere (a reset, saved answers)
// show in the editor while it isn't being typed in.
import { computed, onMounted, ref, watch } from 'vue'
import { MESSAGES } from '../../messages'
import { cleanRichText, isRichHref } from '../../richAnswer'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgTip from './FgTip.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, label, description, required, fieldId, tooltip, errorId, describedBy, onBlur, labelClass } =
  useField(props)
const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)
const editor = ref<HTMLElement | null>(null)

const current = computed(() => cleanRichText(value.value))
function show(): void {
  const el = editor.value
  if (!el || document.activeElement === el || cleanRichText(el.innerHTML) === current.value) return
  el.innerHTML = current.value
}
onMounted(show)
watch(current, show)

function onInput(): void {
  if (editor.value) value.value = cleanRichText(editor.value.innerHTML)
}
function run(command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList'): void {
  editor.value?.focus()
  document.execCommand(command)
  onInput()
}
function link(): void {
  const url = window.prompt(messages.value.richLinkPrompt, 'https://')
  if (url === null) return
  editor.value?.focus()
  if (url.trim() === '') document.execCommand('unlink')
  else if (isRichHref(url)) document.execCommand('createLink', false, url.trim())
  onInput()
}
function onPaste(event: ClipboardEvent): void {
  event.preventDefault()
  document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '')
}
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <div :class="labelClass">
      <span :id="`${fieldId}-label`">{{ label }}</span><span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
      <FgTip
        v-if="tooltip"
        :id="`${fieldId}-tip`"
        :text="tooltip"
      />
    </div>
    <div class="fg-richtext">
      <div
        class="fg-richtext-toolbar"
        role="toolbar"
        :aria-label="messages.richToolbar"
        :aria-controls="fieldId"
      >
        <button
          type="button"
          class="fg-richtext-button"
          :aria-label="messages.richBold"
          :title="messages.richBold"
          data-fg-rt-cmd="bold"
          @mousedown.prevent
          @click="run('bold')"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          class="fg-richtext-button"
          :aria-label="messages.richItalic"
          :title="messages.richItalic"
          data-fg-rt-cmd="italic"
          @mousedown.prevent
          @click="run('italic')"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          class="fg-richtext-button"
          :aria-label="messages.richBullets"
          :title="messages.richBullets"
          data-fg-rt-cmd="insertUnorderedList"
          @mousedown.prevent
          @click="run('insertUnorderedList')"
        >
          •
        </button>
        <button
          type="button"
          class="fg-richtext-button"
          :aria-label="messages.richNumbers"
          :title="messages.richNumbers"
          data-fg-rt-cmd="insertOrderedList"
          @mousedown.prevent
          @click="run('insertOrderedList')"
        >
          <span dir="ltr">1.</span>
        </button>
        <button
          type="button"
          class="fg-richtext-button"
          :aria-label="messages.richLink"
          :title="messages.richLink"
          data-fg-rt-cmd="link"
          @mousedown.prevent
          @click="link"
        >
          🔗
        </button>
      </div>
      <div
        :id="fieldId"
        ref="editor"
        class="fg-richtext-editor"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        :aria-labelledby="`${fieldId}-label`"
        :aria-describedby="describedBy"
        :aria-invalid="error ? 'true' : undefined"
        :aria-required="required ? 'true' : undefined"
        data-fg-richtext
        @input="onInput"
        @blur="onBlur"
        @paste="onPaste"
      />
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
  </div>
</template>
