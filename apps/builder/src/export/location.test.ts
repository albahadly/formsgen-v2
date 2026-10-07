import { LEAFLET_JS, parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from './css'
import { formDataType } from './structure'
import { getTarget } from './targets'

const place = (props: Record<string, unknown> = {}): ElementNode => ({
  id: 'p',
  type: 'location',
  name: 'place',
  props: { label: 'Where?', lat: 23.6, lng: 58.4, zoom: 11, ...props },
  validation: [{ rule: 'required' }],
})
const schemaOf = (tree: ElementNode[]) => {
  const r = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'loc', locale: 'en', dir: 'ltr', submit: { url: 'https://example.com/s' } }, tree })
  if (!r.ok) throw new Error(r.errors.join())
  return r.schema
}
const out = (target: string, tree: ElementNode[], css: CssFrameworkId = 'vanilla'): string =>
  getTarget(target)!.generate({ schema: schemaOf(tree), css: getCssAdapter(css) }).map((f) => f.content).join('\n')
const echo: ElementNode = { id: 'e', type: 'paragraph', props: { text: 'At: {place}' } }

describe('location in the exports', () => {
  it('a map, the coordinate boxes and the buttons in every target', () => {
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      const code = out(target, [place()])
      expect(code, target).toContain('data-fg-loc-start="23.6,58.4,11" data-fg-loc-tiles="https://tile.openstreetmap.org/{z}/{x}/{y}.png" data-fg-loc-attribution="© OpenStreetMap contributors"')
      expect(code, target).toContain('role="group" aria-label="Where?: Map: click or tap to place the pin, drag the pin to move it" data-fg-loc-map')
      expect(code, target).toMatch(/<input id="fg_place" type="number" [^>]*step="any" min="-90" max="90"/)
      expect(code, target).toContain('<input id="fg_place-lng" type="number"')
      expect(code, target).toContain('data-fg-loc-mine>Use my location</button>')
      expect(code, target).toContain('data-fg-loc-clear>Clear</button>')
      // Leaflet from cdnjs, with its integrity hash.
      expect(code, target).toContain(LEAFLET_JS.src)
      expect(code, target).toContain(LEAFLET_JS.integrity)
      expect(code, target).toContain('function fgWireLocations(root')
    }
    expect(out('html', [place()])).toContain('data-fg-path="place" data-fg-kind="location"')
    expect(out('blazor', [place()])).toContain(`data-fg-loc='@FgLocKey("Place", v => Model.Place = v, Model.Place)'`)
    expect(out('react', [place({ height: 300 })])).toContain(`style={{ height: '300px' }}`)
    expect(out('vue-standalone', [place({ myLocation: false })])).not.toContain('data-fg-loc-mine>Use my location')
  })

  it('another tile server (https with {z}/{x}/{y}) and its credit; anything else falls back', () => {
    const custom = out('html', [place({ tiles: 'https://tiles.example/{z}/{x}/{y}.png', attribution: 'Ex "Maps"' })])
    expect(custom).toContain('data-fg-loc-tiles="https://tiles.example/{z}/{x}/{y}.png" data-fg-loc-attribution="Ex &quot;Maps&quot;"')
    expect(out('html', [place({ tiles: 'javascript:alert(1)//{z}{x}{y}' })])).toContain('data-fg-loc-tiles="https://tile.openstreetmap.org/{z}/{x}/{y}.png"')
  })

  it('the value is { lat, lng } or null in every language', () => {
    expect(formDataType(schemaOf([place()]))).toContain('place: { lat: number; lng: number } | null')
    const razor = out('blazor', [place(), echo])
    expect(razor).toContain('public FgLatLng? Place { get; set; }\n')
    expect(razor).toContain('public sealed record FgLatLng(double Lat, double Lng);')
    expect(razor).toContain('if (Place is null) yield return new ValidationResult("This field is required"')
    expect(razor).toContain('payload["place"] = Model.Place is null ? null : new Dictionary<string, object?> { ["lat"] = Model.Place.Lat, ["lng"] = Model.Place.Lng };')
    expect(razor).toContain('FgLatLng point => point.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture) + ", "')
    expect(razor).toContain('public void FgLocated(string key, double? lat, double? lng, bool touch)')
    // Entries of fields no longer rendered go after each render.
    expect(razor).toContain('fgLocSeen[key] = fgRenderGen')
    expect(razor).toContain('foreach (var key in fgLoc.Keys.Where(key => !fgLocSeen.TryGetValue(key, out var seen) || seen != fgRenderGen).ToList()) { fgLoc.Remove(key); fgLocSeen.Remove(key); }')
    expect(out('html', [place()])).toContain("if (kind === 'location') return fgLocTyped(el.closest('[data-fg-loc]'))")
    expect(out('react', [place(), echo])).toContain("if (typeof r.lat === 'number' && typeof r.lng === 'number') return r.lat + ', ' + r.lng")
  })

  it('Blazor wires its scripts again after EditForm builds new elements (reset, saved answers)', () => {
    const razor = out('blazor', [place()])
    expect(razor).toContain('        fgWire = true;')
    expect(razor).toContain('if (firstRender) await FgInteropInit();\n        await FgInteropWire();')
    expect(razor).toContain('await FgJs.InvokeVoidAsync("fgLocations", fgFormRoot, fgSelf);')
    // The model's values go back to the fields after every render (a step or a condition showing them again).
    expect(razor).toContain('await FgInteropWire();\n        // Values from a new model into the location fields.\n        await FgLocShowValues();')
    expect(razor).not.toContain('private bool fgLocShow')
    // Maps of removed fields go.
    expect(out('html', [place()])).toContain('if (state.map) state.map.remove()')
  })

  it('the README names Leaflet, the tile server and the CSP hosts', () => {
    const readme = getTarget('html')!.readme({ schema: schemaOf([place()]), css: getCssAdapter('vanilla') })
    expect(readme).toContain('Leaflet 1.9.4 loads from `cdnjs.cloudflare.com`')
    expect(readme).toContain('`tile.openstreetmap.org`')
    expect(readme).toContain('meant for light use')
    const own = getTarget('vue-standalone')!.readme({ schema: schemaOf([place({ tiles: 'https://tiles.example/{z}/{x}/{y}.png' })]), css: getCssAdapter('vanilla') })
    expect(own).toContain('`tiles.example`')
    expect(own).not.toContain('meant for light use')
  })
})
