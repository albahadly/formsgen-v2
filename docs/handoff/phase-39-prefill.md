# Phase 39: prefill from the page address

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout; the 12-runtime matrix for
`demos/prefill.json` 12 × IDENTICAL (recorded under "How to verify").

## What was built

- **`meta.prefillFromQuery`** (ADR-0002 log). With it on, a query
  parameter named like a field's data path fills the field when the form
  starts: `form.html?email=a@b.c&age=36&topics=news,offers&agree=1`.
  Nested paths use dots (`address.city`). Lists take repeated parameters
  or one comma-separated value; numbers must parse, booleans accept
  `1/true/on/yes` and `0/false/off/no`; anything else leaves the field as
  it was. Never filled from a link: passwords, files, signatures, maps,
  matrices, range sliders, date ranges, rich text, calculated fields and
  repeater items.
- **Hidden field `param`**: the hidden element's "URL parameter" control.
  `?utm_source=mail` lands in a hidden `source` field whatever the flag
  says — the campaign-tag case the hidden element was made for.
- **Order against a saved draft**: restore first, then the address, so the
  link wins for the fields it names and the draft keeps the rest.
- **Renderer**: `packages/renderer/src/prefill.ts` (`prefillKind`,
  `prefillValue`, `queryPrefill`); `FormsGenForm` prop `prefillSearch`
  (default `window.location.search`; `null` reads nothing).
- **Exports**, one emitter module `apps/builder/src/export/prefill.ts`:
  HTML sets the controls by `data-fg-path` (radios, check groups, tags and
  date lists through their own state) and fires `input`/`change` so
  conditions, calculations, answers-in-text and the draft follow; React
  reads once after mount through a functional `setForm` (no server/client
  mismatch; after the draft effect); Vue assigns in `onMounted` after the
  draft restore; Blazor injects `NavigationManager`, parses the query with
  `HttpUtility.ParseQueryString`, sets the flat model in `OnInitialized`
  and again after a draft load. Readers are typed per field, so a
  mis-typed parameter can't corrupt the state.
- **Builder**: Settings → "Prefill answers from the page address" (with
  the hint); the preview shows "Address parameters to test with" whenever
  the form reads the address, and remounts the form with that string.
- **Kitchen sink**: the flag on, `source` with `param: utm_source`.
- **Tests**: renderer unit + mount tests; `export/targets/prefill.test.ts`
  (every target, the hidden-only case, nothing emitted otherwise, the
  draft order); builder test for the setting and the preview string.

## What was intentionally NOT done

- No prefill of composite values (ranges, date ranges, maps) or repeater
  items: no sensible text form, or per-item paths.
- Passwords are excluded on purpose, even with the flag on.
- No "clear the address after reading" and no history rewriting: the link
  stays as the visitor opened it.
- The preview's test string is not saved with the form.

## Key decisions & why

- **Opt-in flag + explicit hidden parameter.** Reading the address by
  default would let any link set any field; the author decides, and the
  one case that is almost always wanted (a campaign tag into a hidden
  field) needs no flag because it is explicit per field.
- **The link wins over the draft.** A visitor following a link with values
  expects them; the draft keeps everything the link does not name.
- **Typed readers in the exports** instead of a generic "set whatever the
  query says": the generated state stays well-typed, and the renderer's
  conversion rules are reproduced exactly (shared `prefillKind`).

## How to verify

```sh
pnpm verify
node packages/submit-server/server.mjs --port 4280 --dir /tmp/subs &
bash tools/proof/export-demo.sh tools/proof/demos/prefill.json tools/proof/work/prefill
bash tools/proof/strict.sh tools/proof/work/prefill PrefillDemoForm
bash tools/proof/run-matrix.sh tools/proof/work/prefill PrefillDemoForm prefill_demo tools/proof/e2e/prefill.mjs prefill
```

The scenario opens each runtime with
`?full_name=Ada+Lovelace&age=36&plan=pro&topics=news,offers&langs=en&langs=ar&agree=1&address.city=London&secret=nope&utm_source=newsletter`,
reads the controls (the password empty, "Hello Ada Lovelace" shown, the
pro-code field revealed by the condition), submits and reads the stored
answers back from the sample server. Expected: 12 × IDENTICAL.

Recorded 2026-10-21 on the Windows checkout (`PLAYWRIGHT_CHANNEL=msedge`,
Edge; .NET SDK 10 building the net8.0 host): 16 exports written; strict
compiles clean (no tsc / vue-tsc output, Blazor 0 errors 0 warnings ×3);
**12 × IDENTICAL, no page errors**. The HTML-vanilla baseline read
`name "Ada Lovelace", age "36", plan "pro", topics [news, offers],
langs [en, ar], agree true, city "London", secret "", hello true,
proCode 1` and the stored answers `{ full_name, age: 36, plan, pro_code:
"PRO-1", topics, langs, agree, address: { city }, secret: "", source:
"newsletter" }`; the other eleven runtimes read the same.

## Known issues / gotchas

- A parameter whose value does not convert (`age=old`) is ignored, not
  reported: the field simply stays empty.
- In the HTML export, a control's listeners must be wired before
  `fgPrefill()` runs (it runs after `updateConditions()` and
  `fgDraftStart()`); a new control kind with its own state needs a branch
  like the tags/dates ones.
- The Blazor model is flat by key (`Model.Address_city` for
  `address.city`), as for every other feature.

## Pointers for the next phase

- Phase 40 (after submit: thank-you / redirect, webhook forwarding in the
  sample server) is next on the user's roadmap (`PROGRESS.md`).
