// Behavior test for the tags (chips) field: add on Enter/comma/blur,
// de-duplicate, remove via button and backspace, string[] in the payload.

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import { SCHEMA_ID, type FormSchema } from './schema'

function tagsSchema(): FormSchema {
  const result = parseFormSchema({
    $schema: SCHEMA_ID,
    meta: { name: 'tags_form', locale: 'en', dir: 'ltr' },
    tree: [
      {
        id: 'n1',
        type: 'tags',
        name: 'topics',
        props: { label: 'Topics' },
        validation: [{ rule: 'max', value: 2, message: 'At most 2' }],
      },
    ],
  })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

async function typeAndEnter(wrapper: ReturnType<typeof mount>, text: string): Promise<void> {
  const input = wrapper.find('.fg-tags-input')
  await input.setValue(text)
  await input.trigger('keydown', { key: 'Enter' })
}

describe('tags field', () => {
  it('adds chips on Enter and skips duplicates and blanks', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: tagsSchema() } })
    await typeAndEnter(wrapper, 'vue')
    await typeAndEnter(wrapper, '  vue  ')
    await typeAndEnter(wrapper, '   ')
    expect(wrapper.findAll('.fg-tag')).toHaveLength(1)
    expect((wrapper.find('.fg-tags-input').element as HTMLInputElement).value).toBe('')
  })

  it('removes chips via the remove button and backspace on empty draft', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: tagsSchema() } })
    await typeAndEnter(wrapper, 'a')
    await typeAndEnter(wrapper, 'b')
    expect(wrapper.findAll('.fg-tag')).toHaveLength(2)
    await wrapper.find('.fg-tag-remove').trigger('click')
    expect(wrapper.findAll('.fg-tag').map((t) => t.text().replace(/\s*×$/, ''))).toEqual(['b'])
    await wrapper.find('.fg-tags-input').trigger('keydown', { key: 'Backspace' })
    expect(wrapper.findAll('.fg-tag')).toHaveLength(0)
  })

  it('validates the list and submits a string[] payload', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: tagsSchema() } })
    await typeAndEnter(wrapper, 'a')
    await typeAndEnter(wrapper, 'b')
    await typeAndEnter(wrapper, 'c')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.fg-error').text()).toBe('At most 2')
    await wrapper.find('.fg-tag-remove').trigger('click')
    await wrapper.find('form').trigger('submit')
    const submits = wrapper.emitted('submit')
    expect(submits).toHaveLength(1)
    expect(submits![0]![0]).toEqual({ topics: ['b', 'c'] })
  })
})
