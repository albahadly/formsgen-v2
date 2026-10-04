# Phase 09 — React and Blazor export targets

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-09)).

## What was built

- **React target** — `export/targets/react.ts`: standalone `.tsx` (React 18+): generated `FormData` type + initial state, module-scope compiled visibility functions and validators (taking `data: FormData`), immutable `setField` with touched re-validation, submit with full-validation + payload + optional fetch, JSX markup via the shared walker (`className`, `{expr && (...)}` conditionals, JSX comments), typed event handlers (strict-consumer safe). Vanilla mode emits `<Name>.css` and imports it.
- **Blazor target** — `export/targets/blazor.ts`: single `.razor` (.NET 8): `EditForm` + `DataAnnotationsValidator`, a **FLAT** generated model class (one PascalCase property per field) with DataAnnotations where rules map 1:1 and `IValidatableObject.Validate()` for conditional fields and required checkboxes; markup conditions compiled to **C#** `@if` blocks; `BuildPayload()` reconstructs the nested dictionary shape excluding hidden fields; optional `HttpClient` post. Vanilla mode emits scoped `<Name>.razor.css`.
- **C# compiler** — `export/csharp.ts`: attribute builder (Required/MinLength/MaxLength/EmailAddress/Url/RegularExpression/Compare), Validate() statement compiler, condition-to-C# compiler (Equals, Contains, TryParse comparisons), verbatim-string escaping.
- **Plugin-interface extensions** (the generalizations phase 8 anticipated): `visibilityFunctions`/`validatorsLiteral`/`payloadExpr` accept an args string + `visibleCall` factory; `MarkupOptions` gains `wrapConditional`, `classAttr`, `comment`, and `conditionExpr` (for non-JS condition languages). All default to phase-8 behavior — vue/html targets unchanged.
- **Emitters**: `react` and `blazor` added to the four field definitions + shared JSX/Razor helpers (`reactFieldWrap`, `reactControlClass`, `blazorValidationMessage`, `pascalMember`, …).
- **Tests** — 124 total (42 renderer / 82 builder). New: react + blazor snapshots × 3 frameworks; TSX syntax validation via the TypeScript compiler API; structural/idiom assertions (flat model attributes, C# `@if`, conditional payload exclusion, bootstrap idioms, css-file emission).
- **Browser-verified React**: the generated component was bundled with real React 18 via esbuild and driven in Chromium — conditional show/hide, 5 errors on empty submit, regex-on-blur, and a submit payload **identical** to the HTML export and the Vue renderer. Shared semantics across all targets demonstrated end-to-end.

## What was intentionally NOT done

- `dotnet build` smoke test: **no .NET SDK in this container** — explicitly optional per REBUILD_PROMPT §7; Blazor is covered by snapshots + structural assertions. If an SDK appears in CI later, add a job: `dotnet new blazor -o /tmp/bz && cp <Name>.razor* Components/ && dotnet build`.
- React runtime E2E is a manual script (esbuild harness in /tmp), not a CI test — bundling React in CI per run is heavy; the TSX parse check + compile.test behavioral coverage stand in. Revisit if emitters churn.
- `same-as` across different nesting scopes in Blazor uses `[Compare]` with the flattened member name — works because the model is flat; if the model ever becomes nested, move same-as to Validate().

## Key decisions & why

- **Blazor model is FLAT** (AccountUsername, not Account.Username): `DataAnnotationsValidator` does NOT validate nested objects (the `ObjectGraphDataAnnotationsValidator` is experimental), and `[Compare]` needs same-class members. Flat model keeps attribute validation, EditForm and ValidationMessage fully idiomatic; `BuildPayload()` restores the nested shape so the submitted data matches every other target byte-for-byte.
- **Conditional fields' rules go to `Validate()` wholesale** (never attributes): attributes can't be visibility-guarded; mixing per-rule would change evaluation order.
- **Two accessors in React** (`data.x` for pure module functions, `form.x` in JSX) keeps generated functions pure/testable and avoids stale-closure bugs.
- **`markup.ts` got `conditionExpr`** because the walker previously hardcoded the JS condition compiler — the one genuine §7b interface gap this phase exposed; with it, a future target in any language plugs in cleanly.

## How to verify

```bash
pnpm verify   # 124 tests
pnpm dev      # Export dialog now shows 6 targets; check React with
              # Tailwind (single .tsx) and Blazor with Bootstrap
              # (idiomatic form-control/is-invalid markup), README tabs.
```

React runtime check (manual, ~1 min): dump the react files (temp vitest, see phase-08 gotcha), `npm i react react-dom esbuild` in a scratch dir, bundle `main.tsx` rendering the component, open with Playwright/browser — payload must equal the HTML export's.

## Known issues / gotchas

- Blazor condition exprs come out with doubled parens (`@if ((Equals(...)))`) — valid C#, snapshot-stable; don't "fix" tests by loosening semantics.
- `ts.createSourceFile(...).parseDiagnostics` is internal API (used read-only in a test behind `@ts-expect-error`) — if a TS upgrade breaks it, switch to `ts.transpileModule` + diagnostics.
- React target's `setField` uses `structuredClone` on plain state — fine there (no proxies, unlike the builder store).
- Remember both dialogs' framework select hides for `json`/`vue-lib` only; all four code targets are framework-aware.

## Pointers for the next phase (10 — full element catalog)

- Adding a type now means: core semantics (`renderer/elements.ts`), renderer field component + FgNode map entry, builder definition file (icon, panel, defaults, **emitters for vue/html/react/blazor**), registry list entry, kitchen-sink fixture entry, and the snapshot refresh. Do them in small batches (inputs → choices → dates/sliders → files/static → structure) and keep `pnpm verify` green between batches.
- Static elements (headings, paragraph, divider, buttons) need a `hasValue: false, isContainer: false` core meta — `buildDefaultData`/`collectExportFields` already skip them; the renderer needs a static component path in `FgNode` and emitters are trivial markup.
- `number` input type: remember `ControlSelect`'s numeric-coercion gotcha (phase-04) and `sizeOf` semantics (numbers compare by VALUE, not length) are already correct in both rule engines.
- Steps/tabs containers are the big ones — schedule them last; they need renderer navigation state and per-step validation (REBUILD_PROMPT §4) plus export-target treatment (HTML/React/Vue: show/hide sections; Blazor: conditional rendering).
