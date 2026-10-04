<script lang="ts">
// Renders TRUSTED inline SVG markup from the element registry. Never pass
// user-provided strings here — registry icons are the only source.
import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'SvgIcon',
  props: {
    svg: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h('span', {
        class: 'svg-icon',
        'aria-hidden': 'true',
        innerHTML: props.svg,
      })
  },
})
</script>
