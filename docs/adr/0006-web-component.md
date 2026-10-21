# ADR-0006 — The web component renders in the page, with one shared stylesheet

## Context

Phase 43 made the renderer available as `<formsgen-form>`, one script for
any page. A custom element can render inside a shadow root (styles
isolated, nothing leaks either way) or in the light DOM (the page's
styles apply, the element's styles must be added to the page). The
renderer's optional pieces load their own resources: Leaflet's stylesheet
from a CDN for the map, Turnstile's script for the spam check; the form's
theme is a set of CSS variables on `.fg-form`; the other exports all
render in the page.

## Decision

- **Light DOM** (`defineCustomElement(…, { shadowRoot: false })`). The
  form renders inside the element like any other export; Leaflet,
  Turnstile, the theme variables and the host page's own `fg-` styling
  work unchanged.
- **The stylesheet is added to the page once** (`<style
  id="formsgen-element-styles">`, the renderer's `styles.css` inlined at
  build time), whatever the number of elements on the page.
- **The element is the host**: it fetches `src` (or takes a `schema`
  property / attribute), sends the answers where `meta.submit` points
  unless the page prevents `formsgen-submit`, reports `formsgen-change`,
  `formsgen-sent`, `formsgen-ready`, `formsgen-error`, and honours
  `meta.afterSubmit` — the same host logic the vue-lib export generates.
- **Ids stay the renderer's** (`fg-<node id>`), not the exports'
  (`fg_<path>`): the scenarios in `tools/proof` carry an id map per
  runtime instead. Changing either scheme would touch dozens of tests
  and the examples for no user-visible gain.

## Alternatives considered

- Shadow DOM: isolation would be nice, but the map's CSS and the host's
  theming would need forwarding, and the result would differ from every
  other export.
- A per-element `<style>` inside the element: duplicated for each form
  on a page.

## Consequences

- A page with its own `.fg-*` rules styles the element too — by design.
- Two id schemes exist across the 13 runtimes; `tools/proof/e2e` scripts
  that reach controls by id use an `ID` map keyed by `kind`.
- The bundle (`dist/element/`, ~325 kB) carries Vue; the builder deploys
  it under `element/`, so exports made in the builder can include it and
  pages can load it from there.
