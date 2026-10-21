# Phase 40: after submit

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout; two 12-runtime matrices
(`demos/thanks.json`, `demos/redirect.json`), recorded under "How to
verify".

## What was built

- **`meta.afterSubmit`** (ADR-0002 log): `message` and/or `redirectUrl`.
  Once the answers were sent — a 2xx from the submit URL, or validation
  passing when the form has none — the **thank-you message replaces the
  form**, with the answers piped in like a paragraph (`Thanks,
  {full_name}!`) and a "Send another response" button that resets the
  form and brings it back; or the **page goes to the address** (http(s)
  or relative, validated by the parser; it wins when both are set).
- **Renderer**: `afterSubmit.ts` (`afterSubmitOf`, `isRedirectUrl`);
  `FormsGenForm` gets a `sent` prop and an `again` event — the host says
  the send succeeded, the form swaps its body for the thank-you
  (`role="status"`, so it is announced), and tells the host when the
  visitor wants another go. Redirecting stays the host's job.
- **Exports**, one emitter module `apps/builder/src/export/afterSubmit.ts`:
  the block per language from the answers-in-text machinery (`pipeMarkup`),
  the root marked `data-fg-sent` and one CSS rule hiding every other child
  (`[data-fg-sent] > :not([data-fg-thanks]) { display: none }` — an inline
  `<style>` in the HTML head, a `<style>` child in React and Blazor, the
  scoped block in Vue), success hooks in each target's three send branches
  (progress upload, fetch, no address), after a saved draft was forgotten;
  the reset function is emitted whenever a message exists. Blazor injects
  `NavigationManager` only for a redirect. The vue-lib host sets `sent` /
  navigates. When nothing is configured every target's output is
  byte-identical to before (the examples did not drift).
- **Builder**: Settings → "After submit": the message (textarea, hint about
  `{field}`) and "Then go to" (kept only when it is an address a page may
  go to; otherwise a warning and the stored value stays). The preview shows
  the thank-you and resets on "Send another response"; a redirect is only
  announced ("The page would go to …") — the preview never navigates.
- **Sample server** (`packages/submit-server`): `--webhook <url>` posts
  every stored submission on as JSON (the record as written, file bodies
  not included), fire and forget; with `WEBHOOK_SECRET` the body is signed
  (`X-FormsGen-Signature: sha256=<HMAC-SHA256 hex>`). Tested with a
  receiver.
- **Kitchen sink**: `afterSubmit.message` with a piped name.
- **Tests**: renderer parse + mount; `export/targets/afterSubmit.test.ts`
  (every target, redirect wins, draft order, no-address success, nothing
  emitted otherwise, answer helpers for a piped message); builder test for
  the settings fields, the preview thank-you and the redirect note; server
  webhook test.

## What was intentionally NOT done

- No autoresponder email: the sample server has no mail transport; a
  webhook receiver can send one.
- The thank-you uses existing style slots (`group`, `paragraph`,
  `buttonSecondary`): no new CSS slot, so ADR-0004's parity is untouched.
- No "message then redirect after n seconds": the redirect simply wins.
- Redirecting with the answers appended to the address was not added
  (prefill in reverse); a webhook or the redirect target's own session
  covers it.

## Key decisions & why

- **Success means the server said yes.** The thank-you after a failed
  post would lie; so the hooks sit in the response branches, and without
  a submit address passing validation is the success (the demo case).
- **The draft is forgotten first.** Otherwise "Send another response"
  would restore the answers just sent.
- **Hide, don't unmount.** The exports keep the form in the DOM under a
  `display: none` rule, so maps, signature pads and editors keep their
  state and "Send another response" is a reset, not a re-initialisation.
  The renderer, a component with its own lifecycle, swaps the body.
- **Validation in the builder, not just the parser.** A `mailto:` or
  `javascript:` address never reaches the schema.

## How to verify

```sh
pnpm verify
node packages/submit-server/server.mjs --port 4280 --dir /tmp/subs &
for d in thanks:ThanksDemoForm:thanks_demo redirect:RedirectDemoForm:redirect_demo; do
  IFS=: read -r demo comp base <<< "$d"
  bash tools/proof/export-demo.sh tools/proof/demos/$demo.json tools/proof/work/$demo
  bash tools/proof/strict.sh tools/proof/work/$demo $comp
  bash tools/proof/run-matrix.sh tools/proof/work/$demo $comp $base tools/proof/e2e/$demo.mjs $demo
done
```

`thanks` fills the form, submits, and expects the thank-you with the
answers piped in, the field and the submit button gone, the answers stored
by the sample server, and after "Send another response" the form back and
empty. `redirect` submits and expects the page at the sample server's
address (its "Submissions" page) with no thank-you. Expected: 12 ×
IDENTICAL each.

Recorded 2026-10-21 on the Windows checkout (Edge via `PLAYWRIGHT_CHANNEL`,
.NET SDK 10 building the net8.0 host). `thanks`: 16 exports, strict clean
(Blazor 0 errors 0 warnings ×3), **12 × IDENTICAL, no page errors** —
baseline `sent: { thanks 1, thanksText "Thanks, Ada! We will write to
ada@example.com.", field 0, submit 0 }`, `again: { thanks 0, field 1,
submit 1, name "" }`, server `{ full_name, email }`. `redirect`: strict
clean, **12 × IDENTICAL** — `arrived true, title "Submissions", noThanks
true`, server `{ full_name }`. The first `thanks` run caught a real
defect: the Vue Tailwind flavour rendered `undefined[data-fg-sent]`
(no component stylesheet to interpolate), fixed and covered by a test.

## Known issues / gotchas

- A new child of the form root in an export must either be part of the
  form (hidden with it) or carry `data-fg-thanks`; the rule hides every
  other direct child.
- In React the thank-you renders inside the `<form>` (it needs the root
  attribute); its button is `type="button"`, so it never submits.
- The preview's thank-you resets when the form is edited (the form
  remounts) — by design, the same as the payload box.

## Pointers for the next phase

- Phase 41 (server-side validation export: zod + JSON Schema) is next on
  the user's roadmap (`PROGRESS.md`).
