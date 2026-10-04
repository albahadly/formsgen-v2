# Phase 13 — Backlog round: tags element, export auto-jump, axe CI

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-13)). Still parked per user direction: publishing `@formsgen/renderer` to npm.

## What was built

- **Tags (chips) element** (21st type, 16th field): free-text multi-value, value `string[]`. Renderer `FgTags.vue` — chips with per-chip remove buttons (`aria-label="Remove <tag>"`), draft input that adds on Enter/comma/blur (trim + de-dupe, blanks ignored), Backspace on an empty draft removes the last chip. Builder definition `registry/elements/tags.ts` with vue/html/react emitters; **Blazor emitter deferred** (chips need per-field component state; model still gets `List<string>` via C# kind `list`, so the Blazor payload stays complete). Four new CSS slots (`tagsWrap`, `tag`, `tagRemove`, `tagsInput`) in all three adapters + the vanilla stylesheet (`.fg-tags*` mirrored in renderer `styles.css`).
- **Chip logic lives in each target's scaffold, markup in the emitter** (same split as validation): the emitters reference conventional names — vue: `tagDrafts['path']` + `fgAddTag('path')`/`fgRemoveTag('path', i)`; react: `tagDrafts` state + `fgAddTag('path', form.path)` (current list passed in to keep handlers pure of path plumbing); html: a `data-fg-kind="tags"` wrapper with `data-fg-tags-chips`/`data-fg-tags-input` spans the `FG_TAGS` runtime binds to, value held in a JS-side `fgTags` map (chips are DOM-painted, Enter/comma/blur to add).
- **Submit error auto-jump in EXPORTED artifacts** (parity with the renderer's phase-12 behavior): on a failed submit, every tabs/steps host whose ACTIVE section is clean jumps to its first section holding an error. vue-standalone: `fgSecPaths_<key>` consts (now emitted for ALL hosts, tabs included) + `fgJumpToError()` called from `onSubmit`; react: same consts + an inline jump block in `handleSubmit` using `nextErrors` (not state, which is stale in that tick); html: `fgHasError()` re-runs the compiled validator per path and `fgSetSec(meta, i)` on the first offender. `fgNext_*` step gating now reads the shared `fgSecPaths_*` consts instead of inlining its own path arrays.
- **axe-core a11y smoke test in CI**: `packages/renderer/src/a11y.test.ts` runs axe over the fully mounted kitchen-sink form — pristine AND submitted (all errors visible) states. Runs under jsdom inside `pnpm test`, so the existing CI workflow gates on it with no new job. `color-contrast` is the only rule disabled (needs a paint engine).
- **Fixture**: kitchen-sink gained `topics` (tags, `max 5`). Arabic catalog gained `element.tags.*`.
- **Tests — 158** (55 renderer / 103 builder). New: FgTags behavior (add/de-dupe/blank, remove button + backspace, list validation + `string[]` payload), 2 axe smokes, registry catalog count, per-target wiring assertions (tag handlers, `fgSecPaths_*` for tabs hosts, jump blocks, Blazor `List<string> Topics`); 12 snapshots regenerated.
- **Browser-verified (Playwright/Chromium), HTML and React artifacts** from a purpose-built schema (tags field + required field hidden in the SECOND tab): chips add via Enter AND comma, duplicate ignored, remove button works, blur adds the draft; failed submit auto-switches to the erroring tab and shows the message; final payloads IDENTICAL across both targets (`{topics: ['react','blazor'], first_field: '', hidden_required: 'ok'}`).

## What was intentionally NOT done (remaining backlog)

- **`@formsgen/renderer` npm publish — parked by user; pick up when asked.**
- Blazor emitters for tags/multiselect/checkboxgroup (markup renders an unsupported-comment; payload properties exist). Blazor per-step validation gating (needs `ValidationMessageStore`) and Blazor auto-jump likewise.
- `aria-live` announcement region for error summaries.
- Vue-standalone artifact was asserted structurally (same compiled logic as react/html) but not browser-driven this round — the react/html proofs cover the shared scaffold conventions.

## Key decisions & why

- **`fgSecPaths_*` for ALL hosts, not just steps**: the jump needs per-section path lists for tabs too; emitting one shared const family (steps gating + jump both read it) beats two near-identical structures.
- **React jump reads `nextErrors`, not `errors`**: `setErrors` hasn't committed inside the same `handleSubmit` tick — reading state there would jump against stale errors.
- **HTML `fgHasError` recomputes instead of caching**: validators are pure and cheap; a parallel error map would be a second source of truth to keep in sync.
- **axe in jsdom rather than Playwright CI**: catches the structural regressions (labels, roles, aria wiring, duplicate ids) on every `pnpm test` with zero CI infrastructure; contrast is already locked by the vanilla theme tokens.

## How to verify

```bash
pnpm verify                     # lint + typecheck + 158 tests + builds
pnpm --filter @formsgen/renderer vitest run src/tags.test.ts src/a11y.test.ts
pnpm dev                        # drop a Tags field; preview: chips UI; export any target
```

Browser E2E (manual, ~2 min): dump html/react artifacts for a schema with a tags field and a required field in a second tab (temp vitest dump, phase-08 gotcha), drive with Playwright (`/opt/pw-browsers/chromium`): add/remove chips, submit → auto-switch to the erroring tab, payload `topics` array.

## Gotchas for the next phase

- The react tags input binds `value={tagDrafts['path'] ?? ''}` — `tagDrafts` starts `{}`, so the `?? ''` is what keeps the input controlled from the first render.
- React error `<p>`s have no ids (conditional render); target them by class/adjacency in E2E, unlike HTML's `#fg_err_<key>`.
- `npm install` in a scratch dir WITHOUT its own `package.json` walks up and clobbers the scratchpad's `node_modules` symlink (`/opt/node-tools`) — create a `package.json` first (or run `npm init -y`).
- html target: `fgTags` must be declared before `fgGet` (validators close over it); the chips painter re-captures `index` per `paint()` pass, so remove handlers never go stale.
- New-element checklist (phase-09 handoff) still applies; tags added nothing new to it beyond the CSS-slot step: when an element needs new slots, update `css/types.ts` + ALL THREE adapters + the vanilla base stylesheet + renderer `styles.css`, or typecheck fails on the `Record<Slot, string>` maps (by design).
