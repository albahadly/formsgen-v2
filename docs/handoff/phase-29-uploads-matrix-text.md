# Phase 29: drag-and-drop uploads, upload progress, multi-answer matrix, formatted text

## Status

- **29a:** drag-and-drop on file and image uploads, plus a progress bar while a submission with files is sent. Commit: feat(phase-29).
- **29b:** a matrix with several answers per row, simple text formatting for paragraphs, and examples that show the Phase 28 repeaters. Same commit.

Still parked: npm publish. Still waiting on a decision from you: signature pad, rich-text editor field, location/map, captcha.

## 29a: what was built

### Drop zones

Every file and image upload is now a dashed **drop zone** that says "Choose a file or drag it here". A field that takes several files says "Choose files or drag them here" instead.

**How it works.** The real file input is stretched over the zone and made transparent. So:
- a click anywhere on the zone opens the file picker;
- a dropped file lands on the input as an ordinary pick, with the same type, size and count checks;
- this works the same in every target, including Blazor (no JS interop) and the HTML export without its script;
- keyboard users still tab to the input, and the zone shows the focus ring.

**Highlight.** While files are dragged over it, the zone carries `data-fg-dragging` and gets the primary border colour. Each target sets this from the input's drag events:
- renderer: `FgFile` state;
- Vue/React: `fgDrag`;
- HTML: listeners in `fgWireFiles`, which also run for new repeater items;
- Blazor: `FgStore<bool> fgDragging`, keyed per item inside repeaters.

**Known limit.** Browsers reject dropping several files onto a field that takes one file. Nothing is added; the user can drop one file or use the picker.

### Upload progress

This applies to forms that have upload fields **and** a submit URL.
- **Sending.** The browser exports (Vue, React, HTML) send with `XMLHttpRequest` (`fgSend`), because `fetch` can't report upload progress.
- **While sending:**
  - a progress bar (`role="progressbar"`, named "Upload progress", `aria-valuenow`) and the text "Uploading… 42%";
  - the submit button is disabled, and submitting again does nothing;
  - "Uploading files…" is announced.
- **Success (2xx):** the bar is full, "Upload complete." shows, and "Form submitted." is announced.
- **Failure (a network error or a non-2xx answer):** the bar goes away, "Upload failed. Please try again." shows and is announced, and submit works again.
- **Blazor** sends the multipart body through `FgProgressContent`, which reports how much of the body has been written. The demo runs Blazor Server, where files are already read into the server when picked. There the bar tracks the server's upload to your endpoint.
- **Unchanged:** forms without uploads, or without a submit URL, behave as before.

**Renderer:**
- `sendSubmission(url, payload, { method, multipart, onProgress })` sends with XHR and reports progress from 0 to 1. It resolves `{ ok, status }`.
- `FormsGenForm` takes an `upload` prop (`{ state: 'uploading' | 'done' | 'failed', progress }`). With it, the form shows the same bar and texts, disables submit and makes the same announcements.
- The renderer still never posts by itself; the host decides.

New texts (en/ar): `dropFile`, `dropFiles`, `uploadProgress`, `uploading`, `uploadStarted`, `uploadDone`, `uploadFailed`.

**CSS slots:** `fileDrop`, `fileDropText`, `upload`, `progress`, `progressBar`, `progressText`.
- Bootstrap exports with uploads ship a small `/* Upload drop zones */` block: dashed border, highlight and focus ring, which Bootstrap has no utilities for.
- In Tailwind, `hover:` and `data-[fg-dragging]:` border colours are themed like the other primary colours.

## 29b: what was built

### Matrix with several answers per row

New matrix option: **"Several answers per row"** (عدة إجابات لكل صف), `props.multiple`.
- **Controls.** Each cell is a checkbox, still named "Row: Column".
- **Value.** `{ row: [columns…] }`, always in column order, whatever order the boxes were ticked in. `[]` means no answer.
- **"Required"** means every row has at least one answer.
- **Types:** TS `string[]` per row; Blazor `Dictionary<string, List<string>>`, toggled through `FgToggleCell`.
- **Everywhere.** It works inside repeater items, and items that move keep their answers. Ticked boxes are read in column order: `fgToggleCell` (Vue/React), the HTML reader, and `toggleMatrixCell` (renderer).

### Formatted text

The paragraph has a new option: **"Simple formatting: \*\*bold\*\*, \*italics\*, [link](https://…), - lists"**, stored as `props.format: 'markdown'`. Its Text box is now a multi-line textarea.

Supported syntax:
- `**bold**`
- `*italics*` or `_italics_`
- `[text](url)`
- lines starting with `- ` or `* ` (bullets) or `1. ` (numbers)
- a blank line starts a new paragraph; a single line break is kept

**Safety.** The renderer parses the text into a tree (`parseMarkdown`) and draws it as elements, with no `v-html`.
- Links keep only safe URLs (`isSafeUrl`); `[x](javascript:…)` stays as plain text.
- Each export writes the tree with its own escaping:
  - HTML: entities;
  - Razor: `@` → `&#64;`;
  - JSX: braces become `{'{'}`;
  - Vue: the block is `v-pre`, so `{{ }}` stays text.

**CSS slots:** `richText`, `richBlock`, `richList`, `richListOrdered`. Lists set `list-style` explicitly, because page resets (Tailwind's preflight, the builder) remove bullets.

### Examples

- **Job application:**
  - the intro is formatted (bold, italics, a list);
  - the work history is sortable;
  - the CV field shows the drop zone.
- **Feedback survey:** a second matrix, "How did you reach us for each step?", takes several answers per row.
- **New "Trip with luggage" (رحلة مع الأمتعة):**
  - a formatted intro with a link;
  - sortable travellers, each with a name and a "Checks in bags" switch in columns;
  - an inner, sortable Bags repeater shown only for that traveller;
  - weight in kg (max 32), Fragile, and a handling note shown only for fragile bags.
- The examples together still use every element type (tested). A new test checks that the examples show sortable items, a nested repeater, a multi-answer matrix and formatted text.

The kitchen-sink fixture gains a formatted paragraph (`ks-intro-rich`) and an optional multi-answer matrix (`ks-usage`).

## Verification

**`pnpm verify`** passes with **414 tests** (144 renderer / 270 builder). New coverage:
- renderer:
  - drop zone and drag highlight;
  - the `upload` prop's states, texts, announcements and disabled submit;
  - `sendSubmission` (progress, success, errors);
  - multi-answer matrix (column order, required);
  - Markdown parsing (nesting, unsafe links, lists) and element rendering;
- exports:
  - drop zones and progress in every target;
  - no progress code without a URL;
  - Bootstrap drop-zone CSS;
  - `fgSend` run against a fake XHR;
  - multi-answer matrix per target;
  - formatted text with hostile input (HTML, `{{ }}`, `@`, braces, `javascript:`) in every target;
- examples.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build of the Blazor export pass for both demos in all 3 frameworks, with 0 errors and 0 warnings.

### 12 runtimes

Both demos ran in HTML, React, Vue and Blazor × vanilla, Tailwind and Bootstrap, with real browser drags (Chrome DevTools drag events carrying files).

**Upload demo** (all 12 identical):
1. The drop zone texts, and the input covering its zone.
2. Required errors.
3. Drag over and leave: the highlight comes and goes, and nothing is picked.
4. Drop a `.txt` on the PDF field (type error), then a PDF (it replaces the `.txt`).
5. Drop two images, then one more (they append, with thumbnails).
6. Drop into a repeater item and into a newly added item.
7. The server fails: the failure shows and is announced, and submit works again.
8. A slow server, with the browser targets' upload throttled to 200 KB/s:
   - the bar and the "Uploading… n%" text match;
   - submit is disabled meanwhile, and "Uploading files…" is announced;
   - in the browser targets the bar climbs 0 → 8 → … → 95 → 100;
   - then "Upload complete." shows and "Form submitted." is announced.
9. The server receives the parts `cv`, `photos` ×3, `refs.0.letter` and `refs.1.letter`.

**Survey demo** (all 12 identical):
1. The formatted paragraph:
   - its structure is `p(strong, em, br, a, a)`, `ul`, `ol`;
   - hostile text stays text, and there is no `javascript:` link.
2. Checkboxes named "Row: Column", and "required" until every row has an answer.
3. Boxes ticked out of order are stored in column order; unticking works.
4. Per-item answers follow a team when it moves up.
5. The JSON the server receives matches what is shown on screen.

**Builder:**
- the examples preview: the formatted job intro with bullets, a real drop onto the CV field with its highlight, the feedback matrix with several answers, and the trip's nested bags and fragile note;
- the paragraph panel: the textarea and the formatting switch.

## Backlog

- Dropping several files onto a one-file field: take the first file. This needs script in each target; Blazor would need JS interop.
- Upload progress in the builder's Preview: it never posts, so there is nothing to measure.
- Formatting: headings, inline code and links that open in a new tab are left out on purpose.
- Parked or waiting on you: npm publish; signature pad, rich-text editor, map, captcha; making the builder usable at phone width.
