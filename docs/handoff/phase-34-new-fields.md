# Phase 34: signature, rich text, location, spam check, iframes

## Status

Five backlog items, picked by the user. Commit: feat(phase-34).

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
- **Kept:** `src`, `width`, `height`, `title`, `allow` (media features only) and `allowfullscreen`.
- **Added to every iframe:** `sandbox="allow-scripts allow-same-origin allow-presentation"` (no forms, popups or top navigation), `referrerpolicy="strict-origin-when-cross-origin"` and `loading="lazy"`.
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

## Verification

- **`pnpm verify` passes:** 191 renderer tests, 316 builder tests and 7 sample-server tests.
  - New renderer tests: location values, settings and the field (with a stand-in Leaflet), the spam check (with a stand-in Turnstile), signatures, rich text, iframes.
  - New builder tests: each target's location and spam-check code, signatures, rich text.
  - New server tests: secret required, bad token refused, token not stored, multipart.
- **Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build, with 0 errors and 0 warnings, for each of the four demos and the kitchen sink.
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
