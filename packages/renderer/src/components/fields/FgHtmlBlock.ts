// Renders an HTML block's sanitized tree (see safeHtml.ts) as elements:
// the author's HTML is never injected as a string.
import { defineComponent, h, type PropType, type VNode } from 'vue'
import type { HtmlNode } from '../../safeHtml'

function render(nodes: HtmlNode[]): (VNode | string)[] {
  return nodes.map((n) => (n.t === 'text' ? n.v : h(n.tag, Object.fromEntries(n.attrs), render(n.c))))
}

export default defineComponent({
  name: 'FgHtmlBlock',
  props: { nodes: { type: Array as PropType<HtmlNode[]>, required: true } },
  setup(props) {
    return () => h('div', { class: 'fg-html' }, render(props.nodes))
  },
})
