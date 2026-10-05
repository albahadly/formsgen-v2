# Phase 32: smarter forms

## Status

- **32a:** calculated fields. Commit: feat(phase-32a).
- **32b:** answers inside text. Commit: feat(phase-32b).
- **32c:** save and continue later. Commit: feat(phase-32c).

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

## 32b: answers inside text

### What people see

Labels, descriptions, headings and paragraphs (formatted ones too) can show answers given earlier in the form, as people type:
- "Welcome, **{first_name|guest}**!" shows "Welcome, guest!" until a name is typed, then "Welcome, Ana!";
- "How old is {guests.gname|this guest}?" inside a repeating section reads that item's own name, and follows the item when it moves.

| Answer | Shown as |
|---|---|
| Text, email, date… | As typed |
| Select / radio / checkbox list / multi-select | The option labels ("Deluxe", "Towels, Flowers") |
| Checkbox / switch | Yes / No (نعم / لا) |
| Lists (tags, dates, files) | Joined with ", ", or "، " in Arabic; files by name |
| Date range / two-handle slider | "from – to", or empty until both ends are set |
| Calculated field | With its decimals |
| Matrix | Nothing |
| Empty | The fallback after `|`, or nothing |

**Safety.** Answers are inserted as text, never as markup. A name like `<b>x</b> {{1+1}} @x {y}` shows exactly as typed in every target. In formatted paragraphs the text is parsed first, so an answer can't add bold or links. `{first_name}` is never taken as italics, even with its underscore.

**Mistakes stay visible.** A reference that isn't a field, or an item's field used outside its item, stays as typed.

**Builder.** The Label, Heading and Paragraph boxes show the hint "Use {field} to show an answer, e.g. Hello, {name|there}!" (en/ar). The registration example's last step says "Almost done, {full_name|friend}! We will send a confirmation to {email|your email}."

### How it works

**Renderer.** `pipeText` / `answerText` (pipe.ts) go through `FormContext.pipe(text, scope)`, which `useField`, `FgFieldLabel`, `FgFloat` and `FgStatic` call. Formatted paragraphs are parsed, then answers go into their text nodes.

**Exports.** `EmitCtx.pipe(text)` (export/answers.ts) turns the text into markup for the language: static parts are escaped and answers become expressions in the right scope.

| Target | Answer |
|---|---|
| Vue | `{{ fgOr(fgPick(form.room, {…}, ", "), 'fallback') }}`, inside items `item.x`. `{` in static text is an entity, so formatted text no longer needs `v-pre` |
| React | `{fgOr(fgAnswer(form.first_name, ", "), "guest")}` |
| HTML | `<span data-fg-answer="guests.__i__.gname" data-fg-fallback="…">`, painted by `fgPaintAnswers()` in every `updateConditions()`. Item stamping fills in the index |
| Blazor | `@(FgOr(FgPick(Model.Room, new Dictionary<string, string> { … }, ", "), "…"))`, inside items `item.X` |

The helpers (`fgAnswer`, `fgPick`, `fgYesNo`, `fgOr` and their C# versions) mirror the renderer's `answerText`.

### Fix found along the way

Unused-helper pruning kept a helper that only called itself (`fgIsEmpty`). A React export with no required rules and no conditions therefore failed strict TypeScript (TS6133). Pruning now ignores a helper's references to itself.

### Verification (32b)

**`pnpm verify`** passes with **448 tests** (161 renderer / 287 builder). New coverage:
- splitting references;
- formatting each kind of answer (Arabic included);
- a renderer form updating its heading, label, description, formatted text, item labels and item text;
- unknown references staying as typed;
- hostile input inserted as text;
- each target's output;
- the JS helpers against the renderer's formatting;
- pruning a self-recursive helper.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build pass with 0 errors and 0 warnings, for the demo and for the kitchen-sink fixture, whose formatted intro now says "Hi {full_name|there}!".

**12 runtimes.** The demo has:
- a heading and an email label using the name;
- a description using the room's option label;
- a formatted summary with the name (bold), the room (italics), the nights (calculated), VIP Yes/No, the extras' labels and the dates;
- guests whose age label and note use their own name;
- unknown references.

The scenario:
1. Check the fallbacks first.
2. Fill everything in.
3. Move Guest 2 up: their texts follow them.
4. Type a hostile name: it shows literally, with no tags created.
5. Submit.

All 12 runtimes produce identical results.

## 32c: save and continue later

### What people see

A form setting, **Save and continue later** (الحفظ والمتابعة لاحقًا), in Settings. When it is on, the visitor's answers are kept in their own browser (localStorage) as they fill the form. A reload, a closed tab or a crash doesn't lose them.

A short note sits above the form:
- while filling: "Your answers are saved on this device until you send the form.";
- on return: "Welcome back! Your saved answers were restored.";
- with upload fields, it adds: "Files aren’t saved; choose them again before sending." Files can't be kept this way.

A **Clear saved answers** button appears once something is kept. It forgets the answers, starts the form over and announces "Saved answers cleared."

The answers are removed when the form is sent:
- with a submit URL, only once the server accepted it (2xx). After a failed send they stay;
- without one, on a valid submit.

Changing an answer afterwards keeps the answers again. Going back to the starting answers (a reset, or undoing every change) removes them.

Texts are in English and Arabic (`draftOn`, `draftRestored`, `draftNoFiles`, `draftClear`, `draftCleared`).

### How it works

**Storage.** One entry per form, `formsgen:<meta.name>:draft`, holding `{"v": version, "data": answers}`. The version is a hash of the form's data shape (field names, types and nesting; labels don't count) plus the writer: `lib`, `vue`, `react`, `html` or `blazor`. A draft saved before the form changed, or by another kind of export on the same site, is ignored rather than forced into a different shape. Storage that is missing, blocked or full is ignored, and the form works as before.

**When it saves.** On every change, skipping writes of unchanged text. Answers equal to the starting ones remove the entry instead.

| Runtime | Saved | Restored |
|---|---|---|
| Renderer (`FormsGenForm`) | Its data, files left out (`draftJson`) | At setup, then `update:modelValue` once mounted. Prop `draftStorage` picks the storage: omitted means localStorage, `null` keeps nothing. The builder preview passes memory storage, so it never writes to the builder's localStorage |
| Vue | `form`, files left out | After mount |
| React | `form`, files left out | In an effect after mount, so there is no server/client mismatch. The pre-restore state's save is skipped (safe under StrictMode) |
| HTML | Every control's value by id (checked for boxes, chosen options for multi-selects), the phone country, each list's item count, and the tags/dates chips | Items are added first (outer lists before inner ones), then controls are set, then input events fire so sliders, conditions, calculations and answers catch up. Saving runs at the end of `updateConditions()` |
| Blazor | The model through System.Text.Json; upload lists are written as `[]` (`FgNoFiles` converter) | After the first render through `IJSRuntime` (`localStorage.getItem`/`setItem`/`removeItem`). Later renders save when the JSON changed |

The renderer's draft API (`draftVersion`, `draftJson`, `readDraft`, `writeDraft`, `removeDraft`, `memoryStorage`, `browserStorage`) is exported.

### Fixes found along the way

- **Blazor:** the two-handle slider's display-only properties (`ShownFrom`, `ShownTo`, `Version`) are now `[JsonIgnore]`. They change on every new model and would make two equal models differ.
- **Blazor:** reset buttons now recompute calculated fields (`FgCalc()`) after the fresh model.

### Verification (32c)

**`pnpm verify`** passes with **465 tests** (170 renderer / 295 builder). New coverage:
- the draft version (labels ignored; names and types count);
- files left out;
- storage that throws;
- a renderer form that saves as answers change, forgets them when back at the start, restores and clears, ignores another version's draft, forgets after a valid submit, keeps again after a failed upload, and says files aren't kept;
- the JS storage helpers;
- each target's output, including forgetting only after a 2xx response;
- the restored-phone country helper.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build pass with 0 errors and 0 warnings, for two demos:
- one with a submit URL and an upload field;
- one with no URL and a reset button.

**12 runtimes, all identical.** The demo has text, email, select, radio, a checkbox with a conditional textarea, a checkbox list, a multi-select, a number, a two-handle slider, a date range with calculated nights, multiple dates, tags, a phone with country, a matrix, a repeater with two guests, and a file. The scenario:
1. Fill everything and reload. Every answer, chip, item, slider position, phone country and the conditional field come back, without the file. The note says "Welcome back!".
2. A send the server rejects (500) keeps the answers.
3. An accepted send removes them; the note goes back and the button hides.
4. Change an answer: kept again.
5. **Clear saved answers**: removed, the form is back to the start with one guest, "Saved answers cleared." is announced, and a reload restores nothing.

**HTML reset check:** the no-URL demo's reset button removes the answers. A valid submit removes them too.

**Fix found along the way:** a restored phone number showed "+447700900123" under the default country in Vue, React and Blazor. The chosen country isn't part of the answer. When none was picked, the country is now taken from the number's code (the field's own country first), via `fgPhoneFrom` / `FgPhoneCountryOf`.

**Builder:** the Settings switch and its hint; the preview shows the note and the clear button and keeps preview answers in memory only. Nothing is written to the builder's own localStorage.

