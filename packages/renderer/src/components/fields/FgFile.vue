<script setup lang="ts">
// File / image upload: a native file input picks files; the chosen files
// are listed (thumbnails for images) with remove buttons. The input is
// cleared after each pick so the same file can be chosen again.
// The input covers a drop zone (transparent), so a click anywhere opens
// the picker and a dropped file reaches the input as a normal pick.
import { computed, onBeforeUnmount, ref } from 'vue'
import { fileLimits, isFile } from '../../files'
import { MESSAGES, fill } from '../../messages'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgFieldLabel from './FgFieldLabel.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, description, fieldId, errorId, describedBy, onBlur } =
  useField(props)
const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)

const limits = computed(() => fileLimits(props.node))
const files = computed<File[]>(() => (Array.isArray(value.value) ? value.value.filter(isFile) : []))
const isImage = (file: File): boolean => file.type.startsWith('image/')
const showThumbs = computed(() => props.node.type === 'imageupload')

const urls = new Map<File, string>()
function thumb(file: File): string {
  let url = urls.get(file)
  if (!url) {
    url = URL.createObjectURL(file)
    urls.set(file, url)
  }
  return url
}
function release(file: File): void {
  const url = urls.get(file)
  if (url) URL.revokeObjectURL(url)
  urls.delete(file)
}
onBeforeUnmount(() => {
  for (const file of [...urls.keys()]) release(file)
})

const dragging = ref(false)

function onPick(event: Event): void {
  dragging.value = false
  const input = event.target as HTMLInputElement
  const picked = [...(input.files ?? [])]
  input.value = ''
  if (picked.length === 0) return
  value.value = limits.value.multiple ? [...files.value, ...picked] : picked.slice(0, 1)
  onBlur()
}
function remove(index: number): void {
  const file = files.value[index]
  if (file) release(file)
  value.value = files.value.filter((_, i) => i !== index)
  onBlur()
}
function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <div
    class="fg-field"
    :class="{ 'fg-field--error': error }"
  >
    <FgFieldLabel
      :node="node"
      :for-id="fieldId"
    />
    <div
      class="fg-file-drop"
      :data-fg-dragging="dragging ? '' : undefined"
    >
      <span class="fg-file-drop-text">{{ limits.multiple ? messages.dropFiles : messages.dropFile }}</span>
      <input
        :id="fieldId"
        class="fg-file-input"
        type="file"
        :accept="limits.accept || undefined"
        :multiple="limits.multiple"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @change="onPick"
        @dragenter="dragging = true"
        @dragleave="dragging = false"
        @drop="dragging = false"
      >
    </div>
    <ul
      v-if="files.length"
      class="fg-file-list"
    >
      <li
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="fg-file-item"
      >
        <img
          v-if="showThumbs && isImage(file)"
          class="fg-file-thumb"
          :src="thumb(file)"
          alt=""
        >
        <span class="fg-file-name">{{ file.name }}</span>
        <span class="fg-file-size">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          class="fg-file-remove"
          :aria-label="fill(messages.removeFile, { name: file.name })"
          @click="remove(index)"
        >
          ×
        </button>
      </li>
    </ul>
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
