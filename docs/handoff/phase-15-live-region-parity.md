# Phase 15 — aria-live announcements + cross-target validation parity

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-15)). Still parked per user direction: publishing `@albahadly/formsgen-renderer` to npm.

## What was built

- **Polite live region in every target** (`role="status" aria-live="polite" aria-atomic="true"`, visually hidden). It announces:
  - a failed submit: `"6 errors. Please fix the highlighted fields."` (singular `"1 error. …"`);
  - a successful submit: `"Form submitted."`;
  - wizard navigation on Next/Back: `"Step 2 of 3: Payment"`.
  The submit-time jump to the erroring step is deliberately silent, so it never talks over the error count.
- **One source for the wording**: `packages/renderer/src/announcements.ts` (`errorsAnnouncement`, `SUBMITTED_ANNOUNCEMENT`, `stepAnnouncement`, exported from the package). The export generators build their strings from those same functions (`apps/builder/src/export/announce.ts` for the JS targets, inline `csStr(...)` for Blazor), and the target tests assert the exact renderer strings appear.
- **Re-announcing**: every implementation clears the region and sets the text on the next tick (Vue `nextTick`, React `setTimeout` 50 ms, HTML `setTimeout` 50 ms, Blazor `StateHasChanged` + `Task.Delay(50)`), so a second identical failed submit is spoken again. This was verified with a MutationObserver in the browser: `"" → "6 errors…"`.
- **Renderer**: `FormContext.announce?()`; `FormsGenForm` owns the region (`data-fg-live`); steps use `goToStep()` for Next and Back.
- **CSS**: a new `srOnly` slot — `fg-sr-only` in vanilla (in both the export stylesheet and renderer `styles.css`), `sr-only` in Tailwind, `visually-hidden` in Bootstrap 5.
- **HTML runtime**: `fgSetSec(meta, index, speak)` only speaks on user navigation, never on the initial render or the jump. Step strings travel in `FG_SECTIONS[].announce`, and that JSON now escapes `<` as `<`, so a step label containing `</script>` cannot break out of the inline script (tested).

## Bugs found and fixed (surfaced by comparing live error counts between exports)

The HTML export reported 5 errors and the Blazor export 6 for the same journey. Investigation found three real defects, all fixed and covered by regression tests:

1. **HTML select silently pre-selected the first option.** Browsers skip a `disabled` option for default selection, so a required select passed with no user choice. The HTML emitter now marks the placeholder `disabled selected`. The bound targets (Vue, React, Blazor) never had the problem.
2. **Blazor rejected empty optional URL/email/min-length fields.** .NET's `[Url]`, `[EmailAddress]` and string `[MinLength]` treat `""` as invalid (only `null` passes), so a form with an optional URL field could never be submitted empty. Non-required string fields with those rules now validate in `Validate()`, where every rule is guarded by the empty check. Required fields keep their attributes, because `[Required]` short-circuits the rest.
3. **Blazor hid model-level errors (e.g. a required "I accept the terms" checkbox) until every attribute error was fixed.** DataAnnotations only calls `IValidatableObject.Validate()` once all attribute rules pass. The form now always owns its `EditContext` and submits through `OnSubmit="FgSubmit"`: it runs `context.Validate()`, and if that fails it also runs `Validate()` and adds its results to the component's `ValidationMessageStore`, so all errors show at once.
   - Related phase-14 leftover, also fixed: `OnFieldChanged` now clears that store per field, so a step-gating error disappears as soon as the user fixes the field, instead of lingering until the next click.

## Verification

- `pnpm verify`: lint, typecheck, **182 tests** (61 renderer / 121 builder), both builds. The axe smoke tests still pass with the region present.
- **.NET 8, real toolchain**: `dotnet build` of the regenerated kitchen-sink component gives 0 warnings and 0 errors; driven live over an Interactive Server circuit.
- **Parity journey in Chromium (HTML export vs live Blazor)**: an empty submit lists the identical 6 fields with the identical announcement in both. Filling only the required fields (optional Website left empty) gives `"Form submitted."` in both. Next/Back announce `"Step 2 of 2: Review"` / `"Step 1 of 2: Shipping"`. The Blazor step error clears after the fix.

## Not done / backlog

- **`@albahadly/formsgen-renderer` npm publish — parked by user.**
- Built-in texts (validation defaults and announcements) are English only. A localized message table keyed by `meta.locale` (en/ar first) would make Arabic forms fully native. Today, authors localize validation through per-rule custom messages, but there is no override for announcements yet.
- Blazor tags: Enter adds the tag but may also submit the form (documented in phase 14).

## Gotchas

- `pkill -f <pattern>` matches the invoking shell's own command line and kills it (exit 144). Stop the proof server with `kill $(pgrep -x FgProof)`.
- The Blazor proof project lives in the session scratchpad (`blazor-proof/FgProof`). Re-create it with `dotnet new blazor -n FgProof --no-https` and put `<KitchenSinkForm @rendermode="InteractiveServer" />` on Home.
- When comparing targets, compare the **set of erroring fields**, not just the count. The count matched by coincidence once during this investigation, while the sets differed.
