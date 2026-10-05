# Phase 28 — Finishing repeating sections

## Status

- **28a:** every field type inside repeater items, and reordering items (move up / move down). Commit: feat(phase-28a).
- **28b:** repeaters inside repeaters, and groups/columns inside items. Not started yet.

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

## Backlog

- 28b: repeaters inside repeaters; groups and columns inside items.
- Drag-and-drop reordering (the buttons are the accessible baseline).
