# ADR-0001 — Element knowledge split between renderer and builder

## Context

Element types need two kinds of knowledge: runtime semantics (does it carry
a value, does it nest children, what is its default value, how does it
render) and authoring metadata (palette icon and labels, default props when
dropped, property-panel definition). The published `@formsgen/renderer`
package must stay lean and dependency-free, while REBUILD_PROMPT.md §3
describes one `ElementDefinition` carrying everything.

## Decision

Split by consumer:

- `@formsgen/renderer` owns the canonical schema types, the closed rule and
  condition catalogs, and `coreElements` — per-type runtime semantics
  (`hasValue`, `isContainer`, `defaultValue`). Phase 3 adds its render
  components keyed by the same type ids (an internal component map, not a
  plugin lookup, for core types).
- The builder owns `src/registry/` — `ElementDefinition` with the authoring
  metadata (icon, category, labels, `defaultProps`, `propertyPanel`), one
  file per type in `registry/elements/`. `registerElement` refuses a type
  that has no core semantics in the renderer, so the two sides cannot drift
  silently. Export emitters (phase 8+) attach to the builder-side
  definition.

`renderPreview` from the master prompt's interface is NOT part of the
builder definition for core types; the renderer renders them itself. The
field stays reserved for future custom/third-party elements.

## Alternatives considered

- One registry in the renderer package carrying everything: bloats the
  published library with builder-only data (icons, panel definitions) its
  consumers never use.
- Fully separate, unlinked registries: silent drift between builder and
  renderer when a type exists on one side only; rejected in favor of the
  registration-time check.

## Consequences

- Adding an element type touches exactly two files (core semantics entry +
  builder definition) until phase 8 adds export emitters.
- The renderer can render any schema without the builder being present —
  required for the "use it in any project" goal.
- A builder-side test asserts every definition's `hasValue`/`isContainer`
  matches the renderer's core semantics.
