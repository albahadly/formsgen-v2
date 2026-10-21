import type { ExportTarget } from './types'

export const jsonTarget: ExportTarget = {
  id: 'json',
  label: 'JSON schema',
  description: 'The canonical FormsGen schema — re-importable into the builder.',
  frameworkAware: false,
  generate: ({ schema }) => [
    {
      path: `${schema.meta.name}.formsgen.json`,
      content: JSON.stringify(schema, null, 2) + '\n',
      language: 'json',
    },
  ],
  readme: ({ schema }) => `# ${schema.meta.title ?? schema.meta.name}

This is a FormsGen project file (\`formsgen/v2\`).

## Use it

- **Edit it again:** open the FormsGen builder and use *Open* to load this file.
- **Render it in a Vue 3 app** with the \`@albahadly/formsgen-renderer\` package:

\`\`\`ts
import { FormsGenForm } from '@albahadly/formsgen-renderer'
import '@albahadly/formsgen-renderer/style.css'
import schema from './${schema.meta.name}.formsgen.json'
\`\`\`

\`\`\`html
<FormsGenForm :schema="schema" v-model="data" @submit="onSubmit" />
\`\`\`

The renderer package is built from the FormsGen monorepo
(\`packages/renderer\` — \`pnpm build\`, then install the packed tarball or
publish it to your registry).
`,
}
