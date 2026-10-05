<script setup lang="ts">
// Signature: draw on the pad (mouse, finger, pen) or type a name (the
// keyboard way). The value is a one-file list holding signature.png.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isFile } from '../../files'
import { MESSAGES } from '../../messages'
import { createSignaturePad, type SignaturePad } from '../../signature'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgTip from './FgTip.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, label, description, required, fieldId, tooltip, errorId, describedBy, onBlur, labelClass } =
  useField(props)
const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)

/** props.height: the pad's height in pixels (80–400, default 160). */
const height = computed(() => {
  const h = Number(props.node.props['height'])
  return Number.isFinite(h) && h >= 80 && h <= 400 ? h : 160
})
/** props.typing: offer "Or type your name" (default on). */
const typing = computed(() => props.node.props['typing'] !== false)

const files = computed<File[]>(() => (Array.isArray(value.value) ? value.value.filter(isFile) : []))
const canvas = ref<HTMLCanvasElement | null>(null)
const typed = ref('')
let pad: SignaturePad | null = null

onMounted(() => {
  if (!canvas.value) return
  pad = createSignaturePad(canvas.value, (file) => {
    value.value = file ? [file] : []
    onBlur()
  })
  if (files.value[0]) pad.show(files.value[0])
})
onBeforeUnmount(() => pad?.destroy())
// A reset (or clearing saved answers) empties the value: the pad follows.
watch(files, (list) => {
  if (list.length === 0) {
    pad?.sync(true)
    typed.value = ''
  }
})

function onType(): void {
  pad?.type(typed.value)
}
function clear(): void {
  typed.value = ''
  pad?.wipe()
  value.value = []
  onBlur()
}
</script>

<template>
  <fieldset
    class="fg-field"
    :class="{ 'fg-field--error': error }"
    :aria-labelledby="tooltip ? `${fieldId}-legend` : undefined"
  >
    <legend :class="labelClass">
      <span :id="`${fieldId}-legend`">{{ label }}</span><span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
      <FgTip
        v-if="tooltip"
        :id="`${fieldId}-tip`"
        :text="tooltip"
      />
    </legend>
    <div class="fg-signature">
      <canvas
        :id="fieldId"
        ref="canvas"
        class="fg-signature-pad"
        :style="{ height: `${height}px` }"
        role="img"
        :aria-label="messages.signatureDraw"
        :aria-describedby="describedBy"
        :aria-invalid="error ? 'true' : undefined"
        data-fg-signature
      />
      <div class="fg-signature-row">
        <input
          v-if="typing"
          v-model="typed"
          type="text"
          class="fg-input"
          :placeholder="messages.signatureType"
          :aria-label="messages.signatureType"
          data-fg-sign-type
          @input="onType"
        >
        <button
          type="button"
          class="fg-button fg-button--secondary"
          data-fg-sign-clear
          @click="clear"
        >
          {{ messages.signatureClear }}
        </button>
      </div>
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
