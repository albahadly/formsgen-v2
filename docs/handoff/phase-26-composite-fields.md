# Phase 26 — Range slider, date range, multiple dates, matrix, phone country

## Status

Complete — 2026-10-04.

- **26a:** range slider with two handles, date range, multiple dates. Commit: feat(phase-26a).
- **26b:** matrix, and phone with a country selector. Commit: feat(phase-26b).

This finishes the vueform-catalog follow-ups the user approved (phases 23–26). Still parked: npm publish.

## 26a — what was built

Three new field types (Fields tab, en/ar). Their data shapes:

| Type | Arabic name | Value |
|---|---|---|
| `rangeslider` | شريط نطاق | `{ from, to }`, numbers |
| `daterange` | نطاق تاريخ | `{ from, to }`, ISO dates; `''` until chosen |
| `dates` | تواريخ متعددة | sorted, unique ISO dates |

### Range slider (`rangeslider`)
- **How it's built.** Two native range inputs sit over one painted track. CSS lets each input take pointer events only on its thumb.
- **Behaviour.** Keyboard and screen-reader support stay native. Each handle is named "Budget: Minimum" / "Budget: Maximum" (en/ar).
- **Handles can't cross.** A handle pushed past the other stops there. When both sit together, the one that can still move is drawn on top.
- **Props.** `min`, `max`, `step`, `defaultFrom`, `defaultTo` (the starting values are clamped and ordered).

### Date range (`daterange`)
- **Inputs.** Two native date inputs named "Start date" / "End date". The end input's `min` follows the start date.
- **Built-in check.** Runs right after "required": "The end date can't be before the start date".

### Multiple dates (`dates`)
- **Adding.** A date input plus an "Add date" button. Enter also adds.
- **List.** Chips with remove buttons ("Remove 2026-12-01").
- **Rules.** `min`/`max` count the dates.

### Shared semantics

**When a composite value counts as empty.** An object value counts as empty while **any** of its parts is empty. So "required" on a date range needs both dates, and an "is empty" condition is true until both are set. The renderer's `isEmptyValue`, the JS `fgIsEmpty` and C# `FgIsBlank` all follow this rule.

**Builder limits:**
- Object-valued types offer only the `required` rule.
- Conditions on them offer only "is not empty" / "is empty".
- Multiple dates offer list operators.
- None of the three can go inside a repeater yet.

### Per target

| Target | How |
|---|---|
| Renderer / builder Preview | `FgRangeSlider`, `FgDateRange`, `FgDates`. Helpers live in `composite.ts`. |
| Vue standalone | `fgDualSet` (clamps, then writes the corrected value back to the input). Each `dates` field has a draft store plus `fgAddDate` / `fgRemoveDate`. |
| React | `fgDualChange`, `fgAddDate` and `fgRemoveDate` mark the field touched *before* `setField`, so validation sees the new value. |
| HTML | Kinds `range2` / `daterange` / `dates`. Their parts share one `data-fg-path`, so the existing events, validation and conditions apply unchanged. A small runtime paints the track and the chips. |
| Blazor | `FgRange` and `FgDateRange` classes. Date inputs use `value` plus `@onchange` (Razor's `@bind` treats `type="date"` as `DateTime`). Validation runs in `Validate()`. |

**Styles.** The slider rules are framework-neutral. They are part of the vanilla stylesheet, and Tailwind/Bootstrap exports get them as a small stylesheet, but only when the form has a slider. A Tailwind theme sets the slider's colors.

## Verification (26a)

**`pnpm verify`** passes with **348 tests** (119 renderer / 229 builder). The kitchen-sink fixture gained `budget`, `stay` (required) and `days` (max 3).

**Strict compilers** (kitchen-sink export):

| Check | Result |
|---|---|
| React `tsc` | 0 errors |
| `vue-tsc` | 0 errors |
| .NET 8 build of the Blazor export, all 3 frameworks | 0 warnings / 0 errors |

**Real runtimes.** I ran one scenario in **12 runtimes** (HTML, React, Vue and Blazor, each with 3 frameworks) against a local server. All 12 results are **identical**.

The scenario:
1. Real mouse drags on both handles, including pushing one past the other (it stops).
2. Keyboard Home/End/arrows.
3. The fill, the value text and the handle names.
4. Required errors.
5. The date order error, and the end input's `min`.
6. The conditional note appears once the range is set.
7. Three dates with max 2 (error), remove one (cleared), remove-button name.
8. Submit: the JSON shown on screen equals the JSON the server received.

The builder Preview passed the same checks.

## Gotchas (26a)

- **Blazor range inputs must not re-render their `value` during interaction.** It raced the user: handles visibly crossed, and fast key presses were lost in one run. The inputs now render `Shown*` values and are re-created (`@key` = Version, with focus restored) only when a value is corrected or reset.
- **Razor `@bind` on `type="date"`** assumes `DateTime`. With a string model, use `value` plus `@onchange`.
- **Shell:** `pkill -f` / `pgrep -f` match their own command line. Kill test servers by PID.

## 26b — what was built

### Matrix (`matrix`; Arabic: مصفوفة)

**What it is.** A table with one single-choice answer per row.

**Props.** `rows` and `columns`, both `{ value, label }` lists, edited in the panel as "Rows (questions)" / "Columns (answers)".

**Value.** Each row maps to the chosen column, or `null` while unanswered, e.g. `{ "speed": "3", "quality": null }`.

**Required.** Every row must be answered. This is the same "empty while any part is" rule as 26a, so conditions offer only presence.

**Accessibility:**
- The form-level label is a `fieldset`/`legend`.
- Column and row headers are `th scope`.
- Each radio is named "Quality: OK".
- The table scrolls sideways on narrow screens.
- Typed exports get one key per row: `{ speed: string | null; … }`.

### Phone with a country selector

New phone props:
- `countrySelect`: toggles the selector.
- `defaultCountry`: chosen with a country picker in the panel, named in the builder's language.
- `countries`: optional ISO list such as `OM, AE, SA`, limiting the choices.

**Layout.** A select ("Oman (+968)") sits beside the national number. The select's accessible name is "Country code" (رمز الدولة).

**Value.** The value stays **one string**: `"+968 9123 4567"`, or `""` while no number is typed. Phone rules (required, regex…) still apply to it.

**The selected country** is kept separately, so it survives an empty number. Changing the country keeps the typed number.

**Country data and names:**
- Calling codes cover 240 territories (`countries.ts`).
- Country names come from `Intl.DisplayNames` in the **form's** language and are sorted with that language's collation. Arabic forms list "الإمارات العربية المتحدة (+971)" etc.
- The exports bake the names in at export time.

**Inside a repeater** the phone stays a plain tel input in every target. Per-item country state is backlog.

### Per target

| Target | How |
|---|---|
| Renderer / builder Preview | `FgMatrix`, `FgPhone` → `FgPhoneCountry`. The form context now provides `locale()`. |
| Vue / React | Matrix binds `form.x[row]`. Phone uses the `fgPhoneCountry` store (React: state), plus `fgPhoneNumber` / `fgComposePhone` and `FG_DIAL` for the countries offered. |
| HTML | The matrix's radios share `data-fg-path` (kind `matrix`, `data-fg-row`). The phone number input is the field (kind `phone`); its country `<select data-fg-phone-country>` carries `data-dial` per option. |
| Blazor | Matrix is `Dictionary<string, string?>` (+ `FgSetCell`; `required` = any row empty). Phone uses the `fgPhoneCountry` dictionary and `FgDial`; the number commits on change, like `InputText`. |

### Fixes found along the way

- **Bootstrap `<legend>` size.** Bootstrap's reboot makes every legend about 1.5rem, which also affected the existing radio/checkbox groups. The label class now adds `fs-6`.
- **Matrix panel labels.** "Rows" already meant the textarea's line count, so the matrix uses "Rows (questions)".

## Verification (26b)

**`pnpm verify`** passes with **355 tests** (122 renderer / 233 builder). The kitchen-sink fixture gained a required `rating` matrix, and its conditional phone now has the country selector (default OM).

**Strict compilers** (kitchen-sink export):

| Check | Result |
|---|---|
| React `tsc` | 0 errors |
| `vue-tsc` | 0 errors |
| .NET 8 build of the Blazor export, all 3 frameworks | 0 warnings / 0 errors |

**Real runtimes.** I ran one survey scenario in **12 runtimes** against the local server. All 12 results are **identical**.

The scenario:
1. Radio ids, names and table headers.
2. Countries listed, sorted by name, with the default selected.
3. Required errors for both fields.
4. A partial matrix stays invalid; the full matrix clears the error and shows the note.
5. Changing an answer.
6. Typing a number, then switching country: the number is kept.
7. Clearing the number: required error, country kept.
8. Submit: the value shown on screen equals what the server received, `"contact": "+971 50 123 4567"`.

**Other checks:**
- The builder Preview passed the same flow.
- Arabic RTL check, using HTML Vanilla and Bootstrap: the slider runs right-to-left (dragging left raises the upper value), and countries are named and sorted in Arabic.

## Backlog

- Composite fields and the phone country selector inside repeaters.
- A matrix with several answers per row (checkboxes).
- Dropdown cells in the matrix.
- Reading the default country from the visitor's locale.
