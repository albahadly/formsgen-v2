// Compares metrics.mjs outputs of the same form in different CSS flavours:
//   node metrics-compare.mjs <vanilla.json> <tailwind.json> <bootstrap5.json> [--colors] [--tolerance 1]
// Prints every metric where the flavours disagree by more than the tolerance
// (pixels; strings must be equal). Colour and font-family keys are skipped
// unless --colors is given. Exit status 1 when anything differs.
import { readFileSync } from 'node:fs'
const args = process.argv.slice(2)
const colors = args.includes('--colors')
const tol = Number(args.includes('--tolerance') ? args[args.indexOf('--tolerance') + 1] : 1)
const files = args.filter((a) => a.endsWith('.json'))
const names = files.map((f) => f.replace(/.*\//, '').replace(/\.json$/, ''))
const data = files.map((f) => JSON.parse(readFileSync(f, 'utf8')))
const SKIP = /color|background|fontFamily|^url$|classes|hint|labelText|text$|^key$|^tag$|^id$|^path$|inHtmlBlock|^i$/i
const rows = []
function walk(path, values) {
  const present = values.filter((v) => v !== undefined)
  if (present.length === 0) return
  if (present.every((v) => v === null || typeof v !== 'object')) {
    const last = path[path.length - 1]
    if (!colors && SKIP.test(last)) return
    const nums = present.map((v) => (typeof v === 'number' ? v : null))
    let differs
    if (nums.every((n) => n !== null) && nums.length === values.length) differs = Math.max(...nums) - Math.min(...nums) > tol
    else differs = new Set(values.map((v) => JSON.stringify(v))).size > 1
    if (differs) rows.push({ path: path.join('.'), values })
    return
  }
  if (present.every((v) => Array.isArray(v))) {
    const max = Math.max(...present.map((v) => v.length))
    for (let i = 0; i < max; i++) walk([...path, present[0][i]?.tag ?? present[0][i]?.key ?? present[0][i]?.hint ?? i], values.map((v) => v?.[i]))
    return
  }
  const keys = new Set(present.flatMap((v) => Object.keys(v)))
  for (const key of keys) walk([...path, key], values.map((v) => v?.[key]))
}
walk([], data.map((d) => d.normal))
walk(['errors'], data.map((d) => d.errors))
if (rows.length === 0) {
  console.log(`IDENTICAL metrics across ${names.join(', ')} (tolerance ${tol}px)`)
} else {
  console.log(`| metric | ${names.join(' | ')} |`)
  console.log(`|---|${names.map(() => '---').join('|')}|`)
  for (const r of rows) console.log(`| ${r.path} | ${r.values.map((v) => (v === undefined ? '—' : JSON.stringify(v))).join(' | ')} |`)
  console.log(`\n${rows.length} differing metrics across ${names.join(', ')} (tolerance ${tol}px)`)
  process.exit(1)
}
