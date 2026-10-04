# Phase 16 — Localized built-in texts (English + Arabic)

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-16)). Still parked per user direction: publishing `@formsgen/renderer` to npm.

## What was built

- **One message catalog** — `packages/renderer/src/messages.ts`, exported from the package. A form's built-in texts follow its `meta.locale`: `ar`, `ar-OM`, `AR_sa`, … → Arabic; anything else → English. The catalog covers:
  - default validation messages for all 8 rules;
  - fallback Submit / Back / Next labels;
  - fallback "Tab N" / "Step N" section labels;
  - the chip remove-button label;
  - the aria-live announcements (error count, submitted, step progress).

  Templates use `{placeholders}`. API: `resolveMessages`, `MESSAGES`, `fill`, `defaultRuleMessage`, `pluralCategory`, `pluralText`. The announcement helpers take an optional locale (`errorsAnnouncement(n, locale)`, `submittedAnnouncement(locale)`, `stepAnnouncement(i, total, label, locale)`); the old `SUBMITTED_ANNOUNCEMENT` constant is gone (the package is unpublished, so nothing breaks outside the repo).
- **Proper Arabic plurals.** The error count uses the six CLDR categories, selected by `n % 100`: 1 خطأ واحد · 2 خطآن · 3–10 "N أخطاء" · 11–99 "N خطأً" · other "N خطأ". English uses one/other.
  - Generated code gets the same rule. `pluralCategoryExpr()` emits one expression that is valid as both JS and C#.
  - The JS function generated for the HTML export is executed in a test against the renderer for every count from 1 to 120.
- **Duplication removed.** The English rule messages used to live in three copies (renderer `rules.ts`, export `compile.ts`, C# `csharp.ts`). Now only the catalog holds them.
  - `collectExportFields()` fills each rule's localized default message into the field nodes it hands out. Every code generator reads validation through it, so all four targets emit the form's language without any locale parameter being threaded through them.
  - Custom per-rule messages still win, verbatim.
- **Renderer.** `FormsGenForm` resolves the catalog from `meta.locale`, passes it to `evaluateRules` (new optional 4th parameter, defaulting to English), and exposes `messages()` on `FormContext`. `FgNode` (Back/Next/Submit fallbacks, Tab/Step labels, step announcements) and `FgTags` (remove-button label) read it.
- **Builder.**
  - The design canvas context provides the form's catalog, so the canvas preview shows Arabic fallbacks too.
  - New Steps elements no longer write `backText: 'Back'` / `nextText: 'Next'` into the schema, which froze English into Arabic forms. The fields stay empty, with the placeholder "Default for the form language".
  - `EmitCtx` and `RenderedSectionHost` carry `messages`.
- **Exports.** Vue, React and HTML use the shared helpers in `export/announce.ts` (`jsTemplate` / `jsSingle` produce attribute- and script-safe concatenations). Blazor gets `FgErrorsText` with a plural-form dictionary, and Razor-escaped remove labels (`@` → `@@`).

## Bugs found while proving it end-to-end

1. **Blazor `<EditForm>` lacked `novalidate`** (pre-existing since phase 9). With an invalid value in a `type="url"` or `type="email"` input, the browser blocked the submit with its own popup in the *browser's* language, and the form's handler never ran. Every other target already had `novalidate` / `noValidate`. Fixed, and a test now asserts all four targets opt out of native validation.
2. **Test-fixture leak in `targets.test.ts`.** Its `fixture()` handed out the same shared object (`parseFormSchema` returns its input), so a test changing `meta.locale` turned later "English" snapshots Arabic. The new "English forms are unaffected" guard caught it. `fixture()` now deep-clones (the same gotcha phase 10b fixed in the renderer tests).

## Verification

- `pnpm verify`: **202 tests** (72 renderer / 130 builder), lint, typecheck, builds. Highlights:
  - the catalog tests (locale resolution, key parity between catalogs, the Arabic plural table, all 8 Arabic rule messages);
  - an Arabic render of the kitchen-sink form (errors, التالي / السابق / إرسال, step announcement, chip label);
  - per-target Arabic export tests;
  - generated-vs-renderer plural parity for counts 1–120;
  - English output left unaffected.
- **Real runtimes, Arabic RTL kitchen-sink.** The HTML export and the .NET 8 Blazor export (`dotnet build`: 0 warnings, 0 errors), driven live in Chromium through the same journey, produce **identical** results in both:
  - `dir="rtl"`;
  - the wizard shows التالي → step announcement "الخطوة 2 من 2: Review" → السابق + إرسال;
  - a failed submit announces "7 أخطاء. يرجى تصحيح الحقول المحددة.";
  - the errors shown are "هذا الحقل مطلوب" and "يجب إدخال رابط صالح".

## Not done / backlog

- **`@formsgen/renderer` npm publish — parked by user.**
- Only English and Arabic. Adding a language means adding one catalog object to `messages.ts` and teaching `resolveMessages` / `pluralCategory` its rules. There's no runtime registration API yet (deliberately: the builder's code generators must see the same catalog the renderer uses).
- No per-form override of built-in texts (e.g. `meta.messages`). Authors can already override every rule message and button label individually.
- The builder's properties-panel control labels ("Back button text", …) aren't in the builder's own ar catalog yet. That's builder chrome, separate from form texts.
- UX quirk seen during the proof, not fixed (general to all targets and languages): clicking Submit right after typing an invalid value in a field *above* it can miss. The blur shows that field's error, which shifts the button down between mouse-down and mouse-up. A fix would reserve error-message space or move errors off-flow; it deserves its own small design decision.

## How to use

In the builder: **Settings → Locale = `ar`** (and Direction = RTL). The preview and every export then speak Arabic for all built-in texts. Field labels, placeholders and options are the author's own text and are used as written.
