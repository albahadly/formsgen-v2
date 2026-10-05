# Phase 28 — Finishing repeating sections

## Status

- **28a:** every field type inside repeater items, and reordering items (move up / move down). Commit: feat(phase-28a).
- **28b:** repeaters inside repeaters (two levels), and groups/columns inside items. Commit: feat(phase-28b).

Still parked: npm publish.

## 28a — what was built

### Every field inside items

Repeater items used to accept only simple fields. They now take **every field and static element**:
- tags;
- file and image uploads;
- the two-handle range slider, date range and multiple dates;
- matrix;
- phone with the country selector.

Containers (group, columns, tabs/steps, another repeater) are still rejected by the parser and the builder; 28b adds them.

Each item keeps its own state:
- the chosen country;
- tag and date drafts;
- picked files.

That state follows its item when an item above is removed or items are reordered.

**Validation.** Item fields get the same built-in checks as top-level fields: an upload's count, type and size, and a date range's end not before its start.

**Files in items.** In the multipart submission, each file is its own part, named by its data path with the item index, e.g. `crew.0.cv`. The JSON part lists each file as `{ name, size, type }`.

### Reordering (`props.sortable`)

**Builder.** A new repeater option, "Let people reorder items" (السماح بإعادة ترتيب العناصر), off by default.

**Buttons.** When it is on, each item gets **↑ / ↓** buttons:
- They are named "Move Member 2 up" / "Move Member 2 down" (en/ar).
- The first item has no ↑ and the last has no ↓.
- The Remove button still respects the minimum item count.

**Moving.** A move swaps the item with its neighbour. Values, errors and touched state, and per-item state (country, drafts, files) all go with it.

**Focus** stays on the moved item: the same button if the item still has it, else the other one. The move is announced: "Member 3 moved to position 2" (en/ar).

### How the exports do it

**Shared.**
- `collectTemplateFields` lists top-level fields plus item fields by template path (`crew.cv`), so per-type helper tables include item fields.
- At run time, `fgTpl` maps an item path (`crew.2.cv`) back to its template path.
- The item validators now include the built-in checks. The date-order check moved into a typed runtime helper, `fgDateOrder`.

| Target | How |
|---|---|
| Vue standalone | Path-based `fgGet`/`fgSet` replace the per-field getter tables. Drafts and chosen countries are stores keyed by field path. `fgRemapItems` re-keys them, along with errors and touched state, on remove and move. `fgPhoneCountryOf` falls back to the field's default by template path. |
| React | Same idea through state setters (`fgRemapStore`). The item-key list is swapped on a move; pending focus remembers the moved item's button. |
| HTML | Per-type wiring is now `fgWire(root)`: run for the page, then for each new item clone. Handlers read the element's current path when they fire. The `fgTags` / `fgDates` / `fgFiles` stores are re-keyed on remove and move. Re-indexing stamps items through a temporary index in two passes. |
| Blazor | Inside items, member keys become per-item keys (`FgItemKey(item, "CrewIPhone", "Phone")` → `"CrewIPhone#3"`), so `FgChanged` notifies the item's field. Drafts, countries and file-input keys live in `FgStore<T>`, a dictionary with a fallback for unseen keys. Item payloads use the same per-type conversions as top-level fields. A move swaps list entries; focus returns through `@ref`s on the move buttons. |

**Radio group names inside items** now follow the item, not its index:
- renderer: the item's key in the item scope;
- Vue: `fgKeyOf(item)`;
- React: `fgKeyAt(path, i)`;
- Blazor: `FgItemId(item)`.

Index-based names made two items briefly share a group during a move, and the browser cleared one item's answer.

### Fixes found along the way

- **HTML: hidden buttons stayed visible.** In all three frameworks, a class that sets `display` (the actions row, buttons) overrode the `hidden` attribute. The Remove button stayed visible at the minimum item count (clicking it did nothing). The HTML export now ships `[hidden] { display: none !important; }`.
- **Blazor tags didn't re-validate.** Adding or removing a tag never notified the form, so a stale "at most N" error stayed until submit. `FgAddTag` / `FgRemoveTag` now notify the field, top-level and inside items.
- **React/Vue: invalid code for item paths as object keys.** An object key holding an item path (`{ ...d, 'crew.__i__.skills': v }`) produced invalid code. It is now a computed key.

## Verification (28a)

**`pnpm verify`** passes with **387 tests** (132 renderer / 255 builder). New coverage: renderer reordering (values, errors, focus, announcements, radio answers kept), the parser and builder accepting every field in items, and export tests for sortable markup in every target. The kitchen-sink fixture's References repeater is now sortable and has a phone with the country selector.

**Crew demo.** A repeater (min 1, max 3, sortable) holding text, tags, phone with country, range slider, date range, a conditional note, multiple dates, matrix, file and image upload.

**Strict compilers:**

| Check | Result |
|---|---|
| React `tsc` | 0 errors |
| `vue-tsc` | 0 errors |
| .NET 8 build of the Blazor export, all 3 frameworks | 0 warnings / 0 errors |

**Real runtimes.** One scenario ran in **12 runtimes** (HTML, React, Vue, Blazor × vanilla, Tailwind, Bootstrap):
1. Item ids and the country list.
2. Errors on the first submit:
   - too many tags;
   - date range end before start;
   - too many dates;
   - partial matrix;
   - wrong file type;
   - required stay in item 3.
3. Add two members (the new item gets focus; each has its own default country), then remove member 2. Member 3's name, country, phone and error move up.
4. Fix the errors and add files.
5. Add Di (stay empty → error) and move Di up. Country, phone, tags, dates, matrix answers and the error all go with Di. Focus is on Di's ↑ button, and the move is announced.
6. Move Ana down. Her matrix answers, files, budget and note go with her.
7. Submit. The multipart parts are named by Ana's new index (`crew.1.cv`, `crew.1.photo` ×2).

All 12 runtimes produced **identical** results. The data shown on screen equals what the server received.

**Builder Preview** passed the same move check: country, matrix answers, focus and the announcement.

## 28b — what was built

### Layout and one more level inside items

A repeater item may now hold:
- **groups and columns.** They are layout only. A group inside an item can't have a name, so the item's data stays flat. In the builder its Name field is replaced by a short note (en/ar).
- **one inner repeater**, e.g. travellers → bags. Each traveller has its own bags.
  - The inner repeater can depend on its outer item, e.g. show "Bags" only when that traveller ticked "Has bags".
  - Its own fields can depend on their bag's siblings ("Handling note" only for a fragile bag) and on top-level fields.

Still not allowed: tabs/steps inside items, a third level of repeaters, and inner-item conditions on the outer item's fields.

**Where the rules live.** One renderer function, `itemPlacementProblem`, holds them. The parser uses it, and so do the builder's add, drop and keyboard-move checks (`fitsInItems`, `repeaterDepthAt`). The condition picker offers an inner item:
- its own siblings ("Bags › Fragile");
- top-level fields.

**Data.** `travellers: [{ name, has_bags, phone, email, bags: [{ weight, size, fragile, note?, contents }] }]`. A hidden inner repeater is left out of its traveller's payload, and inner errors are part of submit and step gating.

### Renderer

- Item scopes use the template path without indexes (`travellers.bags`), so inner conditions resolve to the right bag.
- Item defaults look through layout containers and hold inner repeaters' initial items.
- Ids carry every index: `fg-weight-1-0`.
- Item keys are unique on the page, so radio group names never collide across travellers.

### Exports

**Shared layer:**
- `collectExportRepeaters` returns outer repeaters before their inner ones. Each has a template path (`travellers.bags`), `depth`, `parent` and `itemConditionChain`; item fields carry their container conditions.
- `ItemAccess` takes a `RepeaterRef`. Inner items are `item2` / `j` inside `item` / `i`; the index tokens are `__i__` / `__j__`.
- The payload, data types and defaults nest.
- Runtime tables are keyed by template path, with `fgTpl` / `FgTpl` at lookup. `fgItemPaths` recurses into inner lists; `FG_INNER_REPEATERS` lists them.

| Target | How |
|---|---|
| Vue / React | Inner `v-for` / `.map` over `item.bags` as `item2, j`. Inner visibility is evaluated per outer item (`fgOuterItem`). React also re-keys inner lists' item keys when outer items move or go. |
| HTML | The inner `<template>` sits inside the outer one. Stamping an outer item also stamps the inner template's content (`fgStampNodes`). A new outer item creates its inner items (`fgInitRepeaters`). Handlers read the current path when they fire. Item conditions and validators get both indexes `(i, j)`. An outer item's own label and buttons are found with `:scope >`. |
| Blazor | The inner list is a property of the outer item class (`List<FgTravellersBagsItem> Bags`). The outer item's markup pass rewrites both levels: `item2.X`, `item.Bags`, `{i}` / `{j}` ids. An outer repeater validates, counts and gates its inner items per visible outer item. Add-button refs are a dictionary keyed by list path. |

### Fixes found along the way

- **Blazor radio groups inside items shared one name.** `InputRadioGroup` without `Name` derives it from the bound expression (`item2.Size`). Every item's group was one group, so only one item could hold an answer. Radio groups now get an explicit `Name`, which follows the item inside repeaters (`FgItemId`).
- **HTML: automatic semicolon insertion.** A generated line starting with `[` continued the previous statement (`Object.keys(...)["travellers"]`). Those lines now start with `;`.

## Verification (28b)

- **`pnpm verify`** passes with **394 tests** (134 renderer / 260 builder). New coverage:
  - parser nesting rules;
  - item defaults through layout;
  - a nested renderer form: conditional inner repeater, unique ids, inner conditions, nested payload;
  - builder add/drop rules, the layout-only note and nested condition sources;
  - export structure (types, defaults) and nested markup in every target;
  - the Blazor radio group name.
- **Trip demo:**
  - travellers (sortable, min 1, max 3) with name and has-bags in columns, and a Contact group with phone (country) and email;
  - bags (sortable, min 0, max 2) shown only for travellers with bags;
  - each bag has weight (kg, max 32) and size in columns, fragile, a conditional handling note, and content tags (max 2).
- **Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build of the Blazor export all pass for all 3 frameworks, with 0 errors and 0 warnings.
- **12 runtimes:**
  - bags hidden until ticked;
  - inner ids;
  - inner errors: max weight, required size, conditional note, too many tags;
  - add bag (focus, max);
  - a second traveller with its own bags and country;
  - fixes;
  - move traveller 2 up (their bags, country and answers go with them);
  - move a bag up within a traveller;
  - untick "Has bags" (those bags leave the payload);
  - submit.
- **Builder Preview:** the same nested moves, plus the canvas showing both levels.

## Backlog

- Drag-and-drop reordering (the buttons are the accessible baseline).
- Conditions in an inner item on the outer item's fields; a third level of repeaters.
- Named groups inside items (nested item objects).
