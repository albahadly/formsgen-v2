# Phase 12 — Backlog round: multiselect, error auto-jump, Arabic builder UI

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-12)). Deliberately SKIPPED per user direction: publishing `@formsgen/renderer` to npm (parked for later).

## What was built

- **Multiselect element** (20 types now): native `<select multiple>`, value `string[]`. Renderer `FgMultiSelect` (size clamped 2–6); builder definition lives beside select with an options editor; emitters for vue (array `v-model`), html (new runtime kind `multiselect` reading `selectedOptions`), react (`selectedOptions` mapping); **Blazor emitter deferred** like checkboxgroup (unsupported-comment; model still gets a `List<string>` property so the payload stays complete). React TS type `string[]`; C# kind `list`.
- **Auto-jump to the first errored tab/step**: `FormContext` gained `submitCount()`; `FormsGenForm` bumps it on EVERY submit attempt (before this, `isSubmitted` flipped once and gave no edge to react to). Section hosts in `FgNode` watch it and, when the ACTIVE section is clean but another holds an error, activate the first errored one. Builder `designContext` stubs it.
- **Arabic builder UI + RTL shell**: `i18n/index.ts` now holds `en` + `ar` catalogs (~75 UI strings fully translated), a reactive persisted `locale` (`formsgen.locale`), `setLocale/toggleLocale` flipping `document.documentElement.dir/lang`, and `tOr(key, fallback)` for registry metadata. A header toggle (shows "العربية"/"English") switches live. **Element display names localized** via `element.<type>.label|description` keys with fallback to definition values — used by the palette (including search, which matches both languages), outline, properties header and canvas badges. The shell flips cleanly because it was built on logical Tailwind utilities (verified visually: palette right, properties left, Arabic labels everywhere).
- **Test-hygiene bug fixed (real bug)**: `parseFormSchema` returns the object it was GIVEN, so renderer tests that mutated `fixtureSchema()` were mutating the shared imported JSON module and poisoning later tests (surfaced when the new multiselect test landed after a mutating test). Fixtures now deep-clone at the parse boundary in both renderer test files.
- **Tests — 149** (50 renderer / 99 builder): multiselect array binding + payload; auto-jump; locale toggle (labels + `dir`/`lang`, and back); registry count updates; 12 snapshots regenerated (multiselect markup present in all targets; unsupported-comment for blazor).

## What was intentionally NOT done (remaining backlog)

- **`@formsgen/renderer` npm publish — parked by user; pick up later.**
- Tags/chips element (custom chip UI across 4 codegen targets is heavy).
- Blazor emitters for multiselect/checkboxgroup; Blazor per-step validation gating.
- axe-core smoke test in CI; `aria-live` announcements.
- Registry labels in the EXPORTED artifacts stay as authored in the schema (localization of form CONTENT is the form author's job via labels — only the BUILDER chrome is localized).

## Key decisions & why

- **`tOr` fallback pattern** keeps definitions as the source of truth (English) and the catalog as an overlay — no migration of 20 definition files, and a missing translation degrades to English instead of a raw key.
- **`submitCount` instead of watching `isSubmitted`**: a boolean that latches true has no edge on the second failed submit; a counter re-triggers the jump every attempt.
- **Palette search matches both the definition text and the localized label**, so Arabic users can type either.
- **Multiselect ≠ checkboxgroup**: same value shape (`string[]`), different control; kept both because exports/native UX differ (dropdown vs inline options).

## How to verify

```bash
pnpm verify   # 149 tests
pnpm dev      # then:
```

1. Header "العربية" → the WHOLE builder flips to Arabic RTL (palette right, Arabic element names, toolbar); reload — the choice persists; "English" flips back.
2. Fields → Multiselect: options editor works; preview binds multiple selections; Export shows `<select multiple>` in vue/react/html and the unsupported note in Blazor.
3. Preview the kitchen sink, leave the required field in a NON-active tab/step empty (e.g. make a tab-2 field required), submit → the view jumps to the offending tab/step.

## Known issues / gotchas

- `parseFormSchema` intentionally does NOT clone (cheap on trusted input); ANY caller that mutates the result of parsing a shared/imported object must clone first — the two renderer test files show the pattern.
- The locale test must toggle back to `en` (and the suite's `afterEach` clears localStorage) or later tests see Arabic labels.
- `t()`/`tOr()` are reactive because they read `locale.value` inside render — don't "optimize" them into module-level constant lookups.
- Arabic strings in `i18n/index.ts` keep technical identifiers (JSON, CSS, README) and brand names in Latin script on purpose.

## Pointers for whoever continues

Backlog after this round, in suggested order: renderer npm publish (parked — resume here when the user says so), tags element, auto-jump parity in EXPORTED artifacts (currently renderer-only; exports still rely on tab error visibility), Blazor multi-value emitters + step gating, axe CI.
