// Location fields in the code targets, as the renderer's FgLocation: a
// Leaflet map (loaded once from cdnjs with integrity hashes), latitude and
// longitude boxes (the keyboard way), "Use my location" and Clear. The
// script is wired once on the form root and finds fields by data
// attributes, so fields in items added later just work:
//   [data-fg-loc]              the wrapper; its value is the field path (or
//                              the Blazor field key); data-fg-loc-start
//                              "lat,lng,zoom", -tiles, -attribution
//   [data-fg-loc-map]          the map
//   [data-fg-loc-lat] / -lng   the coordinate boxes
//   [data-fg-loc-mine] / -clear the buttons
//   [data-fg-loc-status]       messages (finding, not available, no map)
// fgWireLocations(root, onChange) reports (wrapper, { lat, lng } | null,
// touch); fgLocSync(root, valueOf) shows values set elsewhere (a reset,
// saved answers) in the boxes and on the map.

import {
  LEAFLET_CSS,
  LEAFLET_JS,
  LOCATION_CLOSE_ZOOM,
  LOCATION_PIN,
  OSM_ATTRIBUTION,
  attributionHtml,
  locationSettings,
  type ElementNode,
  type MessageCatalog,
} from '@formsgen/renderer'

export const hasLocation = (nodes: ElementNode[]): boolean =>
  nodes.some((node) => node.type === 'location' || hasLocation(node.children ?? []))

/** The location runtime (ES5; `ts` adds the annotations strict TypeScript needs). */
export function locationRuntime(messages: MessageCatalog, ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  const any = ts ? ': any' : ''
  return `// Location fields: a map (Leaflet, OpenStreetMap tiles by default), the
// coordinate boxes, "Use my location" and Clear; the value is { lat, lng } or null.
var fgLeafletWaiting${any} = null
function fgLoadLeaflet(done${t(': (L: any) => void')}, fail${t(': () => void')}) {
  var w${any} = window
  if (w.L) { done(w.L); return }
  if (!fgLeafletWaiting) {
    fgLeafletWaiting = []
    if (!document.querySelector('link[data-fg-leaflet]')) {
      var css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = ${JSON.stringify(LEAFLET_CSS.href)}
      css.integrity = ${JSON.stringify(LEAFLET_CSS.integrity)}
      css.crossOrigin = ''
      css.setAttribute('data-fg-leaflet', '')
      document.head.appendChild(css)
    }
    var script = document.createElement('script')
    script.src = ${JSON.stringify(LEAFLET_JS.src)}
    script.integrity = ${JSON.stringify(LEAFLET_JS.integrity)}
    script.crossOrigin = ''
    var settle = function (ok${t(': boolean')}) {
      var waiting = fgLeafletWaiting
      fgLeafletWaiting = null
      waiting.forEach(function (pair${any}) { if (ok && w.L) pair[0](w.L); else pair[1]() })
    }
    script.onload = function () { settle(true) }
    script.onerror = function () { settle(false) }
    document.head.appendChild(script)
  }
  fgLeafletWaiting.push([done, fail])
}
// A valid point, rounded to 6 decimals (about 10 cm); null for anything else.
function fgLocValue(value${any})${t(': { lat: number; lng: number } | null')} {
  if (!value || typeof value !== 'object') return null
  var lat = value.lat
  var lng = value.lng
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
}
function fgLocParse(lat${t(': string')}, lng${t(': string')}) {
  if (lat.trim() === '' || lng.trim() === '') return null
  return fgLocValue({ lat: Number(lat), lng: Number(lng) })
}
function fgLocSame(a${any}, b${any})${t(': boolean')} {
  return a === null ? b === null : b !== null && a.lat === b.lat && a.lng === b.lng
}
function fgLocParts(group${any})${any} {
  return {
    map: group.querySelector('[data-fg-loc-map]'),
    lat: group.querySelector('[data-fg-loc-lat]'),
    lng: group.querySelector('[data-fg-loc-lng]'),
    status: group.querySelector('[data-fg-loc-status]'),
  }
}
function fgLocTyped(group${any}) {
  var parts = fgLocParts(group)
  return fgLocParse(parts.lat.value, parts.lng.value)
}
// The pin (and the view): 'pan' keeps the zoom, 'zoom' comes closer (with
// no point: back to the starting view, as after a reset).
function fgLocPin(group${any}, point${any}, move${t(': string')}) {
  var state = group.fgLocMap
  if (!state || !state.map) return
  if (!point) {
    if (state.marker) state.marker.remove()
    state.marker = null
    if (move === 'zoom') state.map.setView([state.start[0], state.start[1]], state.start[2])
    return
  }
  var at = [point.lat, point.lng]
  if (state.marker) state.marker.setLatLng(at)
  else {
    // Not a tab stop: the coordinate boxes are the keyboard way.
    state.marker = state.L.marker(at, { icon: state.icon, draggable: true, keyboard: false }).addTo(state.map)
    state.marker.on('dragend', function () { state.pick(state.marker.getLatLng()) })
  }
  if (move === 'zoom') state.map.setView(at, Math.max(state.map.getZoom(), ${LOCATION_CLOSE_ZOOM}))
  else if (move === 'pan') state.map.panTo(at)
}
// The boxes and the pin show the point; the status line clears.
function fgLocShow(group${any}, point${any}, move${t(': string')}) {
  var parts = fgLocParts(group)
  parts.lat.value = point ? String(point.lat) : ''
  parts.lng.value = point ? String(point.lng) : ''
  if (parts.status) parts.status.textContent = ''
  fgLocPin(group, point, move)
}
function fgLocAttribution(text${t(': string')})${t(': string')} {
  return text === ${JSON.stringify(OSM_ATTRIBUTION)}
    ? ${JSON.stringify(attributionHtml(OSM_ATTRIBUTION))}
    : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function fgLocMap(group${any}, onChange${t(': (group: HTMLElement, point: { lat: number; lng: number } | null, touch: boolean) => void')}) {
  if (group.fgLocMap) return
  var state${any} = { map: null, marker: null }
  group.fgLocMap = state
  fgLoadLeaflet(function (L${any}) {
    var el = fgLocParts(group).map
    if (!el || !el.isConnected) return
    var start = (group.getAttribute('data-fg-loc-start') || '20,0,2').split(',').map(Number)
    state.L = L
    state.start = start
    state.map = L.map(el, { center: [start[0], start[1]], zoom: start[2], scrollWheelZoom: false })
    L.tileLayer(group.getAttribute('data-fg-loc-tiles'), { attribution: fgLocAttribution(group.getAttribute('data-fg-loc-attribution') || ''), maxZoom: 19 }).addTo(state.map)
    state.icon = L.divIcon({ className: 'fg-location-pin', html: ${JSON.stringify(LOCATION_PIN)}, iconSize: [24, 36], iconAnchor: [12, 35] })
    state.pick = function (at${any}) {
      var point = fgLocValue({ lat: at.lat, lng: at.wrap().lng })
      if (!point) return
      fgLocShow(group, point, 'none')
      onChange(group, point, true)
    }
    state.map.on('click', function (event${any}) { state.pick(event.latlng) })
    if (window.ResizeObserver) new ResizeObserver(function () { state.map.invalidateSize() }).observe(el)
    fgLocPin(group, fgLocTyped(group), 'zoom')
  }, function () {
    var status = fgLocParts(group).status
    if (status) status.textContent = ${JSON.stringify(messages.locationNoMap)}
  })
}
function fgWireLocations(root${any}, onChange${t(': (group: HTMLElement, point: { lat: number; lng: number } | null, touch: boolean) => void')}) {
  if (!root || root.fgLocWired) return
  root.fgLocWired = true
  var start = function () {
    Array.prototype.forEach.call(root.querySelectorAll('[data-fg-loc]'), function (group${any}) { fgLocMap(group, onChange) })
  }
  start()
  // Fields that appear later (new items, shown by a condition) get their map.
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      var added = records.some(function (record) {
        return Array.prototype.some.call(record.addedNodes, function (node${any}) {
          return node.nodeType === 1 && !node.closest('[data-fg-loc-map]') && (node.matches('[data-fg-loc]') || node.querySelector('[data-fg-loc]'))
        })
      })
      if (added) start()
    }).observe(root, { childList: true, subtree: true })
  }
  var boxOf = function (event${any})${any} {
    return event.target.matches && event.target.matches('[data-fg-loc-lat], [data-fg-loc-lng]') ? event.target.closest('[data-fg-loc]') : null
  }
  root.addEventListener('input', function (event${any}) {
    var group = boxOf(event)
    if (!group) return
    var point = fgLocTyped(group)
    if (point) fgLocPin(group, point, 'pan')
    onChange(group, point, false)
  })
  root.addEventListener('focusout', function (event${any}) {
    var group = boxOf(event)
    if (group) onChange(group, fgLocTyped(group), true)
  })
  root.addEventListener('click', function (event${any}) {
    var button = event.target.closest && event.target.closest('[data-fg-loc-mine], [data-fg-loc-clear]')
    var group = button && button.closest('[data-fg-loc]')
    if (!group) return
    if (button.hasAttribute('data-fg-loc-clear')) {
      fgLocShow(group, null, 'none')
      onChange(group, null, true)
      return
    }
    var status = fgLocParts(group).status
    if (!navigator.geolocation) {
      status.textContent = ${JSON.stringify(messages.locationDenied)}
      return
    }
    status.textContent = ${JSON.stringify(messages.locationFinding)}
    navigator.geolocation.getCurrentPosition(function (position) {
      var point = fgLocValue({ lat: position.coords.latitude, lng: position.coords.longitude })
      fgLocShow(group, point, 'zoom')
      onChange(group, point, true)
    }, function () {
      status.textContent = ${JSON.stringify(messages.locationDenied)}
    }, { enableHighAccuracy: true, timeout: 15000 })
  })
}
// The pins follow the boxes (plain HTML: a reset, saved answers put back);
// fields being typed in are left to their own input events.
function fgLocPins(root${any}) {
  if (!root) return
  Array.prototype.forEach.call(root.querySelectorAll('[data-fg-loc]'), function (group${any}) {
    var state = group.fgLocMap
    if (!state || !state.map || group.contains(document.activeElement)) return
    var at = state.marker ? state.marker.getLatLng() : null
    var point = fgLocTyped(group)
    if (!fgLocSame(point, at ? fgLocValue({ lat: at.lat, lng: at.lng }) : null)) fgLocPin(group, point, point ? 'pan' : 'zoom')
  })
}
// Values set elsewhere (a reset, saved answers) show in the boxes and on the map.
function fgLocSync(root${any}, valueOf${t(': (group: HTMLElement) => unknown')}) {
  if (!root) return
  Array.prototype.forEach.call(root.querySelectorAll('[data-fg-loc]'), function (group${any}) {
    var point = fgLocValue(valueOf(group))
    if (!fgLocSame(point, fgLocTyped(group))) fgLocShow(group, point, 'zoom')
  })
}`
}

/** The wrapper's settings attributes (start view, tiles, attribution). */
export function locationAttrs(node: ElementNode): string {
  const s = locationSettings(node)
  const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `data-fg-loc-start="${s.lat},${s.lng},${s.zoom}" data-fg-loc-tiles="${esc(s.tiles)}" data-fg-loc-attribution="${esc(s.attribution)}"`
}

/** Vue (script setup): wire the fields on mount, show values set elsewhere. */
export function vueLocation(messages: MessageCatalog): string {
  return `${locationRuntime(messages, true)}
onMounted(() => {
  fgWireLocations(fgRoot.value, (group, point, touched) => {
    const path = group.getAttribute('data-fg-loc')!
    fgSet(path, point)
    if (touched) touch(path)
    else revalidate(path)
  })
  fgLocSync(fgRoot.value, (group) => fgGet(group.getAttribute('data-fg-loc')!))
})
watch(form, () => {
  void nextTick(() => fgLocSync(fgRoot.value, (group) => fgGet(group.getAttribute('data-fg-loc')!)))
}, { deep: true })`
}

/** React: inside the component (the latest handler through a ref). */
export function reactLocationHooks(): string {
  return `  // Location fields: wired once on the form; changes go through the latest handler.
  const fgLocChange = useRef<(path: string, point: { lat: number; lng: number } | null, touch: boolean) => void>(() => {})
  fgLocChange.current = (path, point, touch) => {
    if (touch) touched.current.add(path)
    setField(path, point)
  }
  useEffect(() => {
    fgWireLocations(fgRoot.current, (group, point, touch) => fgLocChange.current(group.getAttribute('data-fg-loc')!, point, touch))
  }, [])
  // Values set elsewhere (a reset, saved answers) show in the boxes and on the map.
  useEffect(() => {
    fgLocSync(fgRoot.current, (group) =>
      group.getAttribute('data-fg-loc')!.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form),
    )
  })`
}

/**
 * Blazor: the script (installed through IJSRuntime with the other interop
 * scripts) reports each change to FgLocated(key, lat, lng, touch); values
 * set here (a new model: reset, saved answers) are sent back after the
 * next render.
 */
export function blazorLocation(messages: MessageCatalog): { script: string; members: string } {
  const script = `${locationRuntime(messages, false)}
window.fgLocations = function (root, dotnet) {
  fgWireLocations(root, function (group, point, touch) {
    dotnet.invokeMethodAsync('FgLocated', group.getAttribute('data-fg-loc'), point ? point.lat : null, point ? point.lng : null, touch)
  })
}
window.fgLocSet = function (root, values) {
  fgLocSync(root, function (group) {
    var key = group.getAttribute('data-fg-loc')
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fgLocTyped(group)
  })
}`
  return {
    script,
    members: `
    // Location fields: run by a script on the form's root (FgLocationScript),
    // which reports each change here; values set here (a new model: reset,
    // saved answers) are sent back after the next render.
    public sealed record FgLatLng(double Lat, double Lng);

    private readonly Dictionary<string, (Action<FgLatLng?> Set, FgLatLng? Value)> fgLoc = new();
    private bool fgLocShow;

    private string FgLocKey(string key, Action<FgLatLng?> set, FgLatLng? value)
    {
        fgLoc[key] = (set, value);
        return key;
    }

    private const string FgLocationScript = ${csVerbatim(script)};

    [Microsoft.JSInterop.JSInvokable]
    public void FgLocated(string key, double? lat, double? lng, bool touch)
    {
        if (!fgLoc.TryGetValue(key, out var entry)) return;
        var point = lat.HasValue && lng.HasValue ? new FgLatLng(lat.Value, lng.Value) : null;
        if (point == entry.Value && !touch) return;
        entry.Set(point);
        fgLoc[key] = (entry.Set, point);
        if (touch || point is not null) fgEdit.NotifyFieldChanged(FgField(key));
        StateHasChanged();
    }

    private async Task FgLocShowValues()
    {
        if (!fgLocShow || fgSelf is null) return;
        fgLocShow = false;
        await FgJs.InvokeVoidAsync("fgLocSet", fgFormRoot, fgLoc.ToDictionary(entry => entry.Key, entry => entry.Value.Value is null ? null : (object)new { lat = entry.Value.Value.Lat, lng = entry.Value.Value.Lng }));
    }
`,
  }
}

const csVerbatim = (s: string): string => `@"${s.replace(/"/g, '""')}"`
