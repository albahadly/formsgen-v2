# Phase 24 — Repeatable sections

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-24)). Next: phase 25 (file uploads, multipart, approved by user), then phase 26 (range slider, date range, matrix, phone with country). Still parked: npm publish.

## What was built

A **Repeating section** element (`repeater`, Structure tab; en/ar: قسم متكرر). Visitors add or remove items that hold the same fields, e.g. "add another traveller".

- **Data.** An array of item objects, e.g. `people: [{ name, has_passport, passport? }, …]`.
  - Inside an item, data paths carry the index (`people.0.name`).
  - Conditions and same-as rules name siblings by **template path** (`people.has_passport`), which resolves to the *same item*. They may also read fields outside the repeater.
  - A field *outside* can't reference item fields (which item would it mean?). The condition builder only offers siblings (labelled "Travellers › …") inside a repeater, and nothing from inside to outside.
- **Props.**
  - label; item label (`Traveller {n}`, default "Item {n}"); add-button text;
  - `minItems` (default 1: the remove button hides at the minimum);
  - `maxItems` (the add button hides at the maximum);
  - `initialItems` (clamped into the range).
- **Allowed children (v1).** Value fields and static elements. No nested containers or repeaters, and no tags (the parser and the builder's drop rules both enforce this).
- **Accessibility.**
  - Each item is a `fieldset` with a legend ("Traveller 2"), and every item gets unique ids.
  - The remove button's name is "Remove Traveller 2".
  - Adding focuses the new item's first control; removing focuses the item that moved into its place, or the add button.
  - Both are announced ("Traveller 2 added" / "… removed", en/ar).
- **Validation is per item.**
  - A removed item's errors and touched state go away, and later items' errors **move up with them**.
  - Steps gate on the item fields of repeaters inside the current step, and the submit error jump counts them too.

### Per target

| Target | How |
|---|---|
| Renderer / Vue library / builder Preview | `FgRepeater` + `FgRepeaterItem`. Each item provides an `ITEM_SCOPE` (template → item path, unique ids). The runtime walkers expand items and resolve scoped lookups. `context.shiftItems` re-indexes touched state and errors. |
| Vue standalone | `v-for="(item, i) in form.people"`; fields bind `item.x`; paths `'people.' + i + '.x'`; `fgItemValidators`; typed `FormData` with `Array<{…}>`; `fgAddItem` / `fgRemoveItem`. |
| React | `form.people.map((item, i) => …)`. Stable keys come from a per-repeater key list, because `setField` clones the form on every edit and object identity can't key items. Uses `fgValidatorFor`. |
| HTML | A `<template data-fg-template>` per repeater. Items are clones with the index stamped into ids and paths, and **rewritten** when an item above is removed. Item conditions use `data-fg-icond`. |
| Blazor | An `FgPeopleItem` class with `List<FgPeopleItem> People`; `@foreach` with `@key` and `@ref`; ids written as `@($"fg_people_{i}_name")`. Item validation is a C# switch over item type and field (`FgItemError`), and field changes dispatch on `FieldIdentifier.Model`. Messages are tied to item objects, so they follow items automatically. |

Shared export layer:
- `collectExportRepeaters`;
- repeater-aware `defaultsObject` / `formDataType`;
- `payloadExpr` and `itemValidatorsLiteral` with a per-target `ItemAccess`;
- the markup walker's `renderRepeater` / `itemOptions`, which render the item template once with an `__i__` index token;
- token transforms per language in `repeaterMarkup.ts`;
- the C# rule checks, factored into `csRuleChecks` (Blazor output byte-identical).

## Verification

- `pnpm verify`: **320 tests** (108 renderer / 212 builder). New coverage:
  - repeater helpers, the parser, and renderer behaviour (limits, focus, announcements, ids, item-scoped conditions, per-item validation, error shift on remove, array payload);
  - builder containment, condition sources, canvas hint, preview;
  - export structure;
  - the output shape of every target;
  - the kitchen-sink fixture now contains a repeater (snapshots and the axe accessibility check cover it).
- **Strict compilers.**
  - TypeScript (`strict`, `noUnusedLocals/Parameters`), React and `vue-tsc`: 0 errors on the repeater demo and on the kitchen-sink exports, all 3 frameworks.
  - Real .NET 8 build of the Blazor export: **0 warnings / 0 errors**, all 3 frameworks.
  - The Razor compiler caught one bug: component parameters reject mixed text and C# (`fg_people_@(i)_name`), so ids are now one interpolated string.
- **Real runtimes.** The same Trip scenario runs everywhere: 2 travellers (min 1, max 3) + a bags repeater inside a wizard step.
  - Checks: start count, add (legend, focus, announcement), max hides the add button, passport only for the traveller who ticked it, step gate on bag weight (required, max 32), invalid submit, remove traveller 1 (errors and passport field move up, focus, announcement), valid submit.
  - All runtimes produced **the identical payload**:

  | Runtime | Result |
  |---|---|
  | Vue standalone (mounted) | pass |
  | React (Chromium) | pass |
  | HTML, Vanilla / Tailwind / Bootstrap | pass ×3 |
  | Blazor (.NET 8) | pass; after an add, focus lands on the new item's group, not its first field (see Gotchas) |
  | Renderer in the built builder (Preview) | pass |

## Gotchas

- **Blazor focus after add:** the new item's `fieldset` (a screen reader announces "Traveller 2, group"). Focusing a control inside a child component needs JS interop, which the export avoids.
- **React list keys:** never key repeater items by object identity, because `setField` structured-clones the form on every change.
- **HTML re-indexing** rewrites only inside the item element, so another repeater whose key ends the same way is never touched.
- **`NodeList` spreading** needs the `DOM.Iterable` lib. Generated code uses `Array.from` so it compiles in any TS config.

## Backlog

- Repeaters inside repeaters, groups/columns inside items, and tags inside items.
- Reordering items (move up/down).
- Repeater-level rules (e.g. "at least 2 items" as a validation message instead of a minimum count).
