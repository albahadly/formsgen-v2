import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.vue'

describe('App shell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

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
