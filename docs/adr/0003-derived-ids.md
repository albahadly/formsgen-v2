# ADR-0003 — Ids derived from a field's id use a `-` separator

## Context

Exported forms give every field the id `fg_<key>` (the data path with `.`
replaced by `_`). The ids of a field's parts were built with another `_`:
choice options (`fg_diet_other`), matrix cells (`fg_rating_0_1`), legends,
tooltips and add-ons (`fg_plan_legend`, `fg_price_tip`, `fg_price_prefix`),
the "to" input of ranges and date ranges (`fg_stay_to`), the longitude box
(`fg_place_lng`), the rich-text label (`fg_about_label`) and the error line
(`fg_err_<key>`). Field names may contain `_`, so a field named `diet_other`
next to a choice field `diet` with an option `other` produced two elements
with the id `fg_diet_other`: the textarea's `<label for>` pointed at the
radio, the radio's accessible name grew, and axe reports a duplicate id.
The examples' template (Phase 36) has exactly that pair; `<field>_<option>`
is a natural naming pattern, as is `err_<field>` or `<slider>_to`.

The renderer builds ids from node ids (`fg-<nodeId>`), which may contain
`-` (nanoid), so a node `er-diet` with an option `other` and a node
`er-diet-other` collided the same way (`fg-er-diet-other`).

## Decision

- **Exports:** every id derived from a field's id joins with `-`:
  `fg_diet-other`, `fg_rating-0-1`, `fg_plan-legend`, `fg_price-tip`,
  `fg_price-prefix`, `fg_price-suffix`, `fg_stay-to`, `fg_place-lng`,
  `fg_about-label`, `fg_<key>-err`. Field names match
  `^[A-Za-z][A-Za-z0-9_]*$` and keys add only `_` and the repeater index
  tokens, so no derived id can equal a field id, and two derived ids are
  equal only for the same field and part. Radio group `name`s are unchanged
  (they are not ids). Field ids themselves (`fg_<key>`) are unchanged.
- **Renderer:** option ids are `fg-<nodeId>-opt-<value>` and matrix cells
  `fg-<nodeId>-cell-<row>-<col>`. The other suffixes (`-legend`, `-tip`,
  `-to`, `-lng`, `-error`, `-prefix`, `-suffix`) stay: builder node ids are
  random, so only hand-written ids such as `x` beside `x-to` could clash.

## Alternatives considered

- Rename the example's field: hides a defect every form with
  `<field>_<option>` naming has.
- A prefix for option ids only (`fgo_`): the same clash exists for every
  other suffix.
- A character outside the id alphabet (`.` or `:`) in renderer ids: needs
  escaping in CSS selectors and tests.

## Consequences

- Generated markup changes for every form with choices, matrices, tooltips,
  add-ons, ranges, date ranges, maps, rich text or error lines. Host CSS or
  scripts that targeted the old ids (`#fg_plan_pro`, `#fg_err_email`) must
  use the new ones (`#fg_plan-pro`, `#fg_email-err`). Nothing inside the
  exports referenced the old ids by string except the HTML runtime's error
  lookup, which was updated.
- Export snapshots, the builder's tests and the proof scenarios
  (`fg_place-lng`) were updated. A remaining, accepted ambiguity: `pathKey`
  maps both `a.b` and `a_b` to `a_b`, so a top-level field named
  `account_username` beside a group `account` holding `username` shares an
  id with it. Keys also name C# members and JavaScript state, so changing
  that mapping is out of scope here; the builder's naming makes it unlikely.
