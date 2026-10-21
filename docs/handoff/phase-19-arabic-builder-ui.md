# Phase 19 — Complete Arabic builder UI

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-19)). Still parked per user direction: publishing `@albahadly/formsgen-renderer` to npm.

## What was built

The builder's Arabic mode (header toggle "العربية") used to leave registry and export metadata in English. Everything visible is now translated:

- **Properties panel**: the 5 section headings (الخصائص، البيانات، التخطيط، التحقق، الشروط), every control label (التسمية، النص الإرشادي، الحد الأدنى، مقدار الزيادة…), select-control options (عمودان، 3 أعمدة…), placeholders, and column-span "Auto" → تلقائي.
- **Validation rules show readable names in both languages** instead of raw codes. English: Required, Minimum, Between, Email format, Pattern (regex), Same as field. Arabic: مطلوب، الحد الأدنى، بين قيمتين، صيغة بريد إلكتروني…
- **Canvas**: the conditional badge "if" → شرط (with a tooltip). Fallback tab/step names now follow the *form's* language, like the renderer.
- **Export dialog**: target names and descriptions (مخطط JSON، Vue (مستقل)…), and "Vanilla CSS" → CSS عادي. Product names (Tailwind CSS, Bootstrap 5, Blazor, HTML + JS) stay as they are.
- **New elements in an Arabic form start with Arabic content.** When `meta.locale` is Arabic, a new element's default texts are Arabic:
  - a label equal to the element's name takes its Arabic name (a new select becomes قائمة منسدلة);
  - Option N → خيار N, Choose… → اختر…, Type and press Enter → اكتب ثم اضغط Enter, Heading → عنوان, Paragraph text. → نص الفقرة.;
  - new tabs/steps are named تبويب N / الخطوة N, including ones added later with "+".

  Option *values* (`option_1`) are never translated, and existing content is never touched. English forms are unchanged.
- **RTL bug found and fixed (from the screenshots)**: in the Arabic UI, the export dialog's **code viewer rendered code right-to-left** — lines right-aligned and punctuation scrambled by the bidi algorithm (`"formsgen/v2$"`). Code and technical identifiers are now forced `dir="ltr"`: code viewer, preview payload, export file names, data-key and form-name inputs, regex/same-as rule input, submit URL.

## How it's built

- `tText(english)` in `i18n/index.ts` translates an English phrase from registry/export metadata through an `arText` table keyed by the English text; English passes through unchanged. Panel controls, section titles, select options, placeholders and the export dialog use it.
- New catalog keys (en + ar): `properties.validation.rule.*`, `properties.colspan.auto`, `canvas.conditionalBadge(.title)`. `tFor(locale, key)` reads one catalog independently of the UI locale.
- `registry/contentDefaults.ts` → `localizeNewNode(node, formLocale)`, applied by `store.addElement` and `store.addSection`.

## Verification

- `pnpm verify`: **233 tests** (74 renderer / 159 builder). New:
  - **completeness guards**: every panel section title, control label, select option and placeholder of every element, and every export target name/description and CSS framework name, must have Arabic. Every validation rule must have a readable name in both languages. Adding untranslated UI now fails CI.
  - **rendered-panel scan**: for every element type, the Arabic panel shows none of the English phrases. A control step proves the same scan *does* find them in English, so the check can't pass vacuously.
  - **LTR guard**: code viewer and data-key input are `dir="ltr"` under the Arabic UI.
  - **default-content tests**: Arabic form (labels, options, placeholders, heading/paragraph text, tabs/steps including added ones); English unchanged.
- **Real built builder in Chromium**, Arabic UI + Arabic form (Select + Number with a min rule and a condition): all panel headings and labels in Arabic, rule name الحد الأدنى, badge شرط, export target names in Arabic, and code left-to-right after the fix (screenshots in the session).

## Not done / backlog

- **`@albahadly/formsgen-renderer` npm publish — parked by user.**
- "renderer v0.0.1" (version tag) and the brand name "FormsGen" are intentionally left as-is.
- Adding a third UI language means a third catalog plus a third `arText`-style phrase table. If more languages come, fold `arText` into the per-locale catalogs keyed by phrase.
