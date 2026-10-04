import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from './App.vue'

describe('App shell', () => {
  it('mounts and shows the three builder panels', () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })
    expect(wrapper.find('[data-testid="panel-palette"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel-canvas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel-properties"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('FormsGen Builder')
  })
})
