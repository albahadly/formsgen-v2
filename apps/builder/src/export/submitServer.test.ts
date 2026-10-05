import { parseFormSchema, type FormSchema } from '@formsgen/renderer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SAMPLE_SERVER_URL, sampleServerFiles } from './submitServer'

const schema = (url?: string): FormSchema => {
  const r = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'demo', locale: 'en', dir: 'ltr', ...(url ? { submit: { url } } : {}) }, tree: [] })
  if (!r.ok) throw new Error(r.errors.join())
  return r.schema
}

describe('sample server in code exports', () => {
  it('ships the package file as it is, with a README', () => {
    const [server, readme] = sampleServerFiles(schema())
    expect(server!.path).toBe('server/server.mjs')
    // vitest runs with the builder package as its working directory
    expect(server!.content).toBe(readFileSync(resolve(process.cwd(), '../../packages/submit-server/server.mjs'), 'utf8'))
    expect(readme!.path).toBe('server/README.md')
    expect(readme!.content).toContain('node server/server.mjs')
  })

  it('the README says whether the form already posts to it', () => {
    expect(sampleServerFiles(schema(SAMPLE_SERVER_URL))[1]!.content).toContain(`This form already posts to \`${SAMPLE_SERVER_URL}\`.`)
    const other = sampleServerFiles(schema('https://api.example.com/x'))[1]!.content
    expect(other).toContain(`Set the form's submit URL`)
    expect(other).toContain('It currently posts to `https://api.example.com/x`.')
  })
})
