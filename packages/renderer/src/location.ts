// Location (element type "location"): a point picked on a map (click or
// tap; the pin can be dragged), from the device ("Use my location"), or
// typed as latitude/longitude (the keyboard way). The value is
// { lat, lng } rounded to 6 decimals (about 10 cm), or null.
//
// The map is Leaflet with OpenStreetMap tiles by default, loaded from a CDN
// with integrity hashes when a location field is shown. props.tiles takes
// another https tile server ({z}/{x}/{y}); busy forms should use one,
// since OpenStreetMap's own servers are meant for light use.

import type { ElementNode } from './schema'

export const LEAFLET_VERSION = '1.9.4'
export const LEAFLET_JS = {
  src: `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.js`,
  integrity: 'sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg==',
}
export const LEAFLET_CSS = {
  href: `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.css`,
  integrity: 'sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w==',
}
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
/** The default attribution as the map shows it (OpenStreetMap asks for the link). */
export const OSM_ATTRIBUTION_HTML = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
/** The pin: a plain SVG, so no marker images are needed. */
export const LOCATION_PIN =
  '<svg viewBox="0 0 24 36" width="24" height="36" aria-hidden="true"><path d="M12 1C6 1 1 6 1 12c0 8.3 11 23 11 23s11-14.7 11-23C23 6 18 1 12 1z" fill="#2563eb" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>'
/** The zoom a point is shown at when the map is further out. */
export const LOCATION_CLOSE_ZOOM = 13

export interface LatLng {
  lat: number
  lng: number
}

export const roundCoord = (n: number): number => Math.round(n * 1e6) / 1e6

/** A valid point, rounded; null for anything else. */
export function locationValue(value: unknown): LatLng | null {
  if (!value || typeof value !== 'object') return null
  const { lat, lng } = value as { lat?: unknown; lng?: unknown }
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat: roundCoord(lat), lng: roundCoord(lng) }
}

/** A point from typed text ('' and '' clear; anything invalid is null too). */
export function parseLatLng(lat: string, lng: string): LatLng | null {
  if (lat.trim() === '' || lng.trim() === '') return null
  return locationValue({ lat: Number(lat), lng: Number(lng) })
}

export interface LocationSettings {
  /** Where the map starts (when there is no value yet). */
  lat: number
  lng: number
  zoom: number
  tiles: string
  attribution: string
  myLocation: boolean
  height: number
}

const num = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return typeof v !== 'boolean' && v !== '' && v !== null && v !== undefined && Number.isFinite(n) && n >= min && n <= max ? n : fallback
}

/** A tile URL the map may use: https with {z}, {x} and {y}. */
export const isTileUrl = (url: unknown): url is string =>
  typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/.test(url) && ['{z}', '{x}', '{y}'].every((p) => url.includes(p))

export function locationSettings(node: ElementNode): LocationSettings {
  const p = node.props
  const custom = isTileUrl(p['tiles'])
  const attribution = typeof p['attribution'] === 'string' && p['attribution'].trim() !== '' ? p['attribution'].trim() : ''
  return {
    lat: num(p['lat'], -90, 90, 20),
    lng: num(p['lng'], -180, 180, 0),
    zoom: Math.round(num(p['zoom'], 1, 18, 2)),
    tiles: custom ? (p['tiles'] as string) : OSM_TILES,
    attribution: attribution || (custom ? '' : OSM_ATTRIBUTION),
    myLocation: p['myLocation'] !== false,
    height: Math.round(num(p['height'], 160, 600, 260)),
  }
}

/** Text for answers inside text: "23.588, 58.3829". */
export const locationText = (value: unknown): string => {
  const point = locationValue(value)
  return point ? `${point.lat}, ${point.lng}` : ''
}

/** The attribution as map HTML: the default with its link, an author's own as text. */
export const attributionHtml = (text: string): string =>
  text === OSM_ATTRIBUTION ? OSM_ATTRIBUTION_HTML : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The small part of Leaflet used here.
interface LeafletPoint {
  lat: number
  lng: number
  wrap(): LeafletPoint
}
interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer
}
interface LeafletMarker extends LeafletLayer {
  setLatLng(point: [number, number]): LeafletMarker
  getLatLng(): LeafletPoint
  remove(): void
  on(event: 'dragend', handler: () => void): void
}
interface LeafletMap {
  on(event: 'click', handler: (event: { latlng: LeafletPoint }) => void): void
  setView(point: [number, number], zoom: number): void
  panTo(point: [number, number]): void
  getZoom(): number
  invalidateSize(): void
  remove(): void
}
export interface Leaflet {
  map(el: HTMLElement, options: Record<string, unknown>): LeafletMap
  tileLayer(url: string, options: Record<string, unknown>): LeafletLayer
  divIcon(options: Record<string, unknown>): unknown
  marker(point: [number, number], options: Record<string, unknown>): LeafletMarker
}

export interface LocationMap {
  /**
   * Shows the point; 'pan' keeps the zoom, 'zoom' comes closer. With null the
   * pin goes ('zoom' also returns to the starting view, as after a reset).
   */
  show(point: LatLng | null, move: 'none' | 'pan' | 'zoom'): void
  /** After the map's box changed size (shown, resized). */
  resize(): void
  destroy(): void
}

/** The map in el; clicks, taps and pin drags report the new point. */
export function createLocationMap(
  L: Leaflet,
  el: HTMLElement,
  settings: LocationSettings,
  onPick: (point: LatLng) => void,
): LocationMap {
  const map = L.map(el, { center: [settings.lat, settings.lng], zoom: settings.zoom, scrollWheelZoom: false })
  L.tileLayer(settings.tiles, { attribution: attributionHtml(settings.attribution), maxZoom: 19 }).addTo(map)
  const icon = L.divIcon({ className: 'fg-location-pin', html: LOCATION_PIN, iconSize: [24, 36], iconAnchor: [12, 35] })
  let marker: LeafletMarker | null = null
  const pick = (at: LeafletPoint): void => {
    const point = locationValue({ lat: at.lat, lng: at.wrap().lng })
    if (!point) return
    place(point)
    onPick(point)
  }
  function place(point: LatLng): void {
    if (marker) {
      marker.setLatLng([point.lat, point.lng])
      return
    }
    // Not a tab stop: the latitude and longitude boxes are the keyboard way.
    marker = L.marker([point.lat, point.lng], { icon, draggable: true, keyboard: false })
    marker.addTo(map)
    marker.on('dragend', () => marker && pick(marker.getLatLng()))
  }
  map.on('click', (event) => pick(event.latlng))
  return {
    show(point, move) {
      if (!point) {
        marker?.remove()
        marker = null
        if (move === 'zoom') map.setView([settings.lat, settings.lng], settings.zoom)
        return
      }
      place(point)
      if (move === 'zoom') map.setView([point.lat, point.lng], Math.max(map.getZoom(), LOCATION_CLOSE_ZOOM))
      else if (move === 'pan') map.panTo([point.lat, point.lng])
    },
    resize: () => map.invalidateSize(),
    destroy: () => map.remove(),
  }
}

type LeafletWindow = typeof globalThis & { L?: Leaflet }
let loading: Promise<Leaflet> | null = null

/** Loads Leaflet (script and stylesheet) once; resolves with window.L. */
export function loadLeaflet(): Promise<Leaflet> {
  const w = window as LeafletWindow
  if (w.L) return Promise.resolve(w.L)
  if (loading) return loading
  loading = new Promise<Leaflet>((resolve, reject) => {
    if (!document.querySelector('link[data-fg-leaflet]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = LEAFLET_CSS.href
      css.integrity = LEAFLET_CSS.integrity
      css.crossOrigin = ''
      css.setAttribute('data-fg-leaflet', '')
      document.head.appendChild(css)
    }
    const script = document.createElement('script')
    script.src = LEAFLET_JS.src
    script.integrity = LEAFLET_JS.integrity
    script.crossOrigin = ''
    script.onload = () => {
      const L = (window as LeafletWindow).L
      if (L) resolve(L)
      else script.onerror?.(new Event('error'))
    }
    script.onerror = () => {
      loading = null
      reject(new Error('Leaflet did not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}
