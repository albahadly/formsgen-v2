// Accessibility smoke test: axe-core over the fully rendered kitchen-sink
// form. Runs in jsdom, so rules that need a layout engine (color-contrast)
// are disabled — structural checks (labels, roles, aria wiring, duplicate
// ids) all run. Part of `pnpm test`, so CI gates on it.

import { mount } from '@vue/test-utils'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../fixtures/kitchen-sink.formsgen.json'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import type { FormSchema } from './schema'

// parseFormSchema returns the object it was given — clone so this test
// can't poison the shared fixture module (see phase-10b handoff).
function loadFixture(): FormSchema {
  const result = parseFormSchema(JSON.parse(JSON.stringify(kitchenSink)))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const AXE_OPTIONS = {
  rules: {
    // Needs real computed colors; jsdom has no layout/paint.
    'color-contrast': { enabled: false },
  },
} satisfies axe.RunOptions

describe('a11y smoke (axe-core)', () => {
  it('renders the kitchen-sink form without axe violations', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: loadFixture() },
      attachTo: document.body,
    })
    const results = await axe.run(wrapper.element as HTMLElement, AXE_OPTIONS)
    const summary = results.violations.map(
      (v) =>
        `${v.id} (${v.impact ?? 'n/a'}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    )
    expect(summary).toEqual([])
    wrapper.unmount()
  }, 30000)

  it('renders the submitted (error) state without axe violations', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: loadFixture() },
      attachTo: document.body,
    })
    await wrapper.find('form').trigger('submit')
    const results = await axe.run(wrapper.element as HTMLElement, AXE_OPTIONS)
    const summary = results.violations.map(
      (v) =>
        `${v.id} (${v.impact ?? 'n/a'}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    )
    expect(summary).toEqual([])
    wrapper.unmount()
  }, 30000)
})
