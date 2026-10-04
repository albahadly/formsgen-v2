# Phase 10 — Element catalog expansion

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-10)). Scope note: 13 new types this phase (19 total); the remaining master-prompt catalog items are explicitly deferred (below).

## What was built

- **13 new element types**, each with core semantics, renderer rendering, builder definition (icon, defaults, panel) and emitters for all four export languages:
  - *Text-like variants* (one factory: `registry/elements/textLike.ts` + `textVariants.ts`): **email** (default `email` rule), **password**, **url** (default `url` rule), **phone** (tel), **date**, **time** — all reuse `FgText` via `TEXT_INPUT_TYPES` and the text emitters with the right `type` attr.
  - **number** (`double?`-style: `null` when empty; `FgNumber`; `v-model.number` / `Number()` parsing / html kind `number` / Blazor `InputNumber` with `double?` + `[Range]` attributes) and **range** (`FgRange`, always-valued, min/max/step props, Blazor plain `<input type=range @bind>` because `InputNumber` hardcodes its type).
  - **radiogroup** (string|null; `FgRadioGroup`; html kind `radio` reads `:checked`; Blazor `InputRadioGroup`/`InputRadio`) and **checkboxgroup** (string[]; `FgCheckboxGroup`; html kind `checks` collects checked values; **no Blazor emitter — deferred**, generated file carries the standard "unsupported" comment).
  - *Static elements* (first entries in the palette's Static tab): **heading** (H1–H4 via `level`), **paragraph**, **divider** — `hasValue: false`, rendered by `FgStatic`, trivial emitters, conditions/colspan still apply.
- **CSS adapters** gained slots: `options`, `option`, `range`, `heading`, `paragraph`, `divider` (all three frameworks + vanilla stylesheet additions mirrored into the renderer stylesheet).
- **HTML export runtime** `fgGet` now handles kinds `number`, `radio`, `checks`.
- **React target** types the form data FROM THE SCHEMA (`FIELD_TS_TYPES`), fixing `number|null` vs the old defaults-inferred `string|null`.
- **C# compiler** got `CsFieldKind` (`string|bool|number|numberValue|list`): numeric rules become `[Range]`, list/bool rules route to `Validate()`, per-kind empty/size expressions; Blazor model types/initializers follow the kind; radiogroup `""` → `null` in the payload for cross-target parity.
- **Kitchen-sink fixture** now exercises every implemented type incl. a second conditional field (`contact_phone` when contact = phone).
- **Tests — 127** (45 renderer / 82 builder): new form interactions (number parsing, checkbox-group arrays, radio, dual conditionals, static rendering), updated registry/catalog assertions, 12 snapshots regenerated for the grown fixture and spot-checked.
- **Browser-verified**: the regenerated standalone HTML export driven in Chromium — number→12, radio→"pro", checkbox group→array, range default, conditional phone shown + captured, hidden field excluded.

## What was intentionally NOT done (deferred catalog)

- **tabs / steps** containers — the remaining big rocks (renderer navigation + per-step validation + export treatment); next candidate phase or fold into 11 if time allows. Flagged since phase 2.
- **multiselect**, **tags**, **matrix**, **file/image upload** (file values are JSON-unsafe — needs a decision on payload encoding first, see phase-03 modelValue gotcha), **hidden input**, **buttons as palette elements** (the form has a built-in submit), **WYSIWYG/signature/location** (third-party dependency decisions).
- **checkboxgroup Blazor emitter** — Blazor has no built-in multi-checkbox binding; needs a hand-rolled bool-per-option or custom component approach.
- Rule catalog is UNCHANGED (closed list per §7b) — e.g. no "min-items" distinct from `min` (length semantics already cover arrays).

## Key decisions & why

- **Text-like factory** instead of six near-identical files: variants differ only in `type` attr + palette metadata; one factory keeps the 4 emitters in ONE place.
- **number is `null`-when-empty everywhere** (JS `null`, C# `double?`); **range always has a value** (defaults to `min`): matches native control behavior and keeps required-validation meaningful.
- **Static elements go through the same node pipeline** (cells, colspan, conditions) rather than a special path — conditions on a heading work for free in every target.
- **Omitting an emitter is a first-class state** (checkboxgroup/blazor): the walker's "unsupported" comment in generated output is the documented contract, better than wrong code.

## How to verify

```bash
pnpm verify   # 127 tests
pnpm dev      # palette now: 14 field types + Static tab + Structure;
              # Open fixtures/kitchen-sink.formsgen.json → Preview:
              # heading/paragraph/divider, slider with live value, radio,
              # checkbox group, number; contact=phone vs other swaps the
              # two conditional fields. Export: all 6 targets × 3 frameworks.
```

## Known issues / gotchas

- `FgRadioGroup` uses `:name="path"` to group radios — duplicate-named RADIO groups across different containers are fine (paths differ), don't "simplify" to node.name.
- HTML export: radio/checks kinds attach `data-fg-path` to EVERY option input; `fgGet` queries `:checked` — the single-element `fgControl` is only used for error styling (first option gets the invalid class).
- Snapshots were regenerated once for the fixture growth (12 updated, spot-checked: Blazor `InputRadioGroup`, `double? Seats`, `List<string> Interests`, unsupported-comment only for checkboxgroup/blazor).
- The `/tmp` Playwright scripts must run from a directory with a `node_modules` symlink to `/opt/node-tools/node_modules` (ESM resolution).

## Pointers for the next phase (11 — polish, or 10b for the deferred catalog)

- If doing 10b first: tabs/steps need (a) renderer nav state + per-step `collectVisibleFields` scoping, (b) a `canDropInto` story for their children in the builder, (c) export strategy per target (JS targets: section show/hide + step index; Blazor: conditional rendering). Multiselect/tags are quick wins after choiceGroups patterns.
- Phase 11 (REBUILD_PROMPT): a11y pass (keyboard alternative for DnD, dialog focus traps, ARIA on palette tabs), RTL pass for the BUILDER shell (renderer is already logical-properties clean), README expansion (add the "add an element in one file" guide — the textLike factory is the example), demo fixture — the kitchen sink already doubles as it.
- i18n catalog: new registry labels are still plain strings in definitions (consistent with phase 4's decision to route UI strings, not registry data); revisit only if registry localization becomes a requirement.
