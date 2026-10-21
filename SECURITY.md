# Security

If you find a vulnerability in the builder (builder.albahadly.com), the
renderer, the CLI or the exports they generate, please report it
privately rather than in a public issue:

- GitHub: *Security* → *Report a vulnerability* on this repository
  (private advisory), or
- email the maintainer at the address on the npm profile
  https://www.npmjs.com/~albahadly.

Please include the affected package and version (`@albahadly/formsgen-renderer`,
`@albahadly/formsgen-cli`, or the builder), steps to reproduce, and the
impact you see. You will get an acknowledgement, and a fix or a
mitigation note before any public disclosure.

## Scope notes

- Generated forms post answers wherever `meta.submit.url` points; the
  sample server in `packages/submit-server` is a demo, not a hardened
  service.
- The address field asks the provider named in its `suggestUrl`
  (OpenStreetMap's Nominatim by default) from the visitor's browser.
- HTML blocks and rich text are sanitised by `parseSafeHtml`; a bypass
  there is in scope.
