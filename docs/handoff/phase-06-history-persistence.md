# Phase 06 — History (undo/redo), autosave, save/open

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-06)).

## What was built

- **History** — `stores/history.ts`: snapshot-based undo/redo over `builder.schema` (selection changes never create entries). A deep watcher + 120ms debounce batches rapid mutations (one drag = two `setChildren` = ONE entry). Stack capped at `HISTORY_LIMIT = 50`. `undo()` flushes any pending edit first; `apply()` suppresses tracking while writing and drops the selection if the node no longer exists. `reset()` re-baselines after project open / draft restore. Keyboard: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z on `window` (guarded against input/textarea/select focus). Toolbar buttons with disabled states.
- **Autosave** — `composables/persistence.ts`: debounced (500ms) write of the schema to `localStorage` (`formsgen.draft.v1`); every storage access is try/catch-wrapped; `readDraft()` validates via `parseFormSchema` and ignores empty trees; `clearDraft()`.
- **Draft restore** — `App.vue`: restores the draft BEFORE `history.start()` (so undo can't cross into pre-restore state) and shows a toast with "Start fresh" (reset + clear draft) / "Keep draft".
- **Save/Open** — `components/toolbar/AppToolbar.vue`: Save downloads `<meta.name>.formsgen.json`; Open reads a file, runs `parseFormSchema`, loads via `builder.loadSchema` + `history.reset()`, and surfaces the first parse error through a notice toast on failure. `builder.loadSchema(schema)` added to the store.
- **Tests** — 84 total (41 renderer / 43 builder). New: 6 history tests (undo/redo, batching, redo-clearing, selection drop, cap, selection-only no-ops) and 4 persistence tests, all on fake timers.

## What was intentionally NOT done

- Project-file versioning/migration (only `formsgen/v2` exists; the parser already rejects other `$schema` values).
- Draft restore has no diff/preview — it just loads; acceptable while drafts are single-user local.
- Undo history is NOT persisted across reloads (by design — the draft is).
- Toolbar Save/Open have no tests for the download/file-picker DOM plumbing (jsdom can't exercise them meaningfully); `loadSchema` + parser + history.reset are covered via store/unit tests.

## Key decisions & why

- **Snapshot history (JSON strings) over patch-based**: the schema is small (forms, not documents); snapshots are trivially correct across EVERY mutation path including drag-and-drop, which patch recording would have to instrument case by case.
- **Debounce window (120ms) defines an "edit"**: typing in the properties panel coalesces per pause; a drag's double event becomes one entry. If finer granularity is ever wanted, commit explicitly from specific actions instead of shortening the window.
- **History watches the SCHEMA only** — `selectedId` is ephemeral UI state. Restored snapshots keep the selection when the node still exists.
- **localStorage is a convenience, not the store of record** (REBUILD_PROMPT storage rules): all reads/writes guarded, the durable format is the project file.

## How to verify

```bash
pnpm verify   # 84 tests green
pnpm dev      # in the browser:
```

1. Add/edit/drag elements → Undo steps back exactly one user action at a time; Redo returns; a new edit after Undo kills Redo. Ctrl/Cmd+Z / +Shift+Z work anywhere except while typing in a field.
2. Build a form, reload the page → "Restored your unsaved draft" toast; "Start fresh" empties the canvas and the draft.
3. Save downloads `untitled_form.formsgen.json`; Open restores it (try hand-breaking the JSON → red error toast with the parser's message).

## Known issues / gotchas

- Fake-timer tests: `history.start()`'s watcher fires on Vue's microtask flush — use `vi.advanceTimersByTimeAsync` (async variant), or the watcher callback never runs.
- `history.apply()` lifts its guard in a `setTimeout(0)`; any still-pending debounce then no-ops because the snapshot equals `current`. Don't "simplify" the equality check away.
- The restore toast can sit over the canvas bottom — fine now; revisit with phase 7's toolbar layout.

## Pointers for the next phase (07 — preview/code/device/theme toolbar + form settings)

- View modes: editor (current canvas) / preview (`FormsGenForm` with the REAL schema — everything exists already, including submit payload display) / code (read-only highlighted JSON — add `highlight.js` or `shiki` to the builder only, NOT the renderer).
- Device widths: constrain the canvas wrapper (`max-w` swap: 375px / 768px / 100%); theme toggle sets `data-fg-theme` on the preview form (renderer already honors it — see phase-03 styles).
- Form settings dialog edits `schema.meta` (name slug-validated like element names, title, locale, dir, submit config, theme tokens with color inputs). meta edits go through a new store action so history captures them.
- `meta.dir` already flows to `<form :dir>` in the renderer; the builder shell itself stays LTR until phase 11's RTL pass.
