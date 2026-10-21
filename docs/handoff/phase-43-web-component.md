# Phase 43: the form as a web component

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout (lint, typecheck, renderer
218 / builder 378 / cli 12 / server 9 tests, all builds including the
element bundle and the CLI); the element proven as the thirteenth runtime
on two demos (recorded under "How to verify").

## What was built

- **`<formsgen-form>`** (`packages/renderer/src/element.ts`, ADR-0006):
  Vue's `defineCustomElement` in light DOM; the project from `src`
  (fetched), the `schema` property (object) or attribute (JSON text);
  `theme="light|dark"` pins the colour scheme. The element is the host:
  it sends the validated answers where `meta.submit` points (JSON, or
  multipart with uploads, with progress) unless the page calls
  `preventDefault()` on `formsgen-submit`, dispatches `formsgen-change`,
  `formsgen-submit`, `formsgen-sent { ok, status }`, `formsgen-ready`,
  `formsgen-error` (all bubbling), and honours the thank-you / redirect
  after submit. The renderer's stylesheet is added to the page once.
- **A second renderer build** (`vite.config.element.ts` → `dist/element/`
  `formsgen-element.js` ES module and `.iife.js`, Vue inside, ~325 kB;
  `pnpm --filter @albahadly/formsgen-renderer build:element`, part of `build`;
  package export `./element`).
- **The builder serves and ships it**: a Vite plugin (`elementBundle`)
  serves `element/*.js` from the renderer's build in dev and copies it
  into `dist/element/` on build; `build.sh` builds it before the builder,
  so the deployed builder hosts `…/element/formsgen-element.js`.
- **A new export target, "Web Component (any page)"**
  (`targets/web-component.ts`): a host page (`<name>.html`) loading the
  script and pointing the element at the project file, plus the bundle
  itself when the caller has it — the Export dialog fetches its own copy
  from the builder's origin (`ExportContext.assets`), the CLI reads it
  from its `dist/element/` (copied at build) or the renderer's build in
  the repository. A prebuilt file never gets the project appended
  (`ExportedFile.project: false`). The README covers the attributes,
  events and both ways to get the script.
- **Tests**: the element in jsdom (schema property/attribute, `src` with a
  stubbed fetch, errors, change and submit events, the thank-you and
  "send another", `preventDefault`, theme); the target (page, bundle
  without the project, README variants); registry and CLI counts.
- **Toolkit**: `tools/proof/element-check.sh <demo> <e2e> <tag>` — the CLI
  exports the demo as a web component, `static-server.mjs` serves it, the
  demo's scenario drives it as kind `element`, and the result is compared
  with the demo's HTML-vanilla matrix result: the thirteenth runtime. The
  `thanks` and `prefill` scenarios carry an `ID` map per runtime (the
  renderer's `fg-<node id>` / `fg-<id>-opt-<value>` against the exports'
  `fg_<path>`), and `thanks` reads a field's value only while it is shown
  (the exports hide the form, the renderer swaps its body).

## What was intentionally NOT done

- No shadow DOM (ADR-0006).
- The element does not expose methods (reset, validate); the events and
  the page's own handling cover the cases so far.
- No React/Angular wrappers: the element is the wrapper.
- The bundle is not published to a CDN; the builder's deploy serves it.

## Key decisions & why

- **Light DOM, one stylesheet** — see ADR-0006.
- **The caller supplies the bundle** rather than the target embedding a
  2 MB string: the target stays pure, the builder and the CLI each know
  where their copy is, and a page can always load it from the builder.
- **Scenario id maps instead of a renderer id change**: 16 renderer test
  files and 35 builder assertions pin `fg-<id>`.

## How to verify

```sh
pnpm verify
pnpm --filter @albahadly/formsgen-renderer build:element && pnpm --filter @albahadly/formsgen-cli build
node packages/submit-server/server.mjs --port 4280 --dir /tmp/subs &
bash tools/proof/element-check.sh tools/proof/demos/prefill.json tools/proof/e2e/prefill.mjs prefill
bash tools/proof/element-check.sh tools/proof/demos/thanks.json tools/proof/e2e/thanks.mjs thanks
```

(Each needs the demo's matrix result as the baseline: `run-matrix.sh`
first, see phases 39 and 40.)

Recorded 2026-10-21 on the Windows checkout (Edge via `PLAYWRIGHT_CHANNEL`):
`prefill` as a web component — **IDENTICAL** to the HTML-vanilla matrix
result (the URL prefill, the nested group, the hidden parameter and the
stored submission all through the element); `thanks` — the 12-runtime
matrix rerun under the normalised scenario **12 × IDENTICAL**, then the
element **IDENTICAL** (`sent: { thanks 1, thanksText "Thanks, Ada! We
will write to ada@example.com.", field 0, submit 0 }`, the answers
stored, "Send another response" bringing the empty form back): the
thirteenth runtime. The first element runs failed on the id scheme and
on reading a hidden field's value — scenario fixes, both recorded above.

## Known issues / gotchas

- Under vitest the `?inline` stylesheet import is empty (CSS is not
  processed in tests); the element test checks the single `<style>`
  element, the built bundle carries the text.
- A page that already defines `formsgen-form` keeps its definition
  (`defineFormsGenElement` registers once).
- The element's ids are the renderer's; scripts written against the
  exports' `fg_<path>` ids need the map.

## Pointers for the next phase

- Phase 44 (more templates and more UI languages) is next on the user's
  roadmap.
