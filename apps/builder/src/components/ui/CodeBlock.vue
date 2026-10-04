<script setup lang="ts">
import hljs from 'highlight.js/lib/core'
import cssLang from 'highlight.js/lib/languages/css'
import jsLang from 'highlight.js/lib/languages/javascript'
import jsonLang from 'highlight.js/lib/languages/json'
import mdLang from 'highlight.js/lib/languages/markdown'
import tsLang from 'highlight.js/lib/languages/typescript'
import xmlLang from 'highlight.js/lib/languages/xml'
import { computed } from 'vue'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('json', jsonLang)
hljs.registerLanguage('xml', xmlLang)
hljs.registerLanguage('javascript', jsLang)
hljs.registerLanguage('typescript', tsLang)
hljs.registerLanguage('markdown', mdLang)
hljs.registerLanguage('css', cssLang)

const props = defineProps<{
  code: string
  language: string
}>()

const highlighted = computed(() => {
  try {
    return hljs.highlight(props.code, { language: props.language }).value
  } catch {
    return hljs.highlightAuto(props.code).value
  }
})
</script>

<template>
  <pre
    class="h-full overflow-auto rounded-lg bg-[#0d1117] p-4 text-xs leading-relaxed"
  ><!-- eslint-disable vue/no-v-html -- trusted: hljs output of generated code --><code
    class="hljs"
    v-html="highlighted"
  /><!-- eslint-enable vue/no-v-html --></pre>
</template>
