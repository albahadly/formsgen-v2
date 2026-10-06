<script setup lang="ts">
// Location: a point picked on the map (click or tap; the pin can be
// dragged), from the device ("Use my location") or typed as latitude and
// longitude (the keyboard way). The value is { lat, lng } or null.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MESSAGES } from '../../messages'
import {
  createLocationMap,
  loadLeaflet,
  locationSettings,
  locationValue,
  parseLatLng,
  type LatLng,
  type LocationMap,
} from '../../location'
import type { ElementNode } from '../../schema'
import { useField } from '../useField'
import FgTip from './FgTip.vue'

const props = defineProps<{ node: ElementNode; path: string }>()
const { ctx, value, error, label, description, required, fieldId, tooltip, errorId, describedBy, onBlur, labelClass } =
  useField(props)
const messages = computed(() => ctx.messages?.() ?? MESSAGES.en)
const settings = computed(() => locationSettings(props.node))

const point = computed(() => locationValue(value.value))
const lat = ref(point.value ? String(point.value.lat) : '')
const lng = ref(point.value ? String(point.value.lng) : '')
const status = ref('')
const mapEl = ref<HTMLElement | null>(null)
let map: LocationMap | null = null
let resizer: ResizeObserver | null = null
let gone = false

const same = (a: LatLng | null, b: LatLng | null): boolean => (a === null ? b === null : b !== null && a.lat === b.lat && a.lng === b.lng)

function startMap(): void {
  loadLeaflet()
    .then((L) => {
      if (gone || !mapEl.value || map) return
      map = createLocationMap(L, mapEl.value, settings.value, (picked) => set(picked, 'none'))
      map.show(point.value, 'zoom')
      if (typeof ResizeObserver !== 'undefined') {
        resizer = new ResizeObserver(() => map?.resize())
        resizer.observe(mapEl.value)
      }
    })
    .catch(() => {
      if (!gone) status.value = messages.value.locationNoMap
    })
}
function stopMap(): void {
  resizer?.disconnect()
  resizer = null
  map?.destroy()
  map = null
}
onMounted(startMap)
onBeforeUnmount(() => {
  gone = true
  stopMap()
})
// New map settings (the builder's property panel): a new map.
watch(
  () => JSON.stringify(settings.value),
  () => {
    stopMap()
    startMap()
  },
)

// A value set elsewhere (a reset, saved answers) shows in the boxes and on the map.
watch(point, (next) => {
  if (same(next, parseLatLng(lat.value, lng.value))) return
  lat.value = next ? String(next.lat) : ''
  lng.value = next ? String(next.lng) : ''
  map?.show(next, 'zoom')
})

function set(next: LatLng | null, move: 'none' | 'pan' | 'zoom'): void {
  lat.value = next ? String(next.lat) : ''
  lng.value = next ? String(next.lng) : ''
  status.value = ''
  value.value = next
  map?.show(next, move)
  onBlur()
}

// Text kept as typed (v-model would turn number boxes into numbers).
function onTyped(event: Event, which: 'lat' | 'lng'): void {
  ;(which === 'lat' ? lat : lng).value = (event.target as HTMLInputElement).value
  const next = parseLatLng(lat.value, lng.value)
  value.value = next
  map?.show(next, next ? 'pan' : 'none')
}

function mine(): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    status.value = messages.value.locationDenied
    return
  }
  status.value = messages.value.locationFinding
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (!gone) set(locationValue({ lat: position.coords.latitude, lng: position.coords.longitude }), 'zoom')
    },
    () => {
      if (!gone) status.value = messages.value.locationDenied
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}
</script>

<template>
  <fieldset
    class="fg-field"
    :class="{ 'fg-field--error': error }"
    :aria-labelledby="tooltip ? `${fieldId}-legend` : undefined"
  >
    <legend :class="labelClass">
      <span :id="`${fieldId}-legend`">{{ label }}</span><span
        v-if="required"
        class="fg-required"
        aria-hidden="true"
      >*</span>
      <FgTip
        v-if="tooltip"
        :id="`${fieldId}-tip`"
        :text="tooltip"
      />
    </legend>
    <div
      class="fg-location"
      data-fg-loc
    >
      <div
        ref="mapEl"
        class="fg-location-map"
        :style="{ height: `${settings.height}px` }"
        role="group"
        :aria-label="`${label}: ${messages.locationMap}`"
        data-fg-loc-map
      />
      <div class="fg-location-row">
        <label class="fg-location-coord">
          <span>{{ messages.locationLat }}</span>
          <input
            :id="fieldId"
            :value="lat"
            type="number"
            class="fg-input"
            step="any"
            min="-90"
            max="90"
            inputmode="decimal"
            :aria-required="required ? 'true' : undefined"
            :aria-describedby="describedBy"
            :aria-invalid="error ? 'true' : undefined"
            data-fg-loc-lat
            @input="onTyped($event, 'lat')"
            @blur="onBlur"
          >
        </label>
        <label class="fg-location-coord">
          <span>{{ messages.locationLng }}</span>
          <input
            :id="`${fieldId}-lng`"
            :value="lng"
            type="number"
            class="fg-input"
            step="any"
            min="-180"
            max="180"
            inputmode="decimal"
            :aria-describedby="describedBy"
            :aria-invalid="error ? 'true' : undefined"
            data-fg-loc-lng
            @input="onTyped($event, 'lng')"
            @blur="onBlur"
          >
        </label>
        <button
          v-if="settings.myLocation"
          type="button"
          class="fg-button fg-button--secondary"
          data-fg-loc-mine
          @click="mine"
        >
          {{ messages.locationMine }}
        </button>
        <button
          type="button"
          class="fg-button fg-button--secondary"
          data-fg-loc-clear
          @click="set(null, 'none')"
        >
          {{ messages.locationClear }}
        </button>
      </div>
      <p
        class="fg-location-status"
        aria-live="polite"
        data-fg-loc-status
      >
        {{ status }}
      </p>
    </div>
    <p
      v-if="description"
      class="fg-description"
    >
      {{ description }}
    </p>
    <p
      v-if="error"
      :id="errorId"
      class="fg-error"
      role="alert"
    >
      {{ error }}
    </p>
  </fieldset>
</template>
