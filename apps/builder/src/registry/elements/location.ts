// Location: a point picked on a map (Leaflet; OpenStreetMap tiles unless
// another https tile server is set), from the device ("Use my location") or
// typed as latitude and longitude. The value is { lat, lng } or null. The
// fields are run by a script wired on the form root (export/location.ts);
// Blazor's calls back into .NET with each change.

import { locationSettings, type ElementNode } from '@albahadly/formsgen-renderer'
import { blazorValidationMessage, descriptionFor, esc, legendFor, pascalMember, reactDescription, reactError, textProp, vueError, htmlError } from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx, type EmitterLang } from '../types'
import { locationAttrs } from '@/export/location'

function picker(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const c = lang === 'react' ? 'className' : 'class'
  const m = ctx.messages
  const settings = locationSettings(node)
  const text = (s: string): string => (lang === 'blazor' ? esc(s).replace(/@/g, '&#64;') : esc(s))
  // Attribute text: no Razor or Vue interpolation.
  const attr = (s: string): string => (lang === 'vue' ? esc(s).replace(/\{\{/g, '&#123;&#123;') : text(s))
  const member = pascalMember(ctx.key)
  // The field's value key: the field path (JS targets) or the Blazor field key.
  const key =
    lang === 'blazor'
      ? `data-fg-loc='@FgLocKey("${member}", v => Model.${member} = v, Model.${member})'`
      : `data-fg-loc="${ctx.path}"`
  const style = lang === 'react' ? `style={{ height: '${settings.height}px' }}` : `style="height: ${settings.height}px"`
  const end = lang === 'react' ? ' />' : '>'
  const html = lang === 'html' ? ` data-fg-path="${ctx.path}"` : ''
  const input = (part: 'lat' | 'lng', id: string, range: number): string =>
    `<label ${c}="${ctx.css.classes('locationCoord')}">
      <span>${text(part === 'lat' ? m.locationLat : m.locationLng)}</span>
      <input id="${id}" type="number" ${c}="${ctx.css.classes('input')}" step="any" min="-${range}" max="${range}" ${lang === 'react' ? 'inputMode' : 'inputmode'}="decimal"${part === 'lat' && ctx.required ? ' aria-required="true"' : ''} data-fg-loc-${part}${html}${part === 'lat' && lang === 'html' ? ' data-fg-kind="location"' : ''}${end}
    </label>`
  const mine = settings.myLocation
    ? `\n    <button type="button" ${c}="${ctx.css.classes('buttonSecondary')}" data-fg-loc-mine>${text(m.locationMine)}</button>`
    : ''
  const attrs = locationAttrs(node)
  return `<div ${c}="${ctx.css.classes('location')}" ${key} ${lang === 'blazor' ? attrs.replace(/@/g, '&#64;') : attrs}>
  <div ${c}="${ctx.css.classes('locationMap')}" ${style} role="group" aria-label="${attr(`${textProp(node, 'label') ?? ''}: ${m.locationMap}`)}" data-fg-loc-map></div>
  <div ${c}="${ctx.css.classes('locationRow')}">
    ${input('lat', ctx.id, 90)}
    ${input('lng', `${ctx.id}-lng`, 180)}${mine}
    <button type="button" ${c}="${ctx.css.classes('buttonSecondary')}" data-fg-loc-clear>${text(m.locationClear)}</button>
  </div>
  <p ${c}="${ctx.css.classes('locationStatus')}" aria-live="polite" data-fg-loc-status></p>
</div>`
}

function fieldset(parts: string[], lang: EmitterLang, ctx: EmitCtx): string {
  const c = lang === 'react' ? 'className' : 'class'
  const labelledBy = parts.some((p) => p.includes(`id="${ctx.id}-legend"`)) ? ` aria-labelledby="${ctx.id}-legend"` : ''
  return `<fieldset ${c}="${ctx.css.classes('field')}"${labelledBy}>\n  ${parts
    .filter(Boolean)
    .map((part) => part.split('\n').join('\n  '))
    .join('\n  ')}\n</fieldset>`
}

export const locationElement: ElementDefinition = {
  type: 'location',
  category: 'fields',
  label: 'Location',
  description: 'Pick a place on a map',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Location', lat: 20, lng: 0, zoom: 2, myLocation: true, height: 260 },
  propertyPanel: commonFieldSections(
    [
      { kind: 'toggle', prop: 'myLocation', label: 'Show "Use my location"' },
      { kind: 'number', prop: 'lat', label: 'Map starts at latitude', min: -90, max: 90 },
      { kind: 'number', prop: 'lng', label: 'Map starts at longitude', min: -180, max: 180 },
      { kind: 'number', prop: 'zoom', label: 'Starting zoom (1–18)', min: 1, max: 18 },
      { kind: 'number', prop: 'height', label: 'Map height (px)', min: 160, max: 600 },
      { kind: 'text', prop: 'tiles', label: 'Tile server (https, with {z}/{x}/{y})', placeholder: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
      { kind: 'text', prop: 'attribution', label: 'Map credit (for another tile server)' },
    ],
    ['hideLabel', 'align', 'className'],
  ).map((section) => ({
    ...section,
    controls: section.controls.filter((control) => !('prop' in control && control.prop === 'placeholder')),
  })),
  export: {
    vue: (node, ctx) => fieldset([legendFor(node, ctx), picker(node, ctx, 'vue'), descriptionFor(node, ctx), vueError(ctx)], 'vue', ctx),
    html: (node, ctx) => fieldset([legendFor(node, ctx), picker(node, ctx, 'html'), descriptionFor(node, ctx), htmlError(ctx)], 'html', ctx),
    react: (node, ctx) => fieldset([legendFor(node, ctx, true), picker(node, ctx, 'react'), reactDescription(node, ctx), reactError(ctx)], 'react', ctx),
    blazor: (node, ctx) =>
      fieldset([legendFor(node, ctx), picker(node, ctx, 'blazor'), descriptionFor(node, ctx), blazorValidationMessage(ctx)], 'blazor', ctx),
  },
}
