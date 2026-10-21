# Phase 46: small wins — a three-way theme control, copy/paste of elements

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout (lint, typecheck, renderer
228 / builder 395 / cli 12 / server 9 tests, all builds); the builder
reviewed in Edge with the real keyboard and clipboard (the select stores `dark`, survives a reload, `system` removes the key; Ctrl+C copies the envelope, Ctrl+V pastes in the same tab and into a second fresh tab, Ctrl+X cuts; no console errors). No export
changed, so no matrix or parity run.

## What was built

- **The header's theme control is a select: System / Light / Dark**
  (`composables/theme.ts`, `data-testid="theme-select"`). "Light" and
  "Dark" are stored (`formsgen.theme`) as before; "System" removes the
  key and the builder follows the OS again, live, through the media query.
  `index.html`'s inline rule (no key = the OS) already matched, so there
  is still no flash. `themeChoice` holds the choice, `theme` the theme in
  effect; `setThemeChoice()` replaces `toggleTheme()`. ADR-0005 stands;
  its "stored choice wins over the OS" rule now has an explicit way back.
- **Copy, cut and paste of the selected element** (`clipboard.ts`,
  `composables/elementClipboard.ts`), through the document's own
  `copy` / `cut` / `paste` events — the browser's clipboard, not an
  in-app buffer, so an element travels between builder tabs, browsers
  and machines. The text is a tagged JSON envelope
  (`{ "formsgen": "formsgen/element", "node": … }`); a bare node object
  (from a schema file) pastes too. What comes back goes through the
  renderer's parser and must use types this builder registers. The
  store's `insertElement(node, anchorId)` gives the copy fresh ids and
  unique names (the clone logic `duplicateElement` already had, now
  `cloneFresh`) and places it inside the selected container when it takes
  it, else after the selected element, else at the end of the form —
  the same `canDropInto` rules as drag-and-drop; a section on its own
  is refused with a notice. Keys pressed inside an input, an editable
  box or over selected page text are left to the browser. A toast names
  what was copied, cut or pasted.
- **Five languages**: "Theme" / "System" and the three notices; the old
  "Switch the builder to … mode" titles are gone.
- **Tests**: `clipboard.test.ts` (envelope, bare node, refusals),
  `stores/insert.test.ts` (placement, fresh ids and names, refusals,
  the repeater fallback), `builder.test.ts` (the select stores and
  forgets; copy → paste → cut through dispatched clipboard events; an
  input keeps its keys; plain text is ignored).
  `tools/proof/theme-shots.mjs` drives the select.

## What was intentionally NOT done

- No clipboard buttons on the canvas chrome (the ⧉ duplicate and ✕ stay);
  the keyboard is the interface, as in every editor.
- Pasting several elements at once, or a whole form, is not a thing: one
  node (with its children) per paste. A form goes through Open/Save.
- `navigator.clipboard.readText()` is not used: the `paste` event needs
  no permission prompt and works in every browser.

## Key decisions & why

- **The browser's clipboard, as text**: a private buffer would only work
  inside one tab; JSON text works everywhere, is readable, and a schema
  node pasted from a file is a bonus.
- **A select, not a cycling button**: three states need to be visible at
  a glance, and the header already has a select for the language.
- **"System" = no stored key**, not a third stored value: older builds
  and the inline rule in `index.html` keep working unchanged.

## How to verify

```sh
pnpm verify
PLAYWRIGHT_CHANNEL=msedge node tools/proof/theme-shots.mjs http://127.0.0.1:4186/ work/shots
# in Edge: the header select (System / Light / Dark, reload, OS change);
# select an element, Ctrl+C, Ctrl+V (also in a second tab), Ctrl+X
```

## Known issues / gotchas

- The `copy` event only reaches the document when the focus is not in a
  text field: click the element on the canvas first (the canvas is
  focusable and selects on click).
- In jsdom there is no `matchMedia`, so "System" resolves to light in the
  unit tests; the OS-following branch is covered by the Edge review.

## Pointers for the next phase

- The roadmap the user chose is done through phase 46; the backlog in
  the earlier handoffs ("What was intentionally NOT done") and the parked
  npm publish of `@formsgen/renderer` remain.
