# Phase 26 — Range slider, date range, multiple dates, matrix, phone country

## Status

- **26a: complete** (2026-10-04). Range slider with two handles, date range, multiple dates. Commit: see `git log` (feat(phase-26a)).
- **26b: in progress.** Matrix, and phone with a country selector.

Still parked: npm publish.

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
