// The server-side rules against real submissions: every submission the sample
// server stored under <submissions-dir> that belongs to the form (its keys are
// the form's fields, the required ones present) is validated with the
// "Validation" export in <outdir> — the zod schema (transpiled by esbuild and
// run with the real zod) and the JSON Schema (ajv, formats on). Prints a JSON
// object; exits 1 when a submission fails or none matched.
//   node server-validate.mjs <outdir> <submissions-dir>
// <outdir> holds validation-<name>.zod.ts and validation-<name>.schema.json,
// written by export-demo.sh beside the twelve code exports.
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { transformSync } from 'esbuild'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [outArg, subsArg] = process.argv.slice(2)
if (!outArg || !subsArg) { console.error('usage: node server-validate.mjs <outdir> <submissions-dir>'); process.exit(2) }
const outDir = resolve(outArg)
const subsDir = resolve(subsArg)
const zodFile = readdirSync(outDir).find((f) => f.startsWith('validation-') && f.endsWith('.zod.ts'))
const jsonFile = readdirSync(outDir).find((f) => f.startsWith('validation-') && f.endsWith('.schema.json'))
if (!zodFile || !jsonFile) { console.error(`server-validate: no validation-*.zod.ts / .schema.json in ${outDir}`); process.exit(2) }

// zod: the TypeScript module as ESM next to the export; "zod" resolves from tools/proof.
const modulePath = join(outDir, zodFile.replace(/\.ts$/, '.mjs'))
writeFileSync(modulePath, transformSync(readFileSync(join(outDir, zodFile), 'utf8'), { loader: 'ts', format: 'esm' }).code)
const exported = await import(pathToFileURL(modulePath).href)
const zodSchema = Object.values(exported).find((v) => v && typeof v === 'object' && typeof v.safeParse === 'function')
if (!zodSchema) { console.error('server-validate: the zod module exports no schema'); process.exit(2) }

const json = JSON.parse(readFileSync(join(outDir, jsonFile), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(json)
const known = new Set(Object.keys(json.properties ?? {}))
// A submission of this form carries every field the form always shows: the
// zod shape's non-optional keys (a field under a condition is optional).
let shaped = zodSchema
while (shaped && shaped._def && shaped._def.schema) shaped = shaped._def.schema
const mandatory = Object.entries(shaped.shape ?? {}).filter(([, type]) => !type.isOptional()).map(([key]) => key)

const records = readdirSync(subsDir)
  .map((id) => join(subsDir, id, 'submission.json'))
  .filter(existsSync)
  .map((path) => JSON.parse(readFileSync(path, 'utf8')))
const belongs = (data) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0 && Object.keys(data).every((k) => known.has(k)) && mandatory.every((k) => k in data)
const matched = records.filter((r) => belongs(r.data))
const failures = []
for (const record of matched) {
  const zod = zodSchema.safeParse(record.data)
  const ok = validate(record.data)
  if (!zod.success || !ok) {
    failures.push({
      id: record.id,
      zod: zod.success ? null : zod.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      ajv: ok ? null : (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`),
    })
  }
}
console.log(JSON.stringify({ form: json.title, records: records.length, matched: matched.length, failures }, null, 2))
process.exit(failures.length === 0 && matched.length > 0 ? 0 : 1)
