# Phase 45: field types — star rating, NPS scale (45a); currency, address (45b)

## Status

**45a complete** (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout (lint, typecheck, renderer
221 / builder 383 / cli 12 / server 9 tests,
all builds); the 12-runtime matrix on `tools/proof/demos/scores.json`
12/12 IDENTICAL (strict compiles 0 errors / 0 warnings); the three CSS flavours measure IDENTICAL on the kitchen sink, the examples form and the floating demo at 1200 and 390px (`parity-check.sh`); the builder reviewed in Edge
(palette, panel, canvas, preview, light and dark).

**45b complete** (2026-10-21), on `main`. Gate: `pnpm verify` green
(renderer 228 / builder 388 / cli 12 / server 9 tests, all builds); the
12-runtime matrix on `tools/proof/demos/money.json` 12/12 IDENTICAL (strict compiles 0 errors / 0 warnings); no
stylesheet changed (parity as measured for 45a); the builder reviewed in
Edge (palette, panel, canvas prefix, preview formatting and suggestions).

## What was built (45a)

- **Two score element types**, both a number or null:
  - `rating` — a star rating 1..`max` (`props.max` 3–10, default 5;
    `ratingStars(node)` clamps it). The panel has "Number of stars".
  - `nps` — a 0..10 scale with the two end words under it
    (`props.lowLabel` / `props.highLabel`; blank = the message catalog's
    `npsLow` / `npsHigh`, now in all five languages).
- **Radios underneath, everywhere.** The renderer's `FgScore.vue` and the
  registry's `scores.ts` emit the same shape: a `fieldset` with a legend,
  a `div.fg-rating` or `div.fg-nps` of visually hidden radios
  (`srOnly`) each followed by its label (`.fg-rating-star` /
  `.fg-nps-option`), then `.fg-nps-ends` for the scale, the description
  and the error. Keyboard, screen readers and the required rule come for
  free from the radio group; nothing is scripted for the stars.
- **The fill is CSS only.** Stars sit in reverse DOM order (5…1) inside a
  `row-reverse` flex box, so `input:checked ~ .fg-rating-star` colours the
  chosen star and every lower one, and hover previews the same way; the
  box packs at the start side (`justify-content: flex-end` on a reversed
  axis), which is also right for RTL. The rules are one block,
  `SCORE_CSS` (`export/composite.ts`), spliced into the vanilla
  stylesheet, added to Tailwind/Bootstrap exports when the form has a
  score, and mirrored verbatim in the renderer's `styles.css` (the
  elements23 mirror test demands it).
- **The four code targets**: HTML radios carry `data-fg-kind="score"`
  and `fgGet` reads the checked one as a number; Vue `v-model` with a
  numeric `:value`; React `checked={form.x === n}` / `setField(x, n)`;
  Blazor `InputRadioGroup` bound to a `double?` with
  `InputRadio Value="@((double?)n)"`. Typed models say `number | null`,
  the C# model `double?`, the validation export `z.number().nullable()`
  / JSON Schema `["number", "null"]` (plain `number` when required).
- **URL prefill** reads both as numbers (`NUMBER_TYPES` in the renderer's
  `prefill.ts`, which the builder's export shares; the HTML runtime
  matches radios by `String(value)`).
- **Builder**: two palette entries with icons, English/Arabic/French/
  Spanish/German names, descriptions and panel words; the feedback
  template asks for stars and an NPS (its old 0–10 slider became the
  NPS; the RSVP's guest count became a slider so `range` keeps an
  example); kitchen sink `ks-stars` (required) and `ks-nps`.
- **Tests**: `packages/renderer/src/score.test.ts` (clamping, reverse
  order, a pick emits a number, required blocks submit, end words per
  locale and from props); `apps/builder/src/export/targets/scores.test.ts`
  (every target's markup, the stylesheet in every flavour and the
  mirror, the validation shapes); the kitchen-sink tests fill the stars.
- **Proof**: `tools/proof/demos/scores.json` + `tools/proof/e2e/scores.mjs`
  — opened with `?nps=3`, the low score shows a conditional box,
  submitting without stars fails the required rule, four stars and a 9
  hide the box, the paragraph pipes "You gave 4 stars", the sample
  server stores `{ stars: 4, nps: 9 }` as numbers; the star fill is
  measured by colour.
- **Found on the way (React runtime, every form)**: a control that calls
  `setField()` then `touch()` in one change handler (radios, checkboxes,
  sliders, now scores) validated the closure's stale data in `touch`, so
  after a rejected submit the required error survived the pick. The
  first matrix run showed it (`picked.required` true in the three React
  runtimes only). `touch` now validates `formRef.current`, which
  `setField` updates as it sets; the examples are regenerated.

## What was built (45b)

- **`currency`** — an amount (a number or null) in a text control
  (`inputmode="decimal"`) with the currency sign as its prefix add-on
  (`props.currency`, a three-letter code, default USD; a symbol for the
  common codes, else the code) and `props.decimals` (0–4, default 2).
  While the field is being edited the text is what was typed; on blur it
  shows the amount with the **form locale's separators** (`1,234.50`,
  `1.234,50`, `1 234,50`) and the value is rounded. Parsing needs no
  locale: the last `.` or `,` followed by one to `decimals` digits is the
  decimal mark, every other separator groups digits, signs and currency
  marks are skipped. The renderer's `money.ts` holds the two routines;
  `export/money.ts` emits the same two in JS/TS (separators baked in at
  export time) and in C# (`FgMoneyFormat` / `FgMoneyParse`, half-up
  rounding like `Math.round`). HTML reads `data-fg-kind="currency"` as a
  number and reformats on blur; Vue and React keep a per-field draft text
  (`fgMoneyDraft` / `fgMoney`) that falls back to the formatted value;
  Blazor binds `@oninput` to `FgMoneyInput` and `@onblur` to
  `FgMoneyBlur` (draft dropped, `FgChanged`). Prefill reads it as a number
  and shows it formatted; the typed models say `number | null`, C#
  `double?`, the validation export `z.number().nullable()`.
- **`address`** — a text input whose `<datalist>` fills with suggestions
  as people type: `props.suggestUrl` (an http(s) template with `{q}`;
  default Nominatim) and `props.minChars` (1–10, default 3). The
  renderer's `suggest.ts` reads a provider's JSON loosely (a list of
  strings or objects with `display_name` / `label` / `name` / `text` /
  `address`, or a `features` / `results` / `items` list of those, GeoJSON
  `properties` included) into at most eight distinct texts; the same
  logic is one shared script (`fgWireSuggest(root)`) the HTML runtime
  wires per root, Vue on mount, React in an effect and Blazor through
  IJSRuntime like the maps. The value is the text, picked or typed.
- **Both** are new palette entries with names in five languages, panel
  controls ("Currency code", "Decimals"; "Suggestions URL", "Letters
  before suggesting"), kitchen-sink fields `ks-price` (EUR) and
  `ks-address`, and the order template's new "Tip for the courier" and a
  street field with suggestions. The sample server answers
  `GET /suggest?q=` from a short list of places for the demos.
- **Tests**: `packages/renderer/src/money.test.ts` (separators,
  formatting, lenient parsing, props, the field's edit/blur cycle, the
  provider call after a pause and the datalist);
  `apps/builder/src/export/targets/money.test.ts` (every target's markup
  and helpers, the baked separators, the validation shapes, nothing
  emitted without the types).
- **Proof**: `tools/proof/demos/money.json` (German) + `tools/proof/e2e/money.mjs`
  — `?price=99.9` shows `99,90`; `1234,5` becomes `1.234,50` on blur; an
  empty amount fails the required rule; `2.000` reads as two thousand;
  `mus` fills the datalist from the sample server; the submission stores
  `{ price: 2000, place: 'Muscat, Oman' }`.

## What was intentionally NOT done

- No half stars, no custom star count above 10, no icons other than the
  star glyph (`\2605`), no "clear" control — a required rating has no
  blank state and an optional one is simply left empty.
- The NPS is not scored (promoters/detractors); the number is stored.
- Currency and address are not allowed inside repeaters
  (`REPEATER_EXCLUDED_TYPES`): the runtimes key their draft text and the
  wiring by a fixed path; items would need the template-path stores the
  phone field uses.
- No currency conversion, no symbol placement per locale (the sign is
  always the prefix add-on), no Arabic-Indic digits; the amount is one
  number, the code lives in the schema.
- A picked suggestion fills only its own field (no street/city/postcode
  split): providers differ too much in what they return.

## Key decisions & why

- **Radios, not a custom widget**: the three CSS flavours stay identical
  (ADR-0004) because the markup is the same and the rules are one shared
  block; every runtime gets focus, keyboard and validation from the
  browser.
- **Reverse DOM order for stars** is the only way to fill "up to the
  chosen one" with plain CSS; the trade-off (DOM order 5→1) is hidden
  from assistive tech by the labels carrying the number as sr-only text.
- **A number, not a string**: scores are compared and averaged; the
  condition operators `greater-than` / `less-than` work on them without
  casting, and the C# model is `double?` like the other numbers.
- **Money parses without a locale and formats with one**: what people
  type is ambiguous only when a separator is followed by exactly the
  number of decimals the field has, and then it is the decimal mark in
  every language; so the same parser runs in JS and C# and the runtimes
  agree byte for byte, which the matrix checks.
- **Suggestions through a datalist, not a custom list**: the browser does
  the keyboard, the matching and the picking; the shared script only
  fills options, so the four runtimes stay identical.

## How to verify

```sh
pnpm verify
PLAYWRIGHT_CHANNEL=msedge bash tools/proof/export-demo.sh tools/proof/demos/scores.json tools/proof/work/scores
bash tools/proof/strict.sh tools/proof/work/scores ScoresDemoForm
node packages/submit-server/server.mjs --port 4280 --dir tools/proof/work/subs &
PLAYWRIGHT_CHANNEL=msedge bash tools/proof/run-matrix.sh tools/proof/work/scores ScoresDemoForm scores_demo tools/proof/e2e/scores.mjs scores
PLAYWRIGHT_CHANNEL=msedge bash tools/proof/export-demo.sh tools/proof/demos/money.json tools/proof/work/money
bash tools/proof/strict.sh tools/proof/work/money MoneyDemoForm
PLAYWRIGHT_CHANNEL=msedge bash tools/proof/run-matrix.sh tools/proof/work/money MoneyDemoForm money_demo tools/proof/e2e/money.mjs money
bash tools/proof/parity-check.sh
```

## Known issues / gotchas

- `run-matrix.sh` does not start the sample server; without one on 4280
  every runtime reports `NO RESULT` with `ECONNREFUSED` in its err file.
- `SCORE_CSS` lives in two places on purpose (renderer stylesheet,
  `composite.ts`); change both or the mirror test fails.
- `export-demo.sh` runs the builder's vitest; a `vitest -u` in the
  builder at the same time can lose its snapshot update — run them one
  after the other.
- The money and suggestion helpers (`export/money.ts`) exist in JS, TS
  and C#; a change to the rules is three edits plus the renderer's
  `money.ts` / `suggest.ts`.
- The "no stylesheet file" helpers in `targets.test.ts` and
  `theme.test.ts` strip `rating`/`nps` like range sliders and HTML
  blocks: their rules ship as a file in the Tailwind/Bootstrap flavours.
- A shared block is read by all three flavours, and only vanilla defines
  the `--fg-*` tokens: every token needs the fallback chain the other
  blocks use (`var(--fg-color-border, var(--bs-border-color, #d1d5db))`),
  or the declaration is dropped — the first parity run measured the NPS
  options 2px smaller in Tailwind/Bootstrap (no border; the chosen one
  had no background either). A bordered element also says
  `box-sizing: border-box` itself, since vanilla has no global reset.

## Pointers for the next phase

- Phase 46 (a three-way system/light/dark control, copy/paste of
  elements between projects) follows on the user's roadmap.
- Nominatim's usage policy asks for a referer and light traffic: forms
  with many users should name their own provider in `suggestUrl`.
