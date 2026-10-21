import { jsonSchemaOf, validationReadme, zodSource } from '../validation'
import type { ExportTarget } from './types'

export const validationTarget: ExportTarget = {
  id: 'validation',
  label: 'Validation (zod + JSON Schema)',
  description: 'The form’s rules for your server: a zod schema for Node and TypeScript, and a JSON Schema for any language.',
  frameworkAware: false,
  generate: ({ schema }) => [
    { path: `${schema.meta.name}.zod.ts`, content: zodSource(schema), language: 'typescript' },
    { path: `${schema.meta.name}.schema.json`, content: `${JSON.stringify(jsonSchemaOf(schema), null, 2)}\n`, language: 'json' },
  ],
  readme: ({ schema }) => validationReadme(schema),
}
