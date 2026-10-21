# @formsgen/submit-server

A sample server that receives what FormsGen forms send and stores it on disk,
for trying a form end to end before wiring a real backend. One file, no
dependencies, Node 20 or newer.

```sh
node packages/submit-server/server.mjs --port 4180 --dir ./submissions
```

- **POST or PUT** on any path (for example `/submit`) stores a submission:
  JSON, form-encoded, or multipart with a JSON `data` part plus one part per
  file (named by the field's data path), as the exports send.
- Stored as `submissions/<id>/submission.json` plus `files/`; the reply is
  `201 {"ok": true, "id": "…"}`. CORS is open (`--origin` narrows it).
- `GET /` lists submissions, `GET /submissions` returns them as JSON,
  `GET /submissions/<id>/files/<n>` downloads a file.
- `GET /suggest?q=<text>` answers an `address` field's suggestions from a
  short built-in list of places (for demos and the toolkit).
- `--max-mb 25` caps the request size (413 above it).

The builder's export dialog can add this file to a code export's ZIP
("Sample server"), with a README. Tests: `node --test`.

## Spam check (Cloudflare Turnstile)

When the form has a spam check (Settings → Spam check), it sends a
Turnstile token with the answers as `cf-turnstile-response`. Start the
server with your Turnstile secret key and it accepts only submissions whose
token Cloudflare confirms (403 otherwise); the token is not stored:

```sh
TURNSTILE_SECRET=0x4AAA... node packages/submit-server/server.mjs
```

For testing, Cloudflare's test keys work on any site: site key
`1x00000000000000000000AA` (always passes) with secret
`1x0000000000000000000000000000000AA` (always accepts). Without
`TURNSTILE_SECRET` the server stores submissions unchecked.

It is for local testing: no authentication or rate limiting.
