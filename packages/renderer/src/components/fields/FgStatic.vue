<script setup lang="ts">
import { computed, inject } from 'vue'
import { FORM_CONTEXT } from '../../context'
import { isSafeUrl } from '../../elements'
import { isMarkdownParagraph, parseMarkdown } from '../../markdown'
import { parseSafeHtml } from '../../safeHtml'
import { MESSAGES } from '../../messages'
import type { ElementNode } from '../../schema'
import FgHtmlBlock from './FgHtmlBlock'
import FgRichText from './FgRichText'

const props = defineProps<{ node: ElementNode }>()
const ctx = inject(FORM_CONTEXT, null)
const messages = computed(() => ctx?.messages?.() ?? MESSAGES.en)

const prop = (key: string): string => {
  const value = props.node.props[key]
  return typeof value === 'string' ? value : ''
}
const text = computed(() => prop('text'))
/** Simple formatting (props.format = 'markdown'): bold, italics, links, lists. */
const blocks = computed(() => (isMarkdownParagraph(props.node) ? parseMarkdown(text.value) : null))
/** HTML block: the author's HTML, reduced to allowed tags and attributes. */
const htmlNodes = computed(() => (props.node.type === 'html' ? parseSafeHtml(prop('html')) : null))
/** style.tone: text color (line color for a divider). */
const toneClass = computed(() => (props.node.style?.tone ? `fg-tone-${props.node.style.tone}` : undefined))
const level = computed(() => {
  const l = Number(props.node.props['level'] ?? 2)
  return l >= 1 && l <= 4 ? l : 2
})
// Unsafe URLs (javascript:, data:, …) are never rendered.
const href = computed(() => (isSafeUrl(prop('href')) ? prop('href').trim() : undefined))
const src = computed(() => (isSafeUrl(prop('src')) ? prop('src').trim() : undefined))
const newTab = computed(() => props.node.props['newTab'] === true)
const imageWidth = computed(() => {
  const w = Number(props.node.props['width'])
  return Number.isFinite(w) && w > 0 ? w : undefined
})
const cite = computed(() => prop('cite'))
</script>

<template>
  <hr
    v-if="node.type === 'divider'"
    class="fg-divider"
    :class="toneClass"
  >
  <FgHtmlBlock
    v-else-if="htmlNodes"
    :nodes="htmlNodes"
  />
  <FgRichText
    v-else-if="blocks"
    :class="toneClass"
    :blocks="blocks"
  />
  <p
    v-else-if="node.type === 'paragraph'"
    class="fg-paragraph"
    :class="toneClass"
  >
    {{ text }}
  </p>
  <img
    v-else-if="node.type === 'image'"
    class="fg-image"
    :src="src"
    :alt="prop('alt')"
    :width="imageWidth"
    loading="lazy"
  >
  <a
    v-else-if="node.type === 'link'"
    class="fg-link"
    :class="toneClass"
    :href="href"
    :target="newTab ? '_blank' : undefined"
    :rel="newTab ? 'noopener noreferrer' : undefined"
  >{{ text }}<span
    v-if="newTab"
    class="fg-sr-only"
  >{{ ` ${messages.opensInNewTab}` }}</span></a>
  <figure
    v-else-if="node.type === 'quote'"
    class="fg-quote"
  >
    <blockquote class="fg-quote-text">
      <p>{{ text }}</p>
    </blockquote>
    <figcaption
      v-if="cite"
      class="fg-quote-cite"
    >
      {{ cite }}
    </figcaption>
  </figure>
  <component
    :is="`h${level}`"
    v-else
    class="fg-heading"
    :class="[`fg-heading--${level}`, toneClass]"
  >
    {{ text }}
  </component>
</template>
