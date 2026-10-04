# Phase 20 — Element appearance (style options in the Properties panel)

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-20)). Still parked per user direction: publishing `@formsgen/renderer` to npm.

## What was built

A new **Appearance** section in the Properties panel (en + ar: المظهر). It offers only the options that make sense for the element type:

| Option | Offered for | Values |
|---|---|---|
| Size | text-likes, number, textarea, select, multiselect, tags | Small / Medium / Large |
| Hide label | the fields above + range, radio group, checkbox group | label hidden visually, **still the field's accessible name** |
| Alignment | every element (fields, static, group, columns, tabs/steps hosts) | Start / Center / End |
| Color | heading, paragraph, divider | Default / Muted / Primary / Danger |
| Custom CSS class | every element above | space-separated class names (validated) |

A single checkbox gets alignment and class only (its label *is* its text). Individual tab/step sections get no section, because their host renders them.

- **Schema**: optional `ElementNode.style` (`size`, `hideLabel`, `align`, `tone`, `className`).
  - **ADR-0002** sets the policy: additive, optional, default-preserving fields don't bump `$schema` but are logged and shape-validated. It also records phase 13's `meta.submitButton` retroactively.
  - `parse.ts` validates every style key; class tokens must match `CLASS_TOKEN_PATTERN`, so quotes, `<>`, `@` and `{}` can't reach markup or Razor.
- **Semantic, not raw values.** Size and color are named choices that every target translates into its own idiom:
  - **vanilla / renderer**: `fg-control--sm|lg`, `fg-tone-*` (theme CSS variables), `fg-align-*`, in both `styles.css` and the export stylesheet;
  - **Tailwind**: complete replacement class strings (e.g. `px-3 py-2 text-sm` → `px-2 py-1 text-xs`), never stacked conflicting utilities, because Tailwind resolves conflicts by stylesheet order, not attribute order;
  - **Bootstrap 5**: native `form-control-sm|lg` / `form-select-sm|lg`, one color utility (the paragraph's `text-secondary` is replaced, not stacked; colors are `!important`), and `opacity-100` on a colored `<hr>` (Bootstrap draws hr at .25);
  - hidden label → each framework's own visually-hidden class (`fg-sr-only` / `sr-only` / `visually-hidden`).
- **How exports pick it up with no emitter changes.** `markup.ts` hands each element's emitter a style-aware view of the adapter (`withNodeStyle`): size and color flow into control and text slots, and a hidden label turns the `label` slot into the visually-hidden class. Alignment and custom classes go on the element's cell. All four code targets inherit this; the Vue-lib target uses the renderer directly.
- **Renderer**: `useField` exposes `labelClass` / `sizeClass` to all field components; `FgStatic` applies color; `FgNode` adds alignment and custom class to the cell.
- **Builder**:
  - `ControlAppearance.vue`;
  - `store.setStyle(id, patch)` removes default values instead of storing them, and drops `style` when empty;
  - the canvas mirrors size, hidden label, color (via the renderer components) and alignment.
- **Fixture**: kitchen-sink now uses every option, so all 4 targets × 3 frameworks are covered by snapshots and the axe check covers a hidden label.

## Verification

- `pnpm verify`: **249 tests** (77 renderer / 172 builder). New coverage:
  - the renderer applies each option, and the hidden label still names its input;
  - the parser rejects bad values with paths and accepts Tailwind-style classes (`md:w-1/2`, `bg-[#fafafa]`, `!mt-2`);
  - adapter idioms per framework (Tailwind never stacks conflicting utilities);
  - every target × framework emits every option;
  - the panel offers the right options per type, writes the store, removes defaults, and only commits valid classes.
- **Real browsers** (the HTML export of a styled demo form, in each framework, with Tailwind and Bootstrap loaded from their CDNs):

  | | Vanilla | Tailwind | Bootstrap 5 |
  |---|---|---|---|
  | Input heights S / M / L | 25 / 37 / 46 px | 26 / 38 / 50 px | 31 / 38 / 48 px |
  | Heading centered, primary color | ✓ | ✓ | ✓ |
  | Danger paragraph, end-aligned | ✓ | ✓ | ✓ |
  | Danger divider | ✓ | ✓ | ✓ (after the opacity fix) |
  | Hidden label: invisible, still the accessible name | ✓ | ✓ | ✓ |

- **Real builder**: the Appearance section is used through the UI; the canvas shows the large/small inputs (52 / 30 px) and the centered heading (screenshot in session).

## Gotchas

- **CDN assets in this sandbox**: Playwright's Chromium must be routed through the proxy and must trust the proxy's CA. **Don't disable TLS checks**; trust exactly that key:
  - `proxy: { server: process.env.HTTPS_PROXY }`;
  - `args: ['--ignore-certificate-errors-spki-list=<sha256 of the CA public key, base64>']`, computed with `openssl x509 -in /root/.ccr/agent-proxy-ca.crt -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64`.
- Measuring one `<p>` among cells: `p:last-of-type` matches *every* paragraph that is last in its own cell. Select by content instead.
- Stopping `vite preview` with `pkill -f …preview…` kills the invoking shell (its own command line matches). Filter by `comm == node`.

## Backlog

- **`@formsgen/renderer` npm publish — parked by user.**
- Form-level theme in Settings could grow (font family, text/background/border/error colors). Today the Settings theme tokens (`--fg-*` variables) style only vanilla exports and the renderer; Tailwind/Bootstrap exports follow their framework's palette.
- More per-element options are easy to add the same way (e.g. label position, spacing): add the key to `ElementStyle` + ADR-0002's log, then the parser, each adapter's idiom, and a panel feature.
