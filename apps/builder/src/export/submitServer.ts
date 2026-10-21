// The sample submission server (packages/submit-server), offered with code
// exports: a single dependency-free Node file that receives what the form
// sends and stores it, for trying a form end to end before a real backend.

import type { FormSchema } from '@albahadly/formsgen-renderer'
import source from '../../../../packages/submit-server/server.mjs?raw'
import type { ExportedFile } from './targets/types'

export const SAMPLE_SERVER_URL = 'http://localhost:4180/submit'

export function sampleServerReadme(schema: FormSchema): string {
  const url = schema.meta.submit?.url
  const posts = url === SAMPLE_SERVER_URL
  return `# Sample submission server

A small Node server (no dependencies, Node 20 or newer) that receives what
this form sends and stores it, so you can try the form end to end before
wiring a real backend.

## Run it

\`\`\`sh
node server/server.mjs
\`\`\`

It listens on http://localhost:4180/. Options: \`--port 4180\`,
\`--dir ./submissions\`, \`--origin *\` (CORS) and \`--max-mb 25\`.

${posts ? `This form already posts to \`${SAMPLE_SERVER_URL}\`.` : `Set the form's submit URL (Settings → Submit URL in the builder) to \`${SAMPLE_SERVER_URL}\`, then export again.${url ? ` It currently posts to \`${url}\`.` : ''}`}

## What it does

- **POST or PUT** on any path stores a submission: JSON bodies, form-encoded
  bodies, or multipart (a JSON \`data\` part plus one part per file, named by
  the field's data path, as the exported forms send).
- Each submission goes to \`submissions/<id>/submission.json\`, with its files
  in \`submissions/<id>/files/\`. The reply is \`201 {"ok": true, "id": "…"}\`.
- **http://localhost:4180/** lists the submissions with their files;
  **/submissions** returns them as JSON.

${
    schema.meta.captcha
      ? `
## Spam check

This form sends a Cloudflare Turnstile token with its answers
(\`cf-turnstile-response\`). Start the server with the secret key that goes
with the form's site key, and it stores only submissions Cloudflare confirms
(the token itself is not stored):

\`\`\`sh
TURNSTILE_SECRET=your-secret-key node server/server.mjs
\`\`\`

With Cloudflare's test site key (\`1x00000000000000000000AA\`) use the test
secret \`1x0000000000000000000000000000000AA\`.
`
      : ''
  }
It is meant for local testing: there is no authentication or rate limiting.
Use it as a starting point for your own backend.
`
}

export function sampleServerFiles(schema: FormSchema): ExportedFile[] {
  return [
    { path: 'server/server.mjs', content: source, language: 'javascript' },
    { path: 'server/README.md', content: sampleServerReadme(schema), language: 'markdown' },
  ]
}
