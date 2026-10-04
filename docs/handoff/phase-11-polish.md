# Phase 11 — Polish: accessibility, RTL, documentation

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-11)). **This closes the 11-phase build plan.**

## What was built

- **Keyboard alternative to drag-and-drop** (the a11y gap flagged since phase 5): store actions `moveSibling(id, ±1)`, `moveOut(id)` (lifts after its container), `moveInto(id)` (nearest preceding container, depth-guarded via `canDropInto`); bound to **Alt+Arrow Up/Down/Left/Right** on the focused canvas alongside the existing select/delete/duplicate keys.
- **Dialog focus management** — `composables/useFocusTrap.ts`: focuses the first focusable on open, cycles Tab/Shift+Tab inside, restores focus on close; applied to the Settings and Export dialogs (Export also gained Esc-to-close).
- **Renderer ARIA** — every field control now links its error message via `aria-describedby` → the error `<p :id="errorId">` (new `errorId`/`describedBy` in `useField`); groups got it on each option input. `aria-invalid` was already present.
- **Landmarks** — the three builder panels carry `aria-label`s.
- **RTL** — the design-mode canvas now carries `:dir="schema.meta.dir"` (preview already did), so editing an RTL form is WYSIWYG; verified visually with an Arabic kitchen sink (labels right-aligned, asterisks on the logical end, mirrored columns, flipped slider). Builder chrome already used logical Tailwind utilities throughout.
- **Documentation** — root `README.md` rewritten: architecture in five sentences, the **add-an-element-in-3-files guide** (promised since the master prompt), export-target matrix, deployment notes; new `packages/renderer/README.md` for package consumers.
- **Test hygiene fix (real bug)** — the builder integration suite had cross-test pollution: never-unmounted App wrappers kept 500ms-debounced autosave timers alive, writing drafts to the file-shared `localStorage` that later `mountApp` calls silently RESTORED. Now: `localStorage.clear()` before/after each test and all wrappers unmount in `afterEach`. Verified stable across repeated runs.
- **Tests — 133** (45 renderer / 88 builder). New: keyboard-move store actions (3), Alt+Arrow integration, focus trap (attached-DOM mount), `aria-describedby` end-to-end in preview.

## What was intentionally NOT done

- Deferred catalog from phase 10 stands: **tabs/steps**, multiselect/tags/matrix, file uploads, checkboxgroup-Blazor (see phase-10 handoff for the plan of each).
- Builder-UI localization (the `t()` catalog has EN only); the renderer/forms side is fully RTL/locale-ready.
- `aria-live` announcements for canvas operations (add/move/delete) — worthwhile follow-up if screen-reader users materialize; the operations are all reachable and labeled today.
- Automated a11y audit (axe) in CI — manual pass only this phase.

## Key decisions & why

- **Alt+Arrows** for keyboard movement (not bare arrows, which navigate selection; not Ctrl+Arrows, which conflict with word-jump in inputs). The input-focus guard still applies.
- **Focus trap is a 40-line composable**, not a dependency — the two dialogs are simple; revisit only if dialog count grows.
- **moveOut places the node AFTER its old container** — predictable round-trip with moveInto (Alt+Left then Alt+Right is a no-op pair when the container precedes).
- Attached-DOM mounting is reserved for the one test that needs real focus; everything else stays detached (faster, no body pollution).

## How to verify

```bash
pnpm verify   # 133 tests
pnpm dev      # then:
```

1. Select an element → Alt+↑/↓ reorders, Alt+→ moves into the previous container, Alt+← lifts it out (depth limit still enforced).
2. Open Settings or Export → focus lands inside, Tab cycles within, Esc/✕ closes and focus returns to the opener.
3. Settings → Direction: RTL → the EDITOR canvas and preview both flip (open the kitchen sink for a full-page check).
4. Preview: blur an empty required field → the input's `aria-describedby` points at the visible error.

## Known issues / gotchas

- The localStorage/test-pollution pattern generalizes: **any test that mounts App must clear storage and unmount**, or debounced autosave will haunt later tests. The `mounted[]` + `afterEach` pattern in `builder.test.ts` is the template.
- `useFocusTrap` filters hidden elements via `offsetParent` — fine in jsdom and browsers, but don't use it inside `position: fixed` children without re-checking.
- VTU `.element` is `Element`; cast to the concrete HTML type before `.focus()`.

## Pointers for whoever continues (post-plan backlog, in suggested order)

1. **Phase 10b** — tabs/steps wizards (plan in phase-10 handoff), then multiselect/tags.
2. Publish `@formsgen/renderer` to a registry and swap the README's pack-and-install flow for a plain `npm i`.
3. Builder-UI i18n (catalog exists; add a locale switcher + Arabic strings) — pairs naturally with an RTL builder shell via `dir` on `<html>`.
4. axe-core smoke test in CI; `aria-live` region for canvas operations.
5. Renderer class presets (`preset="tailwind|bootstrap"`) — the one §7a item still one-way (codegen only).
