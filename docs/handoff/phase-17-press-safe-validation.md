# Phase 17 — Press-safe blur validation (no more lost clicks)

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-17)). Still parked per user direction: publishing `@formsgen/renderer` to npm.

## The bug

Fields validate on blur. Pressing the mouse on a button or checkbox blurs the field you were typing in, and its error message is inserted *while the button is still held*. Everything below that field moves down 20–30px. The release lands on a different spot, so the browser fires no click: Submit, Next or a checkbox silently does nothing.

- It reproduced with a person-like click (press, hold ~120 ms, release) in the HTML and Blazor exports: a checkbox below an invalid field didn't toggle.
- It only shows when the page **isn't scrolled** (the common case for a short form). When the page is scrolled, the browser's scroll anchoring hides the shift — which is why a 1000px-tall test window didn't reproduce it.

## The fix (all five runtimes)

While a pointer press is in progress inside the form, a field's blur validation is **held back**. It runs right after the press ends — after the click has been dispatched on the unmoved target. Without a press (keyboard, tabbing) nothing changes: errors still appear immediately on blur. The visual design is unchanged (the alternative, reserving an empty line under every field, was rejected because it changes every form's look).

| Runtime | How |
|---|---|
| Renderer (`FormsGenForm.vue`) | `@pointerdown.capture` on the form sets `pressing`; `context.touch()` queues paths while pressing; `window` `pointerup`/`pointercancel` flush on `setTimeout(…, 0)`. A new press flushes anything stale first. |
| Vue standalone | Same, in generated `touch()` (`fgPointerDown` / `fgPointerEnd` / `fgFlushDeferred`, window listeners via `onMounted` / `onBeforeUnmount`). |
| React | Same via refs: `onPointerDownCapture`, a `useEffect` registering window listeners, and a `fgFlush` ref that validates against `formRef.current`, so deferred work never sees a stale closure. |
| HTML | `fgBlurValidate(path)` used by `focusout` and the tags input's blur; capture-phase `pointerdown` on the form; window `pointerup`/`pointercancel`. |
| Blazor | See below. |

### Blazor: the component now validates itself

`DataAnnotationsValidator` re-validates the moment a field changes and offers no hook to postpone that. It is replaced by the component's own pipeline, which uses the **same .NET calls**:

- `FgValidateMembers(string[] names)` runs `Validator.TryValidateProperty` per member (values come from a generated `FgValue(name)` switch — compile-checked, no reflection), plus the model's `IValidatableObject.Validate()` results filtered to those members. It feeds the existing `ValidationMessageStore`, so `ValidationMessage` components work unchanged.
- `OnFieldChanged` → `FgFieldChanged(name)` (deferred while pressing) · `OnValidationRequested` → `FgValidateAll()` · Next → `FgValidateMembers(step members)` · `FgSubmit` → `context.Validate()`.
- The pointer state arrives through Blazor events on a wrapper `<div style="display: contents">` (no box, so no layout impact) inside the `EditForm`: `@onpointerdown`, `@onpointerup`, `@onpointerleave`, `@onpointercancel`. Blazor delivers events in order (pointerdown → change → pointerup → click), so the change is deferred and the click is already targeted client-side before the re-render arrives.
- Side benefit: model-level rules (conditional fields, the required checkbox, optional URL/email/min) now also validate when their field changes, matching the renderer, instead of only at submit.

## Verification

- `pnpm verify`: **208 tests** (74 renderer / 134 builder). New tests:
  - renderer: an error is held back during a press and appears after release; immediate validation without a press;
  - per-target structure tests for the press deferral in all four exports;
  - the Blazor tests now describe the new pipeline (no `DataAnnotationsValidator`; `FgValue` switch; pointer wrapper).
- **Real browsers / runtime** — person-like clicks in Chromium against the HTML export, the React export (bundled with React 18 via esbuild) and the Blazor export (.NET 8, `dotnet build` 0 warnings / 0 errors, live Interactive Server):

  | Check | HTML | React | Blazor |
  |---|---|---|---|
  | Target moves while held (unscrolled and scrolled page) | 0px | 0px | 0px |
  | Submit click handled | ✓ | ✓ | ✓ |
  | Checkbox below an invalid field toggles | ✓ (was ✗) | ✓ | ✓ (was ✗) |
  | Error held during the press, shown after release | ✓ | ✓ | ✓ |
  | Tab away → error immediately; fixing clears it | ✓ | ✓ | ✓ |

- **No regression in parity:** the phase-15 journey still gives HTML and Blazor identical error sets ("6 errors"), the same announcements, a successful submit with the optional Website empty, and the Blazor step error clearing on fix.
- The Vue standalone export uses the same logic as the renderer; it was checked structurally (it isn't bundled for a browser run here).

## Gotchas

- When reproducing layout-shift bugs, use a viewport where the page doesn't scroll: scroll anchoring masks shifts above the viewport.
- In Blazor, re-entering a field and restoring its original value fires no `change`, so no validation runs (standard DOM behavior). Pick probe values that actually change.
- If a press starts in the form and is released outside the browser window, the HTML/JS targets still receive `pointerup` on `window`; Blazor uses `@onpointerleave` on the wrapper. In every target, a new press or a submit flushes anything left pending.

## Backlog

- **`@formsgen/renderer` npm publish — parked by user.**
- Other items from the phase-16 "Not done" list are unchanged.
