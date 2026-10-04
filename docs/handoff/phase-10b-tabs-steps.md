# Phase 10b — Tabs and Steps (wizard) containers

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-10b)).

## What was built

- **Schema shape**: `tabs`/`steps` are containers whose children are `tab`/`step` SECTION nodes (containers themselves, data-transparent — no `name`, no own data nesting). Four new core metas; `SECTION_CONTAINERS` / `SECTION_TYPES` maps exported from the renderer define the pairing.
- **Renderer** (inline in `FgNode.vue`, consistent with group/columns): tabs render a `role=tablist` header + the active panel; headers show an **error dot** when any field inside that tab currently has an error (visible after submit attempts). Steps render a numbered progress list, the active step, and Back/Next — **Next touches and validates only the current step's fields** and refuses to advance until clean (labels overridable via `props.backText/nextText`). Values persist across section switches (state lives in the form, not the DOM). Stray `tab`/`step` nodes outside a host render transparently.
- **Builder**: palette gains Tabs/Steps (scaffolding two sections via the new `ElementDefinition.createChildren`) plus Tab/Step items; canvas hosts show section headers (click = activate + select → properties edit the label), per-header ✕ remove, "+ Add tab/step" (`store.addSection`), and the active section is the drop zone. Selecting a section from the outline reveals it. **Type-aware drop rules** in `acceptsChildType` + `canDropInto`: hosts accept only their section type, sections live only in their host (root refused), `moveOut` respects it; `addElement` with a host selected routes into the FIRST section.
- **Export**: the markup walker pre-renders section panels and hands them to a per-target `renderSections` hook (fallback: labeled fieldsets).
  - *Vue standalone*: `ref(0)` per host, `v-show` panels (fields stay mounted), tab buttons, step list, `fgNext_<key>()` gating on compiled `fgStepPaths_<key>`.
  - *React*: `useState` per host inside the component, display-toggled panels, step handler validating via the validators map and batching error state.
  - *HTML*: `data-fg-sec-*` attributes + `FG_SECTIONS` metadata (incl. per-framework active/base classes and step paths); generic runtime wires clicks, toggles panels/buttons, gates Next through `validateField`.
  - *Blazor*: `private int fgSec_<key>` fields, `@onclick` headers, `@if` panels; **no per-step gating** — DataAnnotations validates on final submit (documented in the generated code comment and README).
- **CSS adapters**: 8 new slots (tabList, tabButton(+Active), stepList, stepItem(+Active), stepActions, buttonSecondary) in all three frameworks (Bootstrap uses `nav nav-tabs`/`nav-link active`); vanilla stylesheet + renderer stylesheet extended in sync.
- **Tests — 146** (48 renderer / 98 builder): renderer tab switching, step gating/Back/value persistence, error dots; store section rules, scaffolding, addSection, first-section routing, moveOut refusal; builder UI section headers/add/palette routing; export assertions for all four targets + 12 regenerated snapshots (spot-checked).
- **Browser-verified** (generated HTML artifact in Chromium): tab switch, Next blocked with visible required error, advance after fill, Next hidden on last step, payload carrying fields from every section. Builder preview verified visually (screenshot).

## What was intentionally NOT done

- Blazor per-step validation gating (see above; a hand-rolled `ValidationMessageStore` approach could add it later).
- Submit-button awareness of steps (the global Submit stays visible on every step; master-prompt wizard semantics kept simple). An errors-elsewhere submit does NOT auto-jump to the offending tab/step in the renderer — the tab error dot covers tabs; consider auto-jump later.
- Drag-reordering SECTION HEADERS in the canvas (sections reorder via the outline or Alt+Arrows on the selected section).
- Remaining deferred catalog unchanged: multiselect/tags/matrix/file uploads.

## Key decisions & why

- **Sections as real tree nodes** (not a props map): they get conditions, the outline, duplicate, history and DnD for free, and export walkers stay uniform.
- **Sections are data-transparent**: tabs/steps are PRESENTATION; data shape stays owned by groups. Matches `pickVisibleData` with zero changes.
- **`v-show`/display-toggling in JS exports, `@if` in Blazor**: JS targets keep inputs mounted so step/tab switching never loses in-progress DOM state; Blazor state lives in the Model so unmounting is safe.
- **Type rules live in `acceptsChildType`**, consumed by canDropInto/addElement/moveOut — one place to extend when a future container constrains children.
- **Walker hook (`renderSections`) over per-element emitters**: hosts need target-level STATE, which element emitters must not own (§7b: logic belongs to scaffolds).

## How to verify

```bash
pnpm verify   # 146 tests
pnpm dev      # Structure tab → add Tabs / Steps:
```

1. Section headers switch/select; "+ Add tab" appends; ✕ removes (min 1 kept); palette adds land in the active/first section; dragging a field into a host body targets the active section; dragging a Tab to the root is refused.
2. Preview: tabs switch (error dot after a failed submit when a hidden tab has a required field); wizard Next blocks on the required field, advances when filled, Back preserves values.
3. Export: every target shows section code (vue `fgSec_*` refs, react `useState`, html `FG_SECTIONS`, blazor `@if` + int fields); download the HTML and walk the wizard from disk.

## Known issues / gotchas

- Section `key`s derive from node ids (`sectionKey`) — stable per project, but two different projects' exports differ; snapshots use fixture ids (`ks_social_tabs`, `ks_wizard`).
- In the builder, `useDropList(() => activeSection?.id ?? null)` would target the ROOT if rendered with no sections — the template guards with `v-if="activeSection"`; keep that guard.
- The HTML runtime initializes sections via `fgSetSec(meta, 0)` at load — don't remove it, it also sets initial Back/Next visibility.
- Renderer `FgNode` hoisted helper functions can't see the `ctx` narrowing — use the `formCtx` alias (comment in file).

## Pointers for whoever continues

Backlog order stands (phase-11 handoff): multiselect/tags → renderer npm publish → builder i18n/RTL shell → axe CI. Also new: tab/step auto-jump-to-error on submit, and Blazor step gating via `ValidationMessageStore`.
