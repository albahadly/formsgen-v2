# Phase 07 — View modes, device widths, preview theme, form settings

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-07)).

## What was built

- **UI store** — `stores/ui.ts`: `viewMode` (editor/preview/code), `device` (mobile 375px / tablet 768px / desktop), `previewTheme` (light/dark), `showSettings`. Ephemeral — never in history or persistence.
- **Work area** — `components/canvas/WorkArea.vue` = `CanvasToolbar` + mode switch; `CanvasPanel` is now the editor mode only. Toolbar: view tabs, device group (hidden in code view), form theme toggle, settings button.
- **Preview mode** — `PreviewPanel.vue`: the REAL `FormsGenForm` with the live schema (validation, conditions, submit all active), constrained to the device width, `data-fg-theme` from the toggle, and a "Submitted data" JSON card after a valid submit. The form remounts on schema shape changes (`formKey`).
- **Code view** — `CodePanel.vue`: read-only schema JSON highlighted with highlight.js (core + json language only, github-dark theme; builder-only dependency) and a Copy button.
- **Form settings dialog** — `components/settings/SettingsDialog.vue` over `ui.showSettings`: title, machine name (slug-validated via `builder.setMetaName`, draft-local like element names), locale, direction (ltr/rtl), submit URL + method, primary color picker and corner radius (theme tokens). Esc / backdrop / ✕ close it.
- **Renderer: theme tokens applied** — `FormsGenForm` maps `meta.theme` entries to `--fg-<token>` CSS variables on the form root (test added). The editor canvas also honors the device width + theme toggle.
- **Store additions** — `updateMeta(patch)`, `setMetaName(name)`, `setThemeToken(token, value|null)`; all flow through the schema so history/autosave capture them.
- **Tests** — 91 total (42 renderer / 49 builder). New: theme-token CSS vars, meta actions, and 5 UI flows (preview submit payload, code JSON, device width, theme flip, settings dialog incl. name validation).

## What was intentionally NOT done

- Submit URL is STORED but the renderer still only emits the `submit` event — actually POSTing `meta.submit.url` belongs to the export targets / a consumer choice, revisit in phase 8 README generation.
- Theme tokens UI covers `color-primary` and `radius` only; the schema accepts any token (export/presets must pass ALL of them through).
- Dialog focus-trap/a11y beyond Esc-close → phase 11.
- Device widths don't simulate user agents — width constraint only, by design.

## Key decisions & why

- **View/device/theme live in a separate `ui` Pinia store**, not the builder store: keeps history/autosave watchers blind to them for free.
- **Preview remounts via a cheap `formKey`** (tree JSON length + theme): guarantees defaults re-derive after structural edits without deep-diffing. Edge: an edit that keeps the exact serialized length doesn't remount — harmless (values persist anyway), replace with a revision counter if it ever bites.
- **highlight.js stays builder-side only** — the renderer package must remain dependency-free (vue peer only).
- **`vue/no-v-html` stays enabled**; the two sanctioned sinks are `SvgIcon` (registry icons) and the hljs `<code>` block in `CodePanel.vue`, the latter under a scoped eslint-disable with justification. Don't add more.

## How to verify

```bash
pnpm verify   # 91 tests green
pnpm dev      # browser:
```

1. Build a form → Preview tab: it's fully interactive (required errors on submit, conditions fire); valid submit shows the payload card. Mobile/Tablet/Desktop change the frame; 🌙 flips the form to dark (editor canvas too).
2. Settings ⚙: set a title, try an invalid name (error, schema untouched), pick a primary color → Submit button recolors in preview instantly; set radius `12px` → corners round.
3. Code tab: highlighted JSON of the live schema; Copy works.
4. Undo also reverts settings edits (meta is part of the schema).

## Known issues / gotchas

- `eslint-disable` comments in Vue templates: `-next-line` is line-exact and awkward inside multi-line elements — use a scoped `<!-- eslint-disable vue/no-v-html -->` … `<!-- eslint-enable -->` pair instead.
- highlight.js github-dark CSS is imported inside `CodePanel.vue`; it's global once loaded — acceptable since its selectors are `.hljs`-scoped.
- The settings `method` select is disabled until a URL is set; clearing the URL drops the whole `submit` object (including method) — intentional.

## Pointers for the next phase (08 — CSS adapters + ExportTarget plugins + export dialog)

- Read REBUILD_PROMPT.md §7, §7a, §7b carefully first — the contracts are spelled out there.
- Suggested layout: `apps/builder/src/export/css/{types,vanilla,tailwind,bootstrap5}.ts`, `apps/builder/src/export/targets/{types,json,vue-lib,vue-standalone,html}.ts`, element emitters added to each `ElementDefinition.export` (extend `registry/types.ts`).
- The vanilla adapter's `stylesheet()` should derive from the SAME tokens as `packages/renderer/src/styles.css` — consider exporting the token list from the renderer or generating from `ThemeTokens` + defaults, so preview and export can't drift.
- Export dialog UI: target tabs + framework selector + single-file/zip toggle (zip via `jszip`, builder-only dep) + highlighted output (reuse `CodePanel`'s hljs setup — extract a shared `useHighlight` or a `CodeBlock.vue`).
- Snapshot tests per target × framework against `fixtures/kitchen-sink.formsgen.json`; behavioral tests: compile the generated standalone validation/conditions logic (the JS parts) against the shared semantics table (reuse cases from `rules.test.ts` / `conditions.test.ts`).
- Keep generators pure functions `(schema, ctx) => ExportedFile[]` — unit-testable without the dialog.
