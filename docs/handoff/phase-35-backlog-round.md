# Phase 35: review backlog round

## Status

Phase complete. 2026-10-06, commits `9dba1c7` (35e), `0a9184c` (35d), `691dfd7` (35a), `62581ac` (35c) and the commit carrying 35b, the render-stamped registries and this handoff, all on `main`.

The items the project-wide review after Phase 34 had deferred, less two kept open on purpose (below). No schema change; ADR-0002 is untouched.

## 35e: the kitchen sink carries a spam check

`fixtures/kitchen-sink.formsgen.json` has `meta.captcha` with Cloudflare's test site key (`1x00000000000000000000AA`), so the spam check is covered by the acceptance artifact like every other feature. The renderer's form tests install a stand-in `window.turnstile` that passes the check as soon as the widget renders; the token travels with the answers as `cf-turnstile-response`. The export snapshots carry the widget, the hint and the gated submit buttons for every target; the kitchen sink's Blazor wizard shows that an embedded submit button waits for the check too.

## 35d: the renderer decodes named entities like the browser

The exports clean rich text with the DOM parser, which knows every named entity; the renderer's own parser (`safeHtml.ts`, shared by the HTML block and rich text) knew twenty. Raw HTML holding `&eacute;` or `&copy;` was therefore stored differently by the two. `decodeEntities` now asks the browser for names outside its table through a detached `<textarea>` (text only, nothing runs); where there is no DOM, unknown names stay as typed, as before. The builder's parity test runs such input through both cleaners.

## 35a: one tab stop for the rich-text toolbar

The toolbar's five buttons were five tab stops. Now only the last used button is in the tab order (`tabindex="0"`, the rest `-1`); ArrowRight/ArrowLeft move between the buttons in the writing direction (ArrowLeft goes forward in a right-to-left form, read from the nearest `dir` attribute), Home and End jump to the ends, and focusing a button makes it the stop.

| Runtime | How |
|---|---|
| Renderer | `FgRichText.vue` tracks the active button (`active` ref), binds `tabindex` and handles `keydown` on the toolbar. |
| HTML, Vue, React, Blazor | The element definition emits the initial `tabindex` (`tabIndex` in React); the shared script (`export/richAnswer.ts`) moves it on `focusin` and `keydown`, wired once on the form root. |

## 35c: Blazor interop registries forget removed elements

`fgRich`, `fgLoc` and `fgSignLists` kept an entry for every element ever rendered, for the circuit's life. The component now counts its renders (`fgRenderGen`, incremented in `ShouldRender`, which Blazor calls before every re-render); each `Fg*Key` call stamps its key with the current number, and `Fg*ShowValues` (after every render) drops the entries whose stamp is older. The registries hold exactly the elements on the page; a late JS call for a pruned key is ignored as before.

A first version used a "rendered this time" set cleared after each render. The 12-runtime check caught it: `OnAfterRenderAsync` awaits JS interop, so two after-render handlers interleave, and the first one's clear emptied the set before the second one pruned, which dropped live editors mid-typing. Stamps have no such window.

## 35b: no explicit `any` in the generated TypeScript

The React and Vue standalone runtimes for signatures, rich text, locations and the spam check were typed with `any` wherever the DOM or Leaflet was touched. They now declare the small interfaces they need (`FgSignPad`, `FgLeaflet*`, `FgLocState`, `FgTurnstile`, the element expando types) and use `Element | null` casts for event targets; the few spots that relied on `any` to skip a null check gained the check (a pad without a 2D context, a toolbar without a wrapper). The plain-script output for HTML and Blazor is the same code with the annotations stripped, so every runtime runs identical logic.

## What was intentionally NOT done

- **Keyboard drawing on a signature pad with "Or type your name" turned off**: the typing box is the keyboard path and is on by default; the builder's control says so.
- **Bootstrap 5 contrast** of secondary legends and outline buttons on `bg-body-tertiary`: Bootstrap's own palette, left as it ships.
- **npm publish of `@formsgen/renderer`**: parked by the user.
- **Legacy entities without a semicolon** (`&copy` as the browser also accepts it): the renderer's parser still requires the `;`; typed text never produces the form, only pasted raw HTML.

## Key decisions & why

- **The kitchen sink uses Cloudflare's test key**, which passes on any site, so the fixture stays runnable everywhere; the generated READMEs already warn that a test key must be replaced before going live.
- **Entity parity through the DOM, not a bigger table**: the browser's parser is the reference the exports use; a 2,000-entry table in the renderer would still drift. Without a DOM the old behaviour is kept rather than guessed.
- **Roving tabindex is moved in the DOM by the shared script**, also under Vue and React: the attribute is static in their markup, so neither framework re-applies it on re-render, and one implementation serves all four targets.
- **Pruning after the render, not on removal**: Blazor rebuilds the whole render tree of the component on each `StateHasChanged`, so the elements stamped with the latest render number are exactly the live set; no element-level disposal hooks are needed, and a stamp (unlike a cleared set) is safe when after-render handlers interleave.

## How to verify

- **`pnpm verify`:** 197 renderer tests, 325 builder tests, 8 sample-server tests.
  - New: a toolbar keyboard test in renderer and builder, an entity-decoding test for `parseSafeHtml` and for `cleanRichText`, parity input with named entities, registry-pruning assertions in the three Blazor export tests, the wizard-submit expectation with the spam check.
- **Strict compilers** (`tools/proof/strict.sh`) on the kitchen sink and the five demos: React `tsc`, `vue-tsc` and the .NET 8 build with 0 errors and 0 warnings.
- **12-runtime matrices** (`tools/proof/run-matrix.sh`): rich text and wizard in all 12 runtimes; signature, location and spam check in the nine web runtimes. The rich-text scenario gained a toolbar step: focus the first button, ArrowRight lands on Italic, End on Link, Home back on Bold, and the `tabindex` values follow.
- **Proof run (2026-10-06, `tools/proof/work/p35/run.sh`):** 18 strict builds with 0 errors and 0 warnings (kitchen sink + five demos × three CSS flavours; `tsc` and `vue-tsc` silent); 51 matrix runs identical (rich text 12/12, wizard 12/12, signature 9/9, location 9/9, spam check 9/9); `pnpm verify` green. Two earlier takes of the same run found and fixed the tsc errors in the typed runtimes and the pruning race described under 35c.

## Known issues / gotchas

- `tools/proof/strict.sh` and `run-matrix.sh` share work directories (`tools/proof/work/react`, the Blazor host): run them one at a time.
- The Turnstile stand-in in `FormsGenForm.test.ts` passes synchronously inside `render`; a test that submits right after mounting without an `await` would still see the check pending (the stand-in resolves through `loadTurnstile`'s promise).

## Pointers for the next phase

- The open backlog is now the two items above plus the parked npm publish. New work starts a new phase; follow `CLAUDE.md` §1–§2 and the Phase Standard.
- For any new feature, add a demo schema and a scenario under `tools/proof/` and run the four steps (README there); record the scenario in the handoff.
