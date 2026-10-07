# ADR-0004 — One shape for the three CSS flavours

## Context

Every code export comes in vanilla CSS, Tailwind and Bootstrap 5. The three
adapters (`apps/builder/src/export/css/*`) were written as "the same form,
each framework's look", and the look drifted into three different forms:
three page widths, three type scales (Tailwind's preflight left headings
at body size, Bootstrap's ran to 2rem), 14px controls beside 16px ones,
Bootstrap's choice buttons stretched across the row and its choice blocks
hid their check box, labels and help text on different line heights.
Measured with `tools/proof/parity-check.sh`, 936 computed-style metrics
differed between the flavours on the kitchen sink and 237 on the examples'
event-registration form. The user's words: "Vanilla CSS, Tailwind and
Bootstrap 5 is not fully identical in form."

## Decision

**The three flavours render the same form**: identical structure, layout,
sizes, spacing, typography, visible indicators and states. **Only colours
and each framework's control skin stay its own** (palette, focus ring,
check-mark and chevron artwork, Bootstrap's `data-bs-theme` colour mode);
a themed form (`meta.theme`) colours all three through the existing bridges.

The spec every adapter implements (the vanilla stylesheet and the
renderer's `styles.css` are its reference and change together):

| Part | Value |
|---|---|
| Form root | fills its host, padding 1rem, line-height 1.5, 16px system font; the HTML export centres it at 42rem (border-box) with 1.5rem 1rem page padding |
| Grid | 12 columns, 1rem gap; tablet 768px, desktop 1024px (Bootstrap 992px, accepted) |
| Field | column, 0.375rem between label, control, description, error; a fieldset legend 0.375rem above its options |
| Label, legend, item label | 0.875rem / 1.25rem, weight 600; required marker 0.125rem after the text |
| Control (input, textarea, select, tags, calculated, phone) | 1rem / 1.5, padding 0.375rem 0.75rem, 1px border, 0.375rem radius: 38px tall; sm 0.875rem with 0.25rem 0.5rem (31px), lg 1.25rem with 0.5rem 1rem (48px); native selects and date inputs forced to those heights |
| Description, error, help texts | 0.875rem / 1.25rem, no margins |
| Choice rows (lists, single check, switch) | 1rem / 1.5rem text, 1rem box, text 1.5rem from the row start, 0.375rem between rows; switch 2.25 × 1.25rem |
| Choice blocks | bordered rows, 0.5rem 0.75rem padding, 0.75rem gap, visible check, selected = primary border + 1px ring, 0.5rem apart |
| Choice buttons | hug their text, 0.875rem / 1.25rem, weight 600, 0.5rem 1rem padding, joined borders |
| Headings (element and inside HTML blocks) | h1 1.875rem, h2 1.5rem, h3 1.25rem, h4 1.125rem, h5 1rem, h6 0.875rem; weight 600; line-height 1.25; margin 0 (HTML blocks: 0.75em 0 0.375em, sizes 1.5/1.3/1.15em) |
| Paragraph, formatted paragraph | 1rem / 1.5rem, muted, margin 0; 0.5em between blocks |
| Group, repeater item | 1rem padding, 1px border, 0.375rem radius; legend on the border |
| Buttons (submit, secondary, danger, add, pair, step) | 1rem / 1.5, weight 600, 0.375rem 1rem, 1px border: 38px; repeater move 2rem square; rich-text toolbar 0.875rem / 1.25rem, 0.25rem 0.5rem, min 2rem |
| Tabs | underline tabs, 0.875rem / 1.25rem, weight 600, 0.5rem 1rem, 0.25rem apart, 2px marker |
| Steps | 0.875rem, 1rem apart |
| Tags | box 0.375rem 0.5rem with a 1.5-line input; chips 0.75rem / 1rem |
| Matrix | 0.875rem, cells 0.5rem padding on a 1.25rem line, 1rem boxes, 1px line above each row |
| Ranges | 1.5rem tall, no margins; colour input 3 × 2.375rem |
| Date range | a wrapping flex row, 0.5rem gap, inputs flex 1 1 10rem |
| File zone, rich-text editor, signature pad, map | border-box, 4.5rem / 6rem minimums, 0.5rem 0.75rem editor padding |
| Divider | 1px, 0.25rem margins |
| Quote | 4px start border, 1rem start padding, 1rem / 1.5rem italic, cite 0.875rem |
| Payload | 0.875rem, 1rem padding, 0.375rem radius |

Where stock classes cannot express a value, a small parity stylesheet
carries it: Bootstrap's spacing scale has no 0.375rem step, its headings
and `fs-*` are responsive, `.btn`/`.nav-link` sizes come from variables
that beat the `small` utility, and `.border` colours are `!important`. So
every Bootstrap export ships `BOOTSTRAP_PARITY_CSS` (`composite.ts`),
scoped by `fg-*` hook classes beside the Bootstrap classes, and the two
framework flavours ship the HTML-block rules when the form has an HTML
block. Tailwind needs no stylesheet: arbitrary values and variants
(`h-[2.375rem]`, `[&>legend]:mb-1.5`, `has-[:checked]:`) cover it.

Markup changes that came with it: the heading slot takes a `level`
modifier (`SlotMods.level`), `choiceLayout` is decided per display
(Bootstrap's buttons keep the `.btn-check + .btn` siblings, its blocks wrap
the input in the label like the other flavours), Bootstrap tabs use
`nav-underline`, its date-range pair is a flex row instead of an input
group, and its form root is `p-3` instead of `container`.

## Alternatives considered

- Keep "each framework's look" and only fix the obvious outliers: the
  user asked for identical forms, and half measures leave the widths,
  scales and rhythms apart.
- Move vanilla and Tailwind to Bootstrap's metrics wholesale: done where
  Bootstrap's native metric was as good (38px controls, 1rem gutters,
  0.25rem legend padding); kept vanilla's where Bootstrap's is an accident
  of its utility scale (6px field gaps, 14px labels).
- Pixel-identical Bootstrap through a full override stylesheet: it would
  stop looking like Bootstrap; the parity rules touch metrics only.
- Automatic dark mode for Bootstrap exports (`data-bs-theme` from
  `prefers-color-scheme`): a runtime feature in four targets, out of scope;
  Bootstrap's colour mode stays the host page's choice.

## Consequences

- `tools/proof/parity-check.sh` reports IDENTICAL metrics (1px tolerance)
  for the kitchen sink and the examples form at 1200px and 390px; it is the
  regression check for any adapter change.
- Bootstrap exports always carry a stylesheet (`<style>` in HTML, a
  `.css` file beside the React component, `<style scoped>` in Vue, a
  `.razor.css` in Blazor); the generated READMEs name it.
- The renderer (the builder's preview) changed with vanilla: 38px controls,
  14px help text, line-height 1.5, explicit heading sizes.
- Accepted differences: Bootstrap's desktop breakpoint (992px), its select
  chevron padding and focus ring, its colour mode, font-family stacks that
  resolve to the same system font, and 1px rounding where 14px text sits
  on Bootstrap's 1.5 line (21px) against 20px.
- Host pages that styled the old Bootstrap tab markup (`nav-tabs`) or
  relied on Bootstrap's `input-group` for date ranges must follow the new
  markup.
