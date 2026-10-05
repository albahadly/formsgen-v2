import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { answerText } from './pipe'
import { MESSAGES } from './messages'
import { OSM_TILES, attributionHtml, locationSettings, locationText, locationValue, parseLatLng, type Leaflet } from './location'
import type { ElementNode, FormSchema } from './schema'

const node = (props: Record<string, unknown> = {}): ElementNode => ({ id: 'l', type: 'location', name: 'place', props })

describe('location values', () => {
  it('are points in range, rounded to 6 decimals', () => {
    expect(locationValue({ lat: 23.58812345678, lng: 58.38291 })).toEqual({ lat: 23.588123, lng: 58.38291 })
    expect(locationValue({ lat: 91, lng: 0 })).toBeNull()
    expect(locationValue({ lat: 0, lng: -181 })).toBeNull()
    expect(locationValue({ lat: '1', lng: 2 })).toBeNull()
    expect(locationValue(null)).toBeNull()
    expect(parseLatLng(' 23.5 ', '58')).toEqual({ lat: 23.5, lng: 58 })
    expect(parseLatLng('23.5', '')).toBeNull()
    expect(parseLatLng('north', '58')).toBeNull()
  })

  it('show as "lat, lng" in answers inside text', () => {
    expect(locationText({ lat: 23.588, lng: 58.3829 })).toBe('23.588, 58.3829')
    expect(answerText(node(), { lat: 1.5, lng: -2 }, MESSAGES.en, ', ')).toBe('1.5, -2')
    expect(answerText(node(), null, MESSAGES.en, ', ')).toBe('')
  })

  it('settings: start point, zoom, tiles (https with {z}/{x}/{y}), height', () => {
    expect(locationSettings(node())).toEqual({
      lat: 20, lng: 0, zoom: 2, tiles: OSM_TILES, attribution: '© OpenStreetMap contributors', myLocation: true, height: 260,
    })
    const custom = locationSettings(node({ lat: 23.6, lng: 58.4, zoom: 11, tiles: 'https://tiles.example/{z}/{x}/{y}.png', attribution: 'Ex <Maps>', myLocation: false, height: 900 }))
    expect(custom).toMatchObject({ lat: 23.6, lng: 58.4, zoom: 11, tiles: 'https://tiles.example/{z}/{x}/{y}.png', attribution: 'Ex <Maps>', myLocation: false, height: 260 })
    expect(locationSettings(node({ tiles: 'http://tiles.example/{z}/{x}/{y}.png' })).tiles).toBe(OSM_TILES)
    expect(locationSettings(node({ tiles: 'https://tiles.example/{z}.png' })).tiles).toBe(OSM_TILES)
    expect(attributionHtml('Ex <Maps>')).toBe('Ex &lt;Maps&gt;')
    expect(attributionHtml('© OpenStreetMap contributors')).toContain('href="https://www.openstreetmap.org/copyright"')
  })
})

// A stand-in for Leaflet that records what the field asks of it.
function fakeLeaflet() {
  const calls: string[] = []
  let click: ((event: { latlng: { lat: number; lng: number; wrap(): { lng: number } } }) => void) | null = null
  const at = (lat: number, lng: number) => ({ lat, lng, wrap: () => at(lat, ((((lng + 180) % 360) + 360) % 360) - 180) })
  const L = {
    map: (_el: HTMLElement, options: Record<string, unknown>) => {
      calls.push(`map(${JSON.stringify(options['center'])},${options['zoom']})`)
      return {
        on: (_e: string, handler: typeof click) => (click = handler),
        setView: (p: number[], z: number) => calls.push(`setView(${p},${z})`),
        panTo: (p: number[]) => calls.push(`panTo(${p})`),
        getZoom: () => 2,
        invalidateSize: () => calls.push('invalidateSize'),
        remove: () => calls.push('remove'),
      }
    },
    tileLayer: (url: string) => ({ addTo: () => calls.push(`tiles(${url})`) }),
    divIcon: () => ({}),
    marker: (p: number[]) => {
      calls.push(`marker(${p})`)
      const m = {
        addTo: () => m,
        setLatLng: (q: number[]) => (calls.push(`move(${q})`), m),
        getLatLng: () => at(0, 0),
        remove: () => calls.push('unpin'),
        on: () => {},
      }
      return m
    },
  }
  return { L: L as unknown as Leaflet, calls, click: (lat: number, lng: number) => click!({ latlng: at(lat, lng) }) }
}

const schema: FormSchema = {
  $schema: 'formsgen/v2',
  meta: { name: 'loc', locale: 'en', dir: 'ltr' },
  tree: [
    { id: 'l', type: 'location', name: 'place', props: { label: 'Where?', lat: 23.6, lng: 58.4, zoom: 9 }, validation: [{ rule: 'required' }] },
    { id: 'p', type: 'paragraph', props: { text: 'At: {place|nowhere}' } },
  ],
}

describe('location field', () => {
  afterEach(() => {
    delete (window as { L?: unknown }).L
    vi.unstubAllGlobals()
  })

  it('a map click, typed coordinates and Clear set the value; it can be required', async () => {
    const fake = fakeLeaflet()
    ;(window as { L?: unknown }).L = fake.L
    const wrapper = mount(FormsGenForm, { props: { schema } })
    await flushPromises()
    expect(fake.calls).toContain('map([23.6,58.4],9)')
    expect(fake.calls).toContain(`tiles(${OSM_TILES})`)
    expect(wrapper.get('[data-fg-loc-map]').attributes('aria-label')).toBe(MESSAGES.en.locationMap)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('This field is required')

    fake.click(23.5881234567, 418.3829)
    await flushPromises()
    expect(fake.calls).toContain('marker(23.588123,58.3829)')
    expect((wrapper.get('#fg-l').element as HTMLInputElement).value).toBe('23.588123')
    expect((wrapper.get('#fg-l-lng').element as HTMLInputElement).value).toBe('58.3829')
    expect(wrapper.text()).toContain('At: 23.588123, 58.3829')

    await wrapper.get('#fg-l').setValue('10')
    await wrapper.get('#fg-l-lng').setValue('-20.5')
    expect(fake.calls).toContain('panTo(10,-20.5)')
    await wrapper.get('form').trigger('submit')
    const [data] = wrapper.emitted('submit')!.at(-1) as [Record<string, unknown>]
    expect(data['place']).toEqual({ lat: 10, lng: -20.5 })

    await wrapper.get('[data-fg-loc-clear]').trigger('click')
    expect(fake.calls).toContain('unpin')
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toMatchObject({ place: null })
    expect(wrapper.text()).toContain('At: nowhere')
  })

  it('"Use my location" asks the device; a refusal says how else to answer', async () => {
    ;(window as { L?: unknown }).L = fakeLeaflet().L
    let answer: 'yes' | 'no' = 'yes'
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) =>
          answer === 'yes'
            ? ok({ coords: { latitude: 51.5007, longitude: -0.1246 } } as GeolocationPosition)
            : fail({ code: 1 } as GeolocationPositionError),
      },
    })
    const wrapper = mount(FormsGenForm, { props: { schema } })
    await flushPromises()
    await wrapper.get('[data-fg-loc-mine]').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toMatchObject({ place: { lat: 51.5007, lng: -0.1246 } })
    answer = 'no'
    await wrapper.get('[data-fg-loc-mine]').trigger('click')
    expect(wrapper.get('[data-fg-loc-status]').text()).toBe(MESSAGES.en.locationDenied)
  })

  it('a starting value shows in the boxes and a reset clears them; no "Use my location" when turned off', async () => {
    ;(window as { L?: unknown }).L = fakeLeaflet().L
    const off: FormSchema = {
      ...schema,
      tree: [
        { ...schema.tree[0]!, props: { label: 'Where?', myLocation: false } },
        { id: 'b', type: 'button', props: { text: 'Start over', action: 'reset' } },
      ],
    }
    const wrapper = mount(FormsGenForm, { props: { schema: off } })
    await flushPromises()
    expect(wrapper.find('[data-fg-loc-mine]').exists()).toBe(false)
    await wrapper.get('#fg-l').setValue('1')
    await wrapper.get('#fg-l-lng').setValue('2')
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toMatchObject({ place: { lat: 1, lng: 2 } })
    await wrapper.get('button[type=button]:not([data-fg-loc-clear])').trigger('click')
    await flushPromises()
    expect((wrapper.get('#fg-l').element as HTMLInputElement).value).toBe('')
    const started = mount(FormsGenForm, { props: { schema: off, modelValue: { place: { lat: 1, lng: 2 } } } })
    await flushPromises()
    expect((started.get('#fg-l-lng').element as HTMLInputElement).value).toBe('2')
  })
})
