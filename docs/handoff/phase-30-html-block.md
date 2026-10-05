# Phase 30: HTML block

## Status

A new static element, **HTML block** (كتلة HTML), type `html`. You paste your own HTML into it, and the form shows it in the renderer, the builder and every export.

Commit: feat(phase-30).

## What was built

### The element

**Builder.** "HTML block" is in the Static palette. Its panel has:
- a multi-line **HTML** box (always left-to-right), with a hint under it: "Scripts, styles, frames, form controls and event attributes are removed; links and images need safe URLs." (en/ar);
- column spans;
- a custom class;
- conditions.

**Value.** None: it is static, like a paragraph. Conditions show and hide it, and it works inside repeater items.

**Defaults.** The block gets light defaults for headings, paragraph spacing, lists, tables, images and links. They are written as `:where(.fg-html) …`, so any class or inline style you write wins.
- **Tailwind:** arbitrary variants restore what Preflight removes (lists, headings, table cells, link underline). Your own Tailwind classes in the HTML work as usual.
- **Bootstrap:** it uses Bootstrap's own element styles; add `class="table"` and similar yourself.

### Safety: "any HTML", within limits

The HTML is never injected as a string. `parseSafeHtml` (renderer, pure TypeScript, no DOM) reads it into a tree of **allowed** tags and attributes. Every target then writes that tree out again with its own escaping, so only what is on the list can get through.

**Kept tags:**
- headings and text: `h1`–`h6`, `p`, `br`, `hr`, `div`, `span`, sections, `strong`/`b`, `em`/`i`, `u`, `s`, `small`, `mark`, `sub`/`sup`, `code`, `pre`, `kbd`, `abbr`, `cite`, `q`, `time`;
- blocks: `blockquote`, `figure`/`figcaption`;
- lists: `ul`/`ol`/`li`, `dl`/`dt`/`dd`;
- links and images: `a`, `img`;
- tables: the full set, with `caption`;
- `details`/`summary`.

**Kept attributes:**
- on any kept tag: `class`, `title`, `style`, `dir`, `lang`, `aria-label`, `aria-hidden`;
- `a`: `href`, `target`;
- `img`: `src`, `alt`, `width`, `height`;
- `td`/`th`: `colspan`, `rowspan`, and `scope` on `th`;
- `ol`: `start`, `reversed`;
- `time`: `datetime`;
- `details`: `open`.

**Removed:**
- **with their content:** `script`, `style`, `iframe`/`frame`, `object`/`embed`, `svg`/`math`, `canvas`, `video`/`audio`, `template`/`noscript`, and form elements (`form`, `input`, `button`, `select`, `textarea`). Form elements would interfere with the form itself.
- **tag only, content kept:** any other tag (custom elements, `font`, `center` …).
- **attributes:**
  - every event handler (`onclick`, `onerror` …), `id` (it could clash with the form's own ids), and any attribute not listed;
  - `href`/`src` that aren't http(s), mailto, tel or relative, checked after decoding entities;
  - in `style`: declarations with `url()`, `expression`, `@`, backslashes or braces.

**Added:** `rel="noopener noreferrer"` on links with `target="_blank"`.

**The parser also:** closes tags you left open, ignores stray closing tags, flattens nested links and keeps `<` that isn't a tag as text.

**Per target:**
- **Renderer** (`FgHtmlBlock`): draws the tree with `h()`; there is no `v-html` anywhere.
- **HTML:** entities.
- **Blazor:** entities, with `@` as `&#64;`.
- **Vue:**
  - `{` in text becomes `&#123;`, so `{{ }}` stays text;
  - an image's `src` is bound (`:src="'…'"`). Otherwise the Vue compiler turns a relative or `/…` address into a build-time import, and the build fails if the picture isn't in the project.
- **React:**
  - attribute names: `className`, `colSpan`, `rowSpan`, `dateTime`;
  - `colSpan`/`rowSpan`/`start` as numbers;
  - `style` as an object;
  - text with braces or line breaks as string expressions.

### Fix found along the way

**Vue exports of the Image element:** an image with a relative or `/…` address broke the Vue project's build (the same build-time import). The Image element now binds `src` too.

## Examples and fixture

- **Hotel booking:** a rates table (with a caption), a note in `<small>`, and a link that opens in a new tab, in English and Arabic.
- **Kitchen-sink fixture:** gains `ks-html`. It holds a list, an inline style, text that would break the other languages (`{{ }}`, `@razor`, `{jsx}`), a `<script>` and a `javascript:` link with `onclick`. The strict compiles and snapshots cover it in every target.

## Verification

**`pnpm verify`** passes with **422 tests** (149 renderer / 273 builder). New coverage:
- the parser:
  - ordinary markup and entities;
  - auto-closing;
  - 18 attack inputs (`onerror`, `javascript:` including entity- and tab-obfuscated, SVG, iframe, style, broken tags, forms, comments, embed, nested links);
  - style filtering;
- the renderer drawing a block, with nothing run;
- each target's output, including hostile input in every language;
- the builder element and panel;
- the examples covering every element.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build of the Blazor export pass in all 3 frameworks, with 0 errors and 0 warnings. React `tsc` first caught `colSpan="2"` (it needs a number); that is fixed.

**12 runtimes** (HTML, React, Vue, Blazor × vanilla, Tailwind, Bootstrap). The demo has:
- a rates block (table, `colspan`, `scope`, an inline style, a numbered list starting at 3, entities, a new-tab link, `details`);
- a hostile block;
- a block shown only for VIP guests;
- a block inside repeater items.

All 12 produced the same:
- structure, with styles compared as the browser normalizes them;
- nothing ran, even after clicking the element that had `onclick`;
- the conditional block shows and hides;
- each new item has its own block;
- `details` opens;
- the payload has no entry for the blocks.

**Builder:**
- the booking example's rates table;
- hostile HTML typed into the panel: the canvas shows only the allowed part, and nothing runs.

## Backlog

- Video/map embeds (`iframe` from chosen sites) would need an allowlist of hosts. Left out until you decide.
- A "trusted HTML" switch, which would insert raw HTML with scripts, is left out on purpose. Anyone who can edit a schema could then run code in your users' browsers.
