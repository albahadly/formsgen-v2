# Phase 18 — Visual condition builder

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-18)). Replaces the Properties-panel placeholder "The visual condition builder arrives in a later phase." Still parked per user direction: publishing `@formsgen/renderer` to npm.

## What was built

The condition *engine* has existed since phase 3: schema `conditions: Condition[][]` (outer OR, inner AND, root-relative paths), renderer evaluation, compilation in all four exports, and the canvas "conditional" badge. This phase adds the authoring UI, plus the bookkeeping that keeps authored conditions valid.

- **`ControlConditions.vue`** (the Properties panel's Conditions section; shown for every element whose panel lists `{ kind: 'conditions' }` — fields, static elements and containers):
  - empty state: "Always visible." + **Add condition**; when the form has no named fields: an explanation, with the button disabled;
  - each condition: **field** dropdown (field labels) → **operator** dropdown → **value** input; ✕ removes the row;
  - **+ and** adds a row to the group; **+ or…** adds a new group; "and" / "or" separators;
  - a reference to a deleted field shows a warning ("Field “x” no longer exists — pick another.") instead of being silently dropped;
  - fully translated (en + ar), RTL-correct.
- **Type-aware conditions** (`src/conditions/sources.ts`). The renderer compares with `===`, so each value is stored with its source field's runtime type, and only sensible operators are offered:

  | Source field | Operators | Value input → stored as |
  |---|---|---|
  | checkbox | is | checked / not checked → `true`/`false` |
  | number, range | is, is not, greater than, less than, empty, filled | number input → `number` |
  | select, radio group | is, is not, empty, filled | the field's own options → option value `string` |
  | multiselect, checkbox group | contains, empty, filled | the field's own options → `string` |
  | tags | contains, empty, filled | text → `string` |
  | text-likes, date, time | is, is not, contains, empty, filled | text → `string` |

  Switching between operators with the same value type (is ↔ is not) keeps the value. Switching to empty/filled drops it (no stale `value` is stored). An element can't reference itself, and a container can't reference its own descendants (it could hide itself permanently).
- **References follow path changes** (`stores/conditionPaths.ts`, started in `App.vue`). A field's data path changes when it or a named group around it is renamed, or when it's dragged into or out of a named group. A deep watcher on the tree compares each field's path by node id and rewrites matching condition references through the new store action `rewriteConditionFields`.
  - Whole-schema *replacements* (undo/redo, opening a project, "start fresh") only re-baseline, since a restored snapshot is already self-consistent.
  - The default (pre) flush batches a cross-container drag's two list updates, so the moved field is seen at its final path.
- **Store**: `setConditions(id, groups)` drops empty groups and removes the key when nothing is left.

## Verification

- `pnpm verify`: **225 tests** (74 renderer / 151 builder; 17 new). New coverage:
  - source listing (self/descendant exclusion, named-group paths, label fallback, options);
  - operators and value types per field type;
  - path tracking: field rename, drag into a named group as two list updates in one tick, named-group rename, schema replacement re-baselines without rewriting, a deleted field's reference is kept;
  - the editor component: add, typed values (boolean/number/option), keeping or dropping values across operators, AND/OR structure and removal, missing-field warning;
  - an integration test where editor-shaped conditions (`(plan is pro AND seats > 5) OR terms is checked`) drive visibility in the real `FormsGenForm`.
- **Real builder in Chromium** (production build via `vite preview`):
  - built a form (Account type select: Personal/Business; Company name text) and authored "show Company name when Account type is Business" through the panel;
  - **Preview**: hidden initially, shown for Business, hidden for Personal;
  - **Exported HTML** (taken from the export dialog and opened in the browser): same behavior;
  - the Arabic UI shows "إظهار هذا العنصر فقط عندما:" and يساوي.

## Not done / backlog

- **`@formsgen/renderer` npm publish — parked by user.**
- The builder's own Arabic catalog still misses the panel section headings (PROPERTIES, DATA, LAYOUT, VALIDATION, CONDITIONS) and some control labels (Label, Placeholder, Description). This is pre-existing (phase 16 backlog); a quick follow-up.
- Conditions compare against fixed values only (no "field A equals field B"). The engine's closed operator catalog would need a new operator for that.
- No date comparisons ("before / after"): `greater-than` / `less-than` are numeric in the engine.
