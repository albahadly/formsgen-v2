# Phase 33: builder on phones, sample server, drag to reorder, multi-file drops

## Status

Four backlog extras. Commit: feat(phase-33).

No schema change, so there is no ADR row. New texts (en/ar): `oneFileOnly`, `dragItem` (renderer messages), and builder strings for the phone tabs, the export option and the Settings shortcut.

## 33a: the builder on phones

Below 768px the builder shows one panel at a time, picked in a bottom tab bar: **Elements · Outline · Form · Properties** (en/ar).
- **Header.** Its buttons scroll sideways instead of overflowing; labels stay on one line; the renderer version hides.
- **Adding.** Tapping a palette element adds it and goes back to the form with it selected.
- **Editing.** A selected element shows **⚙ Edit**, which opens Properties.
- **Moving.** Canvas lists start dragging only after a press-and-hold on touch (`delay: 250`, touch only), so the page scrolls normally.
- **Removing tabs/steps.** A tab's or step's remove (×) is always shown on devices without hover.
- **Messages.** Toasts sit above the tab bar.
- **Dialogs.** The export dialog's target tabs scroll sideways.

State lives in the UI store (`narrow`, `mobilePanel`), set from a `(max-width: 767px)` media query. Desktop is unchanged.

**Checked on an iPhone 13 profile (390×844, touch).** The page never scrolls sideways on the empty form, the registration example, Elements, Outline, Properties, Preview, Settings, Examples or Export. Adding returns to the form with the element selected; Edit opens Properties; the new label shows on the form.

## 33b: sample submission server

`packages/submit-server/server.mjs` is one file with no dependencies (Node 20+):

```sh
node server.mjs [--port 4180] [--dir ./submissions] [--origin *] [--max-mb 25]
```

**What it accepts.** POST or PUT on any path stores a submission:
- JSON;
- form-encoded;
- multipart: a `data` part (text, or a JSON blob), plus one part per file named by its data path, as the exports send.

**Where it stores.**
- Each submission goes to `submissions/<id>/submission.json`, plus `files/<n>-<name>`.
- File names are reduced to a safe base name, so `../../x.png` becomes `x.png`.
- The reply is `201 {"ok": true, "id": …}`.

**What it serves.**
- `GET /` is a page listing the submissions (HTML-escaped).
- `GET /submissions` returns them as JSON.
- `GET /submissions/<id>/files/<n>` downloads a file (attachment, `nosniff`).

**Limits and errors.**
- CORS is open, preflight included; `--origin` narrows it.
- Bodies over the limit get 413, bad JSON or multipart 400, other content types 415.

It is for local testing: no authentication or spam checks, as its README says.

**In the builder:**
- The export dialog has a **Sample server** option for code exports. It adds `server/server.mjs` (the package file as it is, through `?raw`) and `server/README.md` to the view and the ZIP. The README says whether the form already posts to it.
- Settings has **Try it with the sample server**, which sets the submit URL to `http://localhost:4180/submit`.

**Note.** Port 4190 is on the browsers' blocked-ports list, so don't use it.

## 33c: drag to reorder items

Items of a **sortable** repeating section can be dragged:
- A ⠿ handle sits beside the move buttons, shown when there are two items or more. It has the tooltip "Drag to reorder" (اسحب لإعادة الترتيب) and is hidden from assistive technology, because the ↑/↓ buttons stay the keyboard way.
- Dropping it on another item moves the dragged item there; the others close up.
- While dragging, the item is faded (`data-fg-drag`). A line shows where it will land: above the target when moving up, below it when moving down (`data-fg-drop`).
- After the drop, the moved item gets focus and "Stop 3 moved to position 1" is announced.
- Errors, touched state and per-item answers follow their items.

**Nested lists stay apart.** A sight can only be dropped among its own stop's sights. Dropping it on a stop does nothing.

**Other drags are left alone.** Drops that aren't item drags, such as files onto an upload inside an item, reach their targets: a drop is only taken while an item of that list is dragged.

| Runtime | How |
|---|---|
| Renderer | `FgRepeater` per list (`moveTo`, `movedIndex`, `FormContext.moveItems` for state) |
| Vue, React | `fgDragStart` / `fgDragOver` / `fgDropItem` / `fgMoveItemTo` on the item fieldsets (export/itemDrag.ts) |
| HTML | `fgWireItemDrag` on each new item; handles hide with one item |
| Blazor | A small script installed once through `IJSRuntime` on the form's root runs the drag and calls `[JSInvokable] FgItemDropped(list, from, to)`. Lists are identified by `data-fg-list` ids |

Native Razor drag events weren't enough for Blazor. A `preventDefault` flag without a handler never reached the browser, so drops were refused. Firefox also needs drag data set in script before it starts a drag.

The component gets `@implements IDisposable` (for the `DotNetObjectReference`) and the `IJSRuntime` injection.

**CSS.**
- Vanilla and the renderer have the handle and drag-state rules.
- Tailwind puts them on the item's classes (`data-[fg-drop=before]:shadow-[…]`).
- Bootstrap gets three rules in its small stylesheet.

## 33d: several files dropped on a one-file field

Browsers reject such a drop outright. Now the **first file is kept**, and the field says "Only one file fits here, so a.pdf was added." (en/ar). The text is also announced and stays until the next pick or removal.
- **Renderer:** `FgFile` handles the drop itself.
- **Vue, React, HTML:** `fgDropFirst` puts the first file into the input through a `DataTransfer` and fires `change`, so the usual pick code runs.
- **Blazor:** the `InputFile` always takes several files. `FgPickFiles` keeps the first for a one-file field and sets the note; no script is needed. As a result, Blazor's file picker also allows choosing several files, with the same outcome and note.

## Verification

**`pnpm verify`** passes: 174 renderer, 302 builder and 5 server tests. New coverage:
- renderer drops;
- renderer drag (marks, move, errors following, focus, announcement, other drags left alone, no handle for one item);
- the export drag helpers against the renderer;
- each target's drag and drop code;
- the JS `fgDropFirst`;
- the sample server under `node --test`: JSON, multipart with files, unsafe names, a JSON-blob data part, form-encoded bodies, the page, preflight, 413/400/415/404, binary parts;
- the export's server files and README.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build pass with 0 errors and 0 warnings, for the demo and the kitchen sink.

**12 runtimes, all identical**, posting to the sample server. The demo has three sortable stops, each with a ticket upload and a nested sortable list of sights. The scenario:
1. Drag Stop 3 onto Stop 1. The marks show mid-drag; the order becomes Sur, Muscat, Nizwa; the item has focus and the move is announced.
2. Reorder sights inside a stop.
3. Drop a sight on a stop: nothing happens.
4. Drag a stop down.
5. Drop two files on the passport field and on a stop's ticket: the first is kept, with the note and the announcement.
6. A new pick clears the note.
7. Submit: the sample server stored the multipart body with the files under their data paths (`passport`, `stops.1.ticket`).

**Builder preview (renderer):** dragging works the same in a real browser, and so does the multi-file drop.
