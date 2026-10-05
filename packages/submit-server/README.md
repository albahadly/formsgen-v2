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
- `--max-mb 25` caps the request size (413 above it).

The builder's export dialog can add this file to a code export's ZIP
("Sample server"), with a README. Tests: `node --test`.

It is for local testing: no authentication, rate limiting or spam checks.
