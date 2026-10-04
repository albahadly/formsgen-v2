# Phase 05 — Nested drag-and-drop, tree sidebar, duplicate, keyboard

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-05)).

## What was built

- **Nested drag-and-drop** via `vuedraggable@next` (group `canvas`): palette items are drag sources (`pull: 'clone'`, clone = `createNode`); the canvas root and every container render drop lists. Shared wiring in `components/canvas/useDropList.ts` — the lists bind `v-model` to a computed whose setter calls `store.setChildren(parentId, nodes)`, so DnD stays store-mediated (ready for history in phase 6).
- **Drop guards** in the store (`stores/builder.ts`): `canDropInto` rejects dropping a node into itself/its own subtree and anything that would exceed `MAX_NESTING_DEPTH = 5` (`containerDepth` + `subtreeHeight` helpers, exported and unit-tested). Wired to SortableJS via the `:move` callback; each drop list carries `data-parent-id`.
- **Duplicate** — `store.duplicateElement(id)`: JSON deep clone with fresh nanoid ids and re-uniqued `name`s at every level, inserted after the source, selected. Chrome button (⧉) + Ctrl/Cmd+D.
- **Tree sidebar** — `components/tree/TreePanel.vue`: flattened outline (type label + `name`, indent per depth), click-to-select, selection highlight; toggled by a header button (`tree-toggle`).
- **Keyboard on the canvas** (`CanvasPanel.onKeydown`, canvas div is `tabindex="0"`): Delete/Backspace removes, Ctrl/Cmd+D duplicates, Esc deselects, ArrowUp/Down walk the flattened tree. Keys are ignored when focus is in an input/textarea/select.
- **Tests** — 74 total (41 renderer / 33 builder). New: setChildren, duplicate, subtree/depth math, drop-guard cases, duplicate-via-chrome, keyboard flows, tree outline.
- **Real-browser DnD verified** with Playwright against the dev server: palette→nested-container drop and nested→root move both work (jsdom cannot exercise SortableJS — see gotchas).

## What was intentionally NOT done

- Tree sidebar drag-to-reorder → deferred (canvas DnD covers reordering; add to the tree later if users ask). REBUILD_PROMPT mentions it; recorded as consciously deferred, not forgotten.
- Keyboard "move into/out of container" (a11y alternative to DnD) → phase 11 a11y pass; arrows currently only move SELECTION.
- Click-to-add into a selected container (phase 4 mechanism) still works and remains the keyboard path for adding.
- Undo for drops → phase 6 (history).

## Key decisions & why

- **All DnD mutations flow through `store.setChildren`** (v-model computed, not `:list` in-place mutation) — one choke point for phase 6's history wrapper.
- **Drop rules live in the store module, not components** — testable in jsdom and reusable by the future keyboard-move implementation.
- **JSON clone (not `structuredClone`) for duplicate** — Vue reactive proxies throw `DataCloneError` in structuredClone. Rule of thumb: structuredClone only for plain non-reactive objects.
- **Target parent for the move guard comes from `data-parent-id` on each drop list** ('' = root) — avoids any reliance on SortableJS internals.

## How to verify

```bash
pnpm verify   # 74 tests green
pnpm dev      # in the browser:
```

1. Drag "Text Input" from the palette onto the canvas; drag a Group (Structure tab) in; drag more fields INTO the group; reorder by dragging; drag a nested field back out.
2. Try dragging a group into its own child area → drop indicator refuses.
3. Hover chrome: ⧉ duplicates (names get `_2` suffixes), ✕ deletes. With the canvas focused: Ctrl/Cmd+D, Delete, Esc, Arrow keys.
4. Header "Outline" button shows the tree; clicking rows selects on the canvas.

## Known issues / gotchas

- **jsdom cannot test SortableJS** — drops are covered by store/guard unit tests plus the Playwright script (`dnd.mjs` pattern in the phase-04 handoff's Playwright note). Re-run such a script when touching DnD wiring.
- `useDropList.list` getter walks the tree per access; fine at form scale.
- The palette's `draggable` wraps items in `<li>` via the item slot — keep the footer slot for the empty-state row.
- vuedraggable emits list updates on BOTH source and target lists on cross-list moves; `setChildren` is idempotent per list, so order of events doesn't matter.

## Pointers for the next phase (06 — history, autosave, save/open)

- Wrap store mutations for undo/redo: with Pinia, the cleanest fit here is snapshot-based history via `store.$subscribe` or an explicit `commit()` in each action — SNAPSHOT the schema (JSON) with a depth limit ≥ 50 (REBUILD_PROMPT §6). One drag = one entry: debounce consecutive snapshots within a tick.
- Keyboard: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z — put alongside the existing canvas handler but likely on `window` with the same input-focus guard, since undo should work while the properties panel has focus.
- Autosave: debounced 500ms to `localStorage` (`formsgen.project.v1` key), restore on load with a toast + "start fresh"; wrap reads/writes in try/catch.
- Save/open: download `<meta.name>.formsgen.json`; open runs `parseFormSchema` and reports errors to the user (the parser's path messages are user-readable).
- `store.reset()` already exists for "start fresh".
