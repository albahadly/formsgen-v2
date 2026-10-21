# Phase 14 — Blazor parity: multi-value controls, step gating, error jump

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-14)). Still parked per user direction: publishing `@albahadly/formsgen-renderer` to npm.

## What was built

- **Multiselect** — `<InputSelect multiple @bind-Value>` bound to a NEW C# kind `array` (`string[]`, init `Array.Empty<string>()`); `InputSelect` binds arrays natively in .NET 6+. `csharp.ts` gained the `array` kind (empty = `.Length == 0`, size = `.Length`, attributes → `Validate()` like `list`).
- **Checkbox group** — plain checkboxes wired to a generated `FgToggle(List<string>, string, ChangeEventArgs)` helper; `checked='@Model.X.Contains("v")'` (single-quoted Razor attributes so the C# string literals survive HTML attribute parsing).
- **Tags (chips)** — Razor `@for` loop over the list (chips with remove buttons, loop variable copied per iteration for the closure), draft input `@bind='fgTagDrafts["key"]'` + `@bind:after='() => FgAddTag(list, "key")'` (.NET 7+). Adds on input commit (blur/Enter); trim + de-dupe; draft reset forces the DOM input clear (plain `value=""` would NOT clear it — Blazor diffing skips unchanged attributes). `fgTagDrafts` is seeded per tags field at generation so the indexer never throws.
- **Per-step validation gating** — the component now creates its own `EditContext` + `ValidationMessageStore` whenever section hosts exist (`<EditForm EditContext="fgEdit" …>`); Next calls a generated `FgNext_<key>()` that validates ONLY the current step's members via `Validator.TryValidateProperty` (attribute rules) plus the model's `IValidatableObject.Validate()` filtered to those members (conditional rules), publishes messages to the store, and advances only when clean. `fgEdit.OnValidationRequested += clear` drops stale step messages when the full submit validation runs.
- **Submit error auto-jump** — `OnInvalidSubmit="FgJumpToError"`: per host (tabs AND steps), if the active section has no validation messages but another does, jump to the first offender. Member lists are generated as `static readonly string[][] fgSecMembers_<key>`.
- **Bug found by the real compiler (pre-existing)**: a numeric field with both `min` and `max` rules emitted TWO `[Range]` attributes — CS0579 (not AllowMultiple). `csAttributes` now routes numeric fields with >1 of min/max/between to `Validate()`, keeping both messages.
- **Tests — 170** (58 renderer / 112 builder); new blazor-parity describe block (InputSelect multiple + string[], FgToggle markup+helper, fgTagDrafts binding, no unsupported-comments remain, EditContext/FgNext/TryValidateProperty, fgSecMembers + FgJumpToError); 3 Blazor snapshots regenerated twice (parity + Range fix).

## Verified against the REAL .NET toolchain (first time for this target)

`dotnet-sdk-8.0` (apt) + `dotnet new blazor` (Interactive Server), generated `KitchenSinkForm.razor` + scoped css dropped into `Components/`, `<KitchenSinkForm @rendermode="InteractiveServer" />` on Home:

- `dotnet build` → **0 warnings, 0 errors** (after the Range fix the build caught).
- Driven live in Chromium over the Blazor circuit: checkbox group toggles persist, multiselect selects multiple options, chips add on commit / ignore duplicates / remove by button, Next blocked with the required-field message while `shipping_city` empty, advances after filling. Screenshot in session log.

## What was intentionally NOT done (remaining backlog)

- **`@albahadly/formsgen-renderer` npm publish — parked by user.**
- Blazor tags don't add on Enter-without-submit: conditional `preventDefault` needs JS interop, which the zero-dependency export avoids. Enter commits the draft (tag IS added) but may also trigger EditForm submit — standard Blazor behavior, noted in the generated README.
- `aria-live` announcement region (all targets).

## Key decisions & why

- **`string[]` for multiselect vs `List<string>` for checkboxgroup/tags**: `InputSelect multiple` requires array binding; the toggle/chips patterns want mutable `List<string>`. `CsFieldKind` keeps them distinct (`array` vs `list`).
- **Explicit EditContext only when section hosts exist** — simple forms keep the plain `Model=` EditForm, minimizing generated surface.
- **`TryValidateProperty` + filtered `Validate()`** instead of validating the whole model per step: whole-model validation would flag later steps' fields early.
- **Generated member switch (`nameof(...)`) over reflection** — compile-time safe, AOT-friendly, and the compiler verifies every member name.

## Gotchas for the next phase

- Install the SDK to re-verify: `apt-get update && apt-get install -y dotnet-sdk-8.0`; `dotnet run` ignores `ASPNETCORE_URLS` in dev (launchSettings wins) — read the port from the log.
- Razor attributes holding C# with double-quoted strings MUST be single-quoted attributes.
- `@bind:after` lambda syntax requires .NET 7+; the export targets .NET 8.
- The duplicate-attribute trap generalizes: any future rule that maps to a non-AllowMultiple attribute needs the same ">1 → Validate()" guard.
