# Phase 32: smarter forms

## Status

- **32a:** calculated fields. Commit: feat(phase-32a).
- **32b:** answers inside text. Not started.
- **32c:** save and continue later. Not started.

## 32a: calculated fields

### What people see

A new field, **Calculated** (حقل محسوب). It shows a read-only value worked out from other answers, for example an order total, nights between two dates, or a line total in each item. The value updates as people type and is submitted with the form, as a number or `null`.

**Display.** The box looks set apart from inputs (surface background, tabular figures). It has `prefix` / `suffix` add-ons like a number field ("$", "kg") and fixed decimals (**Decimal places**, 0–6, default 2).

**Validation and conditions.** Calculated fields take validation rules, for example "max 800 → *The total is over the 800 limit*". The error shows after a submit attempt and then follows the value as it changes, in every runtime. Conditions can test them with the number operators, for example "show this note when the total is greater than 500".

### Formulas

| Write | Meaning |
|---|---|
| `{nights} * {price}` | Answers by data path; `+ - * / %`, parentheses, negative numbers |
| `round(x, 2)` `floor(x)` `ceil(x)` `abs(x)` `min(a, b, …)` `max(a, b, …)` | Math |
| `if({nights} >= 7, 0.9, 1)` | `> < >= <= == !=` |
| `days({checkin}, {checkout})`, `days({stay})` | Whole days between two date fields, or across a date range |
| `sum({lines.price})` `avg({lines.price})` `count({lines})` | Over a top-level repeater's items, from a field outside it |
| `{lines.qty} * {lines.price}` | Inside an item: that item's own fields |

**How answers become numbers:**
- empty → 0;
- yes/no → 1/0;
- numeric text (`"90"` from a select, `" 12.5 "`) → that number;
- a list (checkboxes, files, tags) → how many;
- anything else (`"abc"`, an impossible date such as 2026-02-30) → the result is empty.

Division by zero also gives an empty result.

**Rounding** is `floor(x · 10^d + 0.5) / 10^d` in every runtime. A calculated field can read others; they are computed in dependency order.

### Checks

`analyzeFormulas` (renderer) reports a formula's first problem:
- a syntax error ("unknown function", "the formula ends too early" …);
- an unknown field;
- reading a repeater's field from outside without sum/avg/count;
- `sum` from inside an item;
- a field using itself;
- formulas that depend on each other in a loop;
- a calculated field inside an inner repeater.

A formula with a problem leaves the value empty in every runtime.

### Builder

The **Formula** box checks the formula against the whole form as you type: "Problem: {extra} is not a field". Under it are a short syntax guide and buttons for **the fields this formula may use**: top-level fields, its own item's fields, and `count()` / `sum()` over repeaters. Clicking a button inserts it. Everything is in English and Arabic.

### How each target computes

**Renderer.** `FormsGenForm` recomputes in its data watcher, skipping unchanged values. The formula tree is evaluated in TypeScript and is never run as code.

**Exports.** The same tree is compiled to JavaScript or C# (`export/calc.ts`). Helpers `fgNum`, `fgDay`, `fgRound`, `fgCalcValue`, `fgFmt` (C#: `FgNum` …) mirror the renderer exactly.

| Target | How |
|---|---|
| Vue | `fgCalc()` writes into the reactive form; `watch(form, fgCalc, { deep: true, flush: 'sync' })` |
| React | A pure `fgCalc(f)` applied to the initial state, in `setField` and on reset. It returns the same object when nothing changed |
| HTML | `fgCalcAll()` at the start of `updateConditions()`, which already runs after every change, including item add/remove/move and reset. The number is kept in `data-fg-value` |
| Blazor | Stored `double?` properties; `FgCalc()` runs on start, before each render (`ShouldRender`), on field changes and before validation |

**Example.** The hotel booking example gets **Nights** (`days({stay})`) and **Estimated cost** (`{nights} * (90 + 15 * {extras})`, with a `$` prefix).

**Fixture.** The kitchen-sink fixture gets `ks-seat-cost`: `{seats} * 25 * if({seats} >= 10, 0.8, 1)`.

### Verification (32a)

**`pnpm verify`** passes with **439 tests** (157 renderer / 282 builder). New coverage:
- the parser, evaluator, number conversion, dates, aggregates, rounding and error messages;
- the form checks: unknown field, repeater rules, own field, loops;
- a renderer form with item totals, a grand total, read-only display and the payload;
- compiled JavaScript checked against the renderer on every sample formula and input (including empty, invalid and impossible dates, and division by zero);
- the C# output;
- each target's wiring;
- the builder suggestions.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build pass with 0 errors and 0 warnings, for the demo and for the kitchen-sink fixture.

**12 runtimes.** The demo has:
- nights from two dates and parking days from a date range;
- a room price from a select, breakfast (a checkbox) and extras (a checkbox list);
- sortable order lines with line totals;
- a subtotal, line count and average price;
- a total with a 10% discount from 7 nights, a max 800 rule and a "manager will confirm" note over 500.

The scenario:
1. Set nights to 5: the total is 806.48, so the note shows.
2. Submit: the "over the limit" error shows.
3. Untick an extra: 801.48, so the error stays.
4. Untick breakfast: 726.48, so the error clears.
5. Move a line: its line total goes with it.
6. Set 8 nights: the discount applies, the total is 1031.83 and the error is back.
7. Pick the cheaper room: 671.83, so the error clears.
8. Submit: the server receives every calculated value.

All 12 runtimes produce identical results.

**Builder:** the booking example computes 3 nights → $360.00, a typo is flagged at once, and the insert buttons fix the formula.
