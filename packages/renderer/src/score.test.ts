import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { ratingStars } from './elements'
import type { ElementNode, FormSchema } from './schema'

const schema = (tree: ElementNode[], locale = 'en'): FormSchema => ({
  $schema: 'formsgen/v2',
  meta: { name: 'scores', locale, dir: 'ltr' },
  tree,
})

describe('ratingStars', () => {
  it('reads props.max within 3..10, 5 by default', () => {
    const node = (max?: unknown): ElementNode => ({ id: 'r', type: 'rating', name: 'r', props: max === undefined ? {} : { max } })
    expect(ratingStars(node())).toBe(5)
    expect(ratingStars(node(7))).toBe(7)
    expect(ratingStars(node(1))).toBe(3)
    expect(ratingStars(node(99))).toBe(10)
    expect(ratingStars(node('four'))).toBe(5)
  })
})

describe('star rating and NPS scale', () => {
  it('a star rating is radios 1..stars in reverse order; picking one sets a number', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: schema([{ id: 'r', type: 'rating', name: 'stars', props: { label: 'Stars', max: 4 }, validation: [{ rule: 'required' }] }]) },
    })
    const radios = wrapper.findAll('.fg-rating input[type="radio"]')
    expect(radios.map((r) => r.attributes('value'))).toEqual(['4', '3', '2', '1'])
    expect(wrapper.findAll('.fg-rating-star')).toHaveLength(4)
    await radios[1]!.setValue(true)
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ stars: 3 })
    // required: a form without a choice does not submit
    const empty = mount(FormsGenForm, {
      props: { schema: schema([{ id: 'r', type: 'rating', name: 'stars', props: { label: 'Stars' }, validation: [{ rule: 'required' }] }]) },
    })
    await empty.get('form').trigger('submit')
    await flushPromises()
    expect(empty.emitted('submit')).toBeUndefined()
    expect(empty.get('.fg-error').text()).toBe('This field is required')
  })

  it('an NPS scale is 0..10 with the end words from the form or the locale', async () => {
    const wrapper = mount(FormsGenForm, {
      props: { schema: schema([{ id: 'n', type: 'nps', name: 'recommend', props: { label: 'Recommend?' } }], 'fr') },
    })
    expect(wrapper.findAll('.fg-nps-option').map((l) => l.text())).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(wrapper.get('.fg-nps-ends').text()).toBe('Peu probableTrès probable')
    await wrapper.findAll('.fg-nps input')[9]!.setValue(true)
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ recommend: 9 })
    const own = mount(FormsGenForm, {
      props: { schema: schema([{ id: 'n', type: 'nps', name: 'recommend', props: { label: 'Recommend?', lowLabel: 'Never', highLabel: 'Always' } }]) },
    })
    expect(own.get('.fg-nps-ends').text()).toBe('NeverAlways')
  })
})
