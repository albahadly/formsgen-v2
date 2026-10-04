# Phase 04 — Builder shell: palette, canvas, properties

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-04)).

## What was built

- **Store** — `apps/builder/src/stores/builder.ts`: the single source of truth (`schema`, `selectedId`); actions `addElement` (into a SELECTED CONTAINER, else root), `removeElement` (recursive), `select`, `updateProps`, `setName` (returns `'invalid' | 'duplicate' | null`), `setColSpan`, `setValidation`, `reset`. Getters `selectedNode`, `takenNames`. **Every mutation goes through an action** — phase 6 wraps them in history.
- **i18n** — `src/i18n/index.ts`: flat EN catalog + `t()`; all new UI strings go through it (the phase-1 debt is paid).
- **Palette** — `components/palette/PalettePanel.vue`: category tabs (fields/static/structure), cross-category search, click-to-add; icons via `components/ui/SvgIcon.vue` (the ONLY place trusted registry SVG hits `innerHTML` — never pass user content).
- **Canvas** — `components/canvas/`: `CanvasPanel.vue` (background click deselects; `.fg-form` wrapper so renderer styles apply), `BuilderNode.vue` (recursive; selection ring; hover chrome with type badge, conditions badge, delete; renders REAL renderer field components; containers render dashed with nested children), `designContext.ts` (provides a design-mode `FormContext`: live preview values, no validation; rebuilds defaults on tree changes).
- **Properties panel** — `components/panel/PropertiesPanel.vue` renders the selected element's registry `propertyPanel`; controls in `panel/controls/`: Text, Number, Toggle, Select (preserves numeric prop types), Items (option list editor), Name (slug + sibling-uniqueness errors), Validation (add/remove rules from the closed catalog with per-rule value editors incl. between bounds), Colspan; `conditions` kind renders a placeholder.
- **Renderer export addition** — `FgText/FgTextarea/FgSelect/FgCheckbox` are now exported from `@formsgen/renderer` for design-mode rendering.
- **Tests** — 65 total (41 renderer / 24 builder). New: 9 store tests, 7 integration tests mounting the full App (add→render, search, panel editing writes through to schema+canvas, invalid name rejected, rule builder, delete via chrome, add-into-selected-container).

## What was intentionally NOT done

- Drag-and-drop, reordering, duplicate, keyboard interactions, element tree sidebar → phase 5. Adding into a container currently works by SELECTING the container, then clicking a palette item.
- Conditions builder UI → later phase (placeholder shown in the panel).
- Preview/code/device toolbar, form settings → phase 7.
- Max nesting depth (5) still unenforced → phase 5 (flagged since phase 2).
- Palette drag affordance (cursor etc.) — intentionally absent until real DnD exists.

## Key decisions & why

- **Design mode uses the real renderer field components** with a fake `FormContext` (`designContext.ts`): no validation/error UI in the canvas, but WYSIWYG markup/styles for free. Container markup (group/columns) is builder-owned chrome, not the renderer's — revisit if drift hurts.
- **Add-into-selected-container** as the pre-DnD nesting mechanism: one store-level `if`, replaced (not removed — it stays useful) by DnD in phase 5.
- **`SvgIcon` centralizes `innerHTML`** to keep `vue/no-v-html` on and the trust boundary explicit.
- **`ControlSelect` preserves numeric prop types** (columns `count`): if the current prop value is a number, the selected string is coerced back. Gotcha: a numeric prop that is currently `undefined` would store a string — give numeric props numeric defaults in `defaultProps`.
- **Name edits are draft-local** (`ControlName` keeps a ref): invalid input shows an error without writing to the schema, so the schema never holds a bad name.

## How to verify

```bash
pnpm verify   # 65 tests green
pnpm dev      # then in the browser:
```

1. Click "Text Input" in the palette → appears on canvas, selected, properties panel shows Properties/Data/Layout/Validation/Conditions.
2. Edit Label → canvas label updates live. Set Name to `9bad` → red error, schema unchanged.
3. Structure tab → add Group; with the group selected, add a Select from Fields → it nests inside the group.
4. Options editor: add/remove options → canvas dropdown updates.
5. Validation: add `required` → red asterisk appears on the canvas label.
6. Hover a node → chrome (type badge, ✕); ✕ deletes; clicking canvas background deselects.

(Phase-04 screenshot was verified via Playwright against the dev server.)

## Known issues / gotchas

- `designContext` preview values reset on ANY tree change (deep watch rebuilds defaults) — typed preview values vanish when you edit props. Harmless for now; fix if designers complain (diff paths instead of rebuild).
- The canvas columns container renders children with a fixed `sm:grid-cols-2` regardless of `count` — cosmetic, design-mode only; fix when DnD lands in phase 5 or when the canvas honors spans properly.
- Playwright scripting in this cloud container: use the GLOBAL `playwright` package (`ln -sfn /opt/node-tools/node_modules node_modules` next to the script) with `executablePath: '/opt/pw-browsers/chromium'`.

## Pointers for the next phase (05 — nested DnD, tree sidebar, duplicate, keyboard)

- Use `vuedraggable@next` (already planned in REBUILD_PROMPT.md §1; not yet installed — add it to `apps/builder`).
- Store needs a `moveElement(id, targetParentId | null, index)` action; keep ALL mutation in the store (history lands next phase). Enforce max depth 5 and "containers only accept children" there, not in the UI.
- Palette items become drag sources (keep click-to-add as the keyboard path); `BuilderNode` container drop zones replace the "select container then click" hint text (keep the mechanism).
- Duplicate = deep clone with fresh ids (`nanoid`) and renamed `name`s (reuse `uniqueName` against `takenNames`).
- Tree sidebar: a collapsible outline panel; reuse `getElement(type).label` + selection wiring that already exists.
- Keyboard: Delete removes, Ctrl/Cmd+D duplicates, Esc deselects, arrows move selection — put the handler on the canvas root, not window, to avoid stealing panel inputs.
