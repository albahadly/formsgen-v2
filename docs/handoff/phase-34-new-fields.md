# Phase 34: signature, rich text, location, spam check, iframes

## Status

Phase complete. 2026-10-05, commit `8a1b1b8` (feat(phase-34)); a project-wide review followed on 2026-10-06 and its fixes are in the next commit (fix(review), see "Review fixes" below).

Five backlog items, picked by the user.

Schema additions are logged in ADR-0002 (rows 34a–34e): element types `signature`, `richtext` and `location`, `meta.captcha`, and iframes in HTML blocks.

New renderer texts (en/ar):
- signature: `signatureDraw`, `signatureType`, `signatureClear`;
- rich text: `richToolbar`, `richBold`, `richItalic`, `richBullets`, `richNumbers`, `richLink`, `richLinkPrompt`;
- location: `locationMap`, `locationLat`, `locationLng`, `locationMine`, `locationClear`, `locationFinding`, `locationDenied`, `locationNoMap`;
- spam check: `captchaWait`, `captchaFailed`.

Builder strings cover the new elements, their property controls and the Settings field.

## 34a: signature pad

A **Signature** field. The visitor draws with a mouse, finger or pen, or types a name into "Or type your name", which is drawn in a handwriting font. **Clear** empties it.

**Value.** A one-file list holding `signature.png`, sent like an upload (multipart). Because `FILE_TYPES` includes `signature`, these work as for uploads:
- "required";
- conditions;
- answers inside text (they show the file name);
- drafts (files are not kept).

**Size.** The PNG is saved at the pad's CSS pixel size, so files stay small on high-density screens. That also keeps Blazor Server's messages small.

**Props.**
- `typing`: default on.
- `height`: 80–400 px, default 160.

**Where it's allowed.** Inside repeaters too.

**How each runtime does it:**

| Runtime | How |
|---|---|
| Renderer | `FgSignature` with `createSignaturePad` (signature.ts): pointer events, a lazily sized canvas at device-pixel ratio |
| Vue, React, HTML | One script wired on the form root (export/signature.ts) finds pads by `data-fg-sign*` attributes, so pads in new items just work. `fgSignSync` clears pads after a reset |
| Blazor | The same script through `IJSRuntime`, reporting `[JSInvokable] FgSigned(key, dataUrl)` |

**Examples.** The job-application template has a signature.

## 34b: rich-text field

A **Rich text** field: a toolbar (bold, italic, bulleted list, numbered list, link) over an editable box.
- **Link.** The button asks for an address; an empty one removes the link.
- **Paste.** Pasting inserts plain text.
- **Labels.** The box is a `role="textbox"` with `aria-multiline`, labelled by the visible label; the toolbar has `aria-controls`.

**Value.** Cleaned HTML, `''` when empty:
- Only `p`, `br`, `strong`, `em`, `u`, `s`, `ul`, `ol`, `li` and `a href` (http, https, mailto) are kept.
- `b`/`i` become `strong`/`em`, and `div` becomes `p`.
- A paragraph holding blocks, or inside a paragraph, is unwrapped.
- Scripts, styles and the like go with their content.

The renderer (`cleanRichText`) and the exports (`fgRichClean`, the same rules over a `<template>` DOM) give identical output; a test checks that. Answers inside text show the plain text (`richPlainText`, `fgRichPlain`, C# `FgRichPlain`).

**Examples.** The job application has a cover letter.

## 34c: location (map)

A **Location** field: a Leaflet map, latitude and longitude boxes (the keyboard way), **Use my location** and **Clear**.

**Picking a point.**
- Clicking or tapping the map places the pin, and the pin can be dragged.
- Typing both coordinates moves the pin (the map pans).
- "Use my location" asks the device, then zooms in. If it can't, the field says "Your location isn't available. Place the pin on the map or type the coordinates."
- A reset returns the map to where it started.

**Value.** `{ lat, lng }` rounded to 6 decimals, or `null`. Answers inside text show `lat, lng`.

**Map source.**
- Leaflet 1.9.4 loads from cdnjs with integrity hashes, the first time a location field shows.
- Tiles are OpenStreetMap's by default, with the required credit and link.
- Props `tiles` (https, with `{z}`/`{x}`/`{y}`) and `attribution` select another tile server. Busy forms should use one, since OpenStreetMap's own servers are for light use.

**The map's settings.**
- `lat`, `lng`, `zoom`: where the map starts.
- `myLocation`: shows the button (default on).
- `height`: 160–600 px.

**Behaviour details.**
- The pin is an inline SVG, so no marker images are needed.
- Scroll-wheel zoom is off, so scrolling the page doesn't zoom the map.
- If the map can't load, the field says to type the coordinates.

| Runtime | How |
|---|---|
| Renderer | `FgLocation` with `createLocationMap` / `loadLeaflet` (location.ts) |
| Vue, React, HTML | One script on the form root (export/location.ts). A `MutationObserver` starts maps for fields that appear later (new items, shown by a condition), and a `ResizeObserver` keeps each map's size right. `fgLocSync` shows values set elsewhere; in HTML, `fgLocPins` makes the pins follow the boxes |
| Blazor | The same script reports `[JSInvokable] FgLocated(key, lat, lng, touch)`. A new model (reset, saved answers) is sent back by `fgLocSet`. The C# value is `FgLatLng?` (a record), posted as `{ lat, lng }` |

**Examples.** The hotel booking template has a pick-up point.

### Blazor: scripts wired again after a new EditContext

`EditForm` rebuilds all of its elements when its `EditContext` changes, which happens on reset and when saved answers come back. Root scripts then lost their elements: pads stopped drawing after "Start over".

The scripts are now loaded once (`FgInteropInit`), and wired to the form's element after every render that follows a new `EditContext` (`fgWire`, `FgInteropWire`). This covers sortable items, signatures, rich text, maps and the spam check.

## 34d: spam check (Cloudflare Turnstile)

**Setting it up.** Settings → **Spam check: Cloudflare Turnstile site key** (`meta.captcha = { provider: 'turnstile', siteKey }`). Leave it empty for no check. The key is checked for shape; the test key `1x00000000000000000000AA` is named in the hint.

**On the form.**
- The widget shows above the submit button.
- The button stays disabled until the check passes. Meanwhile "The form can be sent once the check above has passed." is shown and tied to the button by `aria-describedby`.
- If Cloudflare's script can't load, the form says so.

**What gets sent.**
- The token goes with the answers as `cf-turnstile-response` (inside the JSON `data` part for multipart).
- A token works once: after each submission the widget runs again.

**Where it lives in each runtime:**
- Renderer: `FormsGenForm` with captcha.ts (`loadTurnstile`; an embedded wizard submit is disabled too).
- Exports: export/captcha.ts. Blazor uses `[JSInvokable] FgCaptchaToken`.

**The sample server.** With `TURNSTILE_SECRET` set, it accepts only submissions whose token Cloudflare confirms (`siteverify`). Otherwise it answers 403 "spam check missing" or "spam check failed", and 503 if Cloudflare can't be reached. The token is never stored. The exported server README explains the secret when the form has a check.

**Test keys.**
- Site key `1x00000000000000000000AA` always passes.
- Secret `1x0000000000000000000000000000000AA` always accepts.

## 34e: iframes in HTML blocks

HTML blocks may now embed any `https:` page, such as videos or maps.
- **Kept:** `src`, `width`, `height`, `title`, `allowfullscreen`, and `allow` limited to the features embed codes ask for (autoplay, encrypted-media, fullscreen, picture-in-picture, clipboard-write, web-share, accelerometer, gyroscope; never camera, microphone, geolocation or payment).
- **Added to every iframe:** `sandbox="allow-scripts allow-same-origin allow-presentation"` (no forms, popups or top navigation), `referrerpolicy="strict-origin-when-cross-origin"` and `loading="lazy"`. The sandbox restrains a cross-origin page; a page from the form's own origin keeps that origin's powers, as any same-origin script would.
- **Replaced:** the author's own `sandbox` and referrer policy.
- **Removed:** iframes with an `http:` or script address, and fallback content inside an iframe.

React output uses `allowFullScreen` / `referrerPolicy`. The builder's hint says what is allowed (en/ar).

### Smaller fixes found on the way

- **React strict builds.**
  - A form whose only "files" are signatures no longer gets the unused pick and thumbnail helpers.
  - Repeater items that don't read their item name it `_item`.
- **Blazor.**
  - The rich-text C# helper's regex is a verbatim string (it didn't compile).
  - `FgField` is emitted whenever a root script reports changes.
- **The renderer's signature pad** asks for its canvas context on first use, not while the form is built.
- **The kitchen-sink fixture** now has a rich-text, a location and a signature field.

## Review fixes (2026-10-06)

A project-wide review (12 reviewers, each finding judged independently) found the problems below; all are fixed in the fix(review) commit.

- **Blazor Server dropped the circuit on an ordinary signature**: the PNG went in one JS→.NET message, over SignalR's 32 KB limit from the third stroke. The pad now streams it (`DotNet.createJSStreamReference` → `IJSStreamReference`).
- **Blazor lost rich text, locations and signatures from the screen** when a step, tab or condition re-rendered them (the model kept them). The model's values now go back to the editors, maps and pads after every render; Vue, React and HTML pads shown again draw their file too.
- **A mistyped Turnstile site key was saved**, so the project would not reopen and the autosaved draft was dropped on reload, while exports silently had no check. Settings now writes only a well-formed key.
- **Typing in the canvas rich-text editor fired the canvas shortcuts** (Backspace removed the element). Editable boxes are left alone; on the design canvas, maps, pads, editors and embedded pages are inert (a click selects, a drag moves).
- **Location fields were offered length and format rules and text conditions** that could never pass (and broke the Blazor build): `location` joined `OBJECT_VALUE_TYPES`.
- **Rich-text length and format rules judged the markup**: they judge the visible text now, in the renderer, JS and C#.
- **`</script>` in `meta.locale` or the submit URL** could end the inline script of the HTML and Vue exports: every author string written into a script goes through `jsString`, and the parser accepts only language tags and http(s)/relative submit URLs.
- **Accessibility**: tabs in every export carry `role="tab"`, `aria-selected` and `tabpanel`; each map is a labelled group (two maps on a page were duplicate landmarks); the location status line stays in the tree while empty; the rich-text editor shows focus like other controls; every control of a field is marked `aria-invalid` in the HTML export; `aria-required` on the latitude box; map moves respect reduced motion; "1." reads right in RTL.
- **Smaller**: a resized pad keeps its ink; emptying one coordinate box clears the pin; new map settings rebuild the map on the design canvas; a custom map credit only goes with a custom tile server; the builder preview runs the check with Cloudflare's test key (a production key refuses the builder's domain); number controls stay inside their ranges; the Tailwind pad stays white under every theme; removed location fields free their maps; the Vue export of a signature-only form has no upload helpers; the Vue item validator types under any tsconfig; "Choose one file at most"; a favicon; `highlight.js` and JSZip in their own chunks; `packageManager` pinned; the sample server times out, answers 503 for Cloudflare's own trouble and caps token length; READMEs list the run-time services and CSP hosts; `FgRichText.ts` (formatted paragraphs) is `FgMarkdown.ts`.

## What was intentionally NOT done

- **npm publish of `@formsgen/renderer`**: parked by the user (unchanged since phase 16).
- **Rich-text toolbar roving tabindex** (arrow keys between buttons): every button is a tab stop; five stops is acceptable, deferred.
- **A signature without "Or type your name"** has no keyboard way to sign: the typing box is the keyboard path and is on by default; the builder's control says so. Deferred: a focusable pad with key-drawn strokes is not worth it.
- **`meta.captcha` in the kitchen-sink fixture**: a check would block the fixture's own submit tests; the spam check is covered by its own unit tests, the export tests and the 12-runtime demo.
- **Bootstrap 5 contrast** of secondary legends and outline buttons on `bg-body-tertiary` (pre-existing, Bootstrap's own palette): left as Bootstrap ships it.
- **Explicit `any` in the generated TypeScript of the Phase 34 runtimes**: strict `tsc`/`vue-tsc` accept it; tightening is cosmetic.
- **Entity decoding parity** between the renderer's cleaner and the script cleaner for unknown named entities (`&copy;` typed as text is the same in both; only raw HTML with such entities differs). Deferred.
- **Blazor interop registries** keep entries for removed items for the circuit's life (small strings; file bytes only for signatures). Deferred.

## Key decisions & why

- **Signature value = one-file list** (`signature.png`), so every upload path (required, multipart, drafts not keeping files, answers inside text) works unchanged.
- **Rich text is HTML, cleaned twice** (renderer and script, identical rules, asserted by a test); servers should clean it again. Plain text (`richPlainText`) is what rules and answers inside text use.
- **Location = `{ lat, lng }` rounded to 6 decimals, or `null`**; Leaflet from cdnjs with integrity hashes rather than a bundled copy, so exports stay single files; OpenStreetMap tiles by default with the credit it requires, and a `tiles` prop for busy forms.
- **Turnstile only**, with the token in the answers as `cf-turnstile-response` (Cloudflare's own name), so any server-side verifier works. The builder preview substitutes the test site key because real keys are domain-bound.
- **Iframes keep `allow-same-origin`** so embeds such as YouTube keep their storage; the sandbox is a cross-origin restraint, not a same-origin one (documented above).
- **Blazor root scripts are re-wired after every new `EditContext`** and the model's values are pushed back after every render: `EditForm` rebuilds its elements and only the .NET side knows the values.
- **Blazor signatures stream** (`IJSStreamReference`) instead of raising `MaximumReceiveMessageSize`: a visitor's drawing must not depend on a hub option the deployer may not set.

## How to verify

- **`pnpm verify` passes:** 195 renderer tests, 324 builder tests and 8 sample-server tests (after the review fixes; 191 / 316 / 7 at the phase commit).
  - New renderer tests: location values, settings and the field (with a stand-in Leaflet), the spam check (with a stand-in Turnstile), signatures, rich text, iframes.
  - New builder tests: each target's location and spam-check code, signatures, rich text.
  - New server tests: secret required, bad token refused, token not stored, multipart.
- **Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build, with 0 errors and 0 warnings, for each of the four demos and the kitchen sink (rerun after the review fixes).
- **A fifth demo after the review fixes (wizard):** a steps wizard holding a signature, rich text and a map, a condition that shows a second map, and a reset; identical in all 12 runtimes, with two expected differences: the signature PNG's byte size (the pad is a different width in each CSS flavour) and Blazor's editor showing the cleaned `<strong>` for the typed `<b>` after a re-render. The scenario:
  1. Three long strokes across the pad (a 28–43 KB PNG, 38–57 KB as the base64 text one message used to carry: over Blazor Server's 32 KB message size), bold text, typed coordinates.
  2. Next, then Back: the step is rendered again and the pad still shows the ink, the editor its HTML, the boxes and the pin the point.
  3. A checkbox shows the second map; unchecking hides it; checking again brings it back with its coordinates and pin.
  4. Submit from step 2: the server got the PNG (multipart) and every answer.
  5. Start over: everything empties, the pad included.
- **Each demo in 12 runtimes:** HTML, React, Vue and Blazor, each in vanilla, Tailwind and Bootstrap 5. The results are compared with plain HTML.
  - **Signature:** required check, drawing, typed name, Clear, pads in new items, reset, then a multipart post to the sample server with both PNGs.
  - **Rich text:** required check, bold, list, link and paste, item editors, answers in text, saved answers after a reload, reset, a sandboxed YouTube iframe (with the http one removed), and the stored value.
  - **Location:** the map loads from cdnjs with its tiles and credit, and the required check works. The scenario:
    1. Click the map: the boxes hold the point under the pointer, the pin is placed, and the answer shows in text.
    2. Type coordinates.
    3. Use my location (granted), then refused.
    4. Clear.
    5. Add an item: its map starts.
    6. Reload: saved answers come back with pins.
    7. Reset: back to the starting view.
    8. Submit: the server got `{ lat, lng }`.
  - **Spam check:** run against Cloudflare's real test widget and a sample server with the test secret. The scenario:
    1. With the script held back, the button waits with the hint.
    2. The check passes and the button is enabled.
    3. An invalid submit keeps the token.
    4. A valid submit sends the token once; the server confirms it with Cloudflare and stores the answers without it.
    5. The button waits again until a new check passes, and a second submission goes through.
    6. With the script blocked, the form says the check didn't load.

## Known issues / gotchas

- **Blazor Server and long rich-text answers**: HTML over ~32 KB in one `FgRichChanged` call exceeds the default `MaximumReceiveMessageSize`; the Blazor README says how to raise it. Signatures stream and are not affected.
- **Blazor interop scripts use `eval`** (installed once from C# constants): a `script-src` policy without `'unsafe-eval'` blocks them; the README says to move the `Fg*Script` constants into a static file in that case.
- **The design canvas keeps maps, pads, editors and iframes inert**; use Preview to interact with them.
- **"Use my location" needs a secure context** (https or localhost): on plain http the device refuses and the field says so.
- **Turnstile iframes live in a closed shadow root**: tests read the token and the button state, not the widget's internals.
- **The vanilla stylesheet is mirrored** between `packages/renderer/src/styles.css` and `apps/builder/src/export/css/vanilla.ts`; a test fails when a rule differs by a character.

## Pointers for the next phase

- New element types: `packages/renderer/src/elements.ts` + `components/fieldComponents.ts` + `apps/builder/src/registry/elements/<type>.ts` (+ `registry/index.ts`), the kitchen sink, and the README's "Adding an element type".
- Run-time scripts shared by the exports live in `apps/builder/src/export/{signature,richAnswer,location,captcha}.ts`; Blazor members (JSInvokable methods, show-after-render) sit beside them and are wired in `targets/blazor.ts` (`FgInteropInit`/`FgInteropWire`, `OnAfterRenderAsync`).
- `OBJECT_VALUE_TYPES` (renderer `composite.ts`) decides which rules and conditions the builder offers for an object-valued type; add new object-valued types there.
- `servicesReadme` (`apps/builder/src/export/readmeNotes.ts`) is where a new run-time dependency is documented for every target at once.
- The review's demos and e2e scripts (`p34a`–`p34d`, the matrix runner) live in the session scratchpad, not in the repository; the Phase Standard's 12-runtime check needs them re-created from the handoff's scenarios.

