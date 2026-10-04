# Phase 03 — Renderer: pilot rendering, validation, conditions

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-03)).

## What was built

- **Rule evaluation** — `packages/renderer/src/rules.ts`: `evaluateRules` for the full closed catalog (required, min, max, between, email, url, regex, same-as) with default EN messages and per-rule `message` override. Semantics: min/max/between use string/array length and numeric value; non-required rules skip empty values; required checkbox means must-be-true.
- **Condition evaluation** — `packages/renderer/src/conditions.ts`: `isVisible(ConditionGroups)` (outer OR, inner AND), `evaluateCondition` for all 7 operators, `getValueByPath` dot-path reader. **Condition `field` is a dot path from the data root** (e.g. `account.username`) — decided this phase, documented in the code.
- **Runtime helpers** — `packages/renderer/src/runtime.ts`: `collectVisibleFields` (visible value fields + their data paths), `pickVisibleData` (submit payload excluding hidden fields), `setValueByPath`, `joinPath`.
- **Components** — `src/components/`: `FormsGenForm.vue` (data init via `buildDefaultData` deep-merged with `modelValue`; blur + submit validation; live re-validation of touched fields; `update:modelValue` and `submit` events; provides `FormContext`), `FgNode.vue` (recursive; visibility check; 12-column span via `layout.colSpan`; internal field-component map per ADR-0001; renders group fieldsets and columns grids inline), `fields/FgText|FgTextarea|FgSelect|FgCheckbox.vue`, shared `useField.ts` composable, `context.ts` injection key.
- **Vanilla stylesheet** — `src/styles.css`: `fg-` prefixed, CSS-variable themed, dark mode via `prefers-color-scheme` (overridable with `data-fg-theme="light|dark"` on the form), logical properties only (RTL-ready); 12-column `fg-grid`. Lib build emits `dist/formsgen-renderer.css` (the package's `./style.css` export).
- **Tests** — 49 total now (41 renderer / 8 builder). New: rules (every rule + messages + multi-violation), conditions (every operator + AND/OR + path lookup), and 9 component tests against the kitchen-sink fixture (conditional show/hide, blur errors, blocked invalid submit, nested payload shape, hidden-field exclusion, modelValue merge, required checkbox).

## What was intentionally NOT done

- Deferred to phase 4: using `FormsGenForm` inside the builder (canvas/preview); the builder app still shows placeholders.
- Deferred to phase 7: form-level theme tokens (`meta.theme`) applied as CSS variables; `data-fg-theme` exists but nothing sets it yet.
- Deferred to phase 8: class presets (`preset="tailwind|bootstrap"`); only the vanilla classes exist (REBUILD_PROMPT.md §4/§7a).
- Steps/tabs navigation (those element types don't exist yet — full catalog is phase 10).
- `meta.submit` (URL posting) is unused — the consumer handles the `submit` event payload for now.

## Key decisions & why

- **Condition fields are root-relative dot paths**, not scope-relative names: unambiguous, cheap to evaluate, and compiles 1:1 to every export target. The kitchen-sink's conditions use root fields; add a nested-path condition example when a real case appears.
- **Hidden means excluded**: `pickVisibleData` builds the submit payload from visible fields only, and `validateAll` only validates visible fields. The hidden field's value REMAINS in internal state (so toggling visibility doesn't lose input) — it is filtered at validate/submit time.
- **Field components are an internal map in `FgNode`** (ADR-0001), not a plugin lookup; `FgNode` recurses via SFC self-reference.
- **Error display policy**: errors show after a field is touched (blur) or after a submit attempt; touched fields re-validate live on change.
- **`same-as` and condition lookups share the same root-path lookup** — one semantics for export targets to replicate.

## How to verify

```bash
pnpm verify   # 49 tests green, renderer dist = ESM + UMD + CSS + d.ts
```

Manual: none in the builder yet (phase 4 wires it). To eyeball the renderer, temporarily mount `FormsGenForm` with the kitchen-sink fixture in `apps/builder/src/App.vue` — or wait for phase 4.

## Known issues / gotchas

- `FormsGenForm` deep-watches its data and re-runs `validateAll` after submit-attempt on every keystroke — fine at this scale; revisit if forms get huge (memoize per-field).
- `update:modelValue` emits a JSON-cloned snapshot (not the live reactive object) — intentional, keeps consumers from mutating internal state; File values (phase 10) won't survive JSON cloning, revisit then.
- Vue ESLint styling (one attribute per line, self-closing rules, attribute order) is strict — copy an existing SFC's formatting when adding components.
- The empty-option in `FgSelect` maps `''` ↔ `null` so placeholder selection never pollutes data.

## Pointers for the next phase (04 — builder shell: palette, canvas, properties)

- Palette: `listElements(category)` from `src/registry` gives tabs + items (label/description/icon are ready); `createNode(type, collectNames(tree))` makes the drop node.
- Canvas: build the Pinia store first (`stores/builder.ts`): `schema` (start from a blank form or the kitchen-sink), `selectedId`, actions for add/remove/update/select — phase 6 wraps these in history, so route EVERY mutation through store actions now.
- Editor mode can render the real form via `FormsGenForm` with selection chrome around nodes — or a lighter design-mode tree first; the master prompt wants real rendering ("design mode"). The `FgNode` span/grid classes are reusable for chrome alignment.
- Properties panel: render `getElement(type).propertyPanel` with ~8 shared control components; `name` control must enforce `NAME_PATTERN` + sibling uniqueness (use `findParent` + sibling scan).
- Introduce the i18n catalog with the first real UI strings (flagged since phase 1).
- Flat add/select/delete only — nested drag-and-drop is phase 5.
