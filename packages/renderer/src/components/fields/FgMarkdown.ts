// Renders a formatted paragraph's tree (see markdown.ts) as elements: no
// HTML strings are ever injected, so text can't become markup.
import { defineComponent, h, type PropType, type VNode } from 'vue'
import type { MdBlock, MdInline } from '../../markdown'

function inline(nodes: MdInline[]): (VNode | string)[] {
  return nodes.map((n) => {
    if (n.t === 'text') return n.v
    if (n.t === 'br') return h('br')
    if (n.t === 'strong') return h('strong', inline(n.c))
    if (n.t === 'em') return h('em', inline(n.c))
    return h('a', { class: 'fg-link', href: n.href }, inline(n.c))
  })
}

export default defineComponent({
  name: 'FgRichText',
  props: { blocks: { type: Array as PropType<MdBlock[]>, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        { class: 'fg-paragraph fg-rich-text' },
        props.blocks.map((b) =>
          b.t === 'p' ? h('p', inline(b.c)) : h(b.t, b.items.map((item) => h('li', inline(item)))),
        ),
      )
  },
})
