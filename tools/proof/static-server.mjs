// Static file server for the proof matrix with a tiny submission endpoint.
//
//   node static-server.mjs <dir> [port]      (default port 4180, bound on 0.0.0.0)
//
// Serves the files of <dir> (the exported HTML/React/Vue bundles) and records
// what a form posts to /submit so the e2e scripts can read it back:
//   POST|PUT /submit   accepts JSON or multipart; file parts are reduced to
//                      {name, filename, type, size, sha1} so results compare.
//   GET /last          returns the last recorded submission (and clears it).
//   GET /mode?delay=ms&fail=1   how the next submissions are answered
//                      (slow, failing) to exercise the pending/error states.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'

const root = process.argv[2]
const port = Number(process.argv[3] ?? 4180)
if (!root) {
  console.error('usage: node static-server.mjs <dir> [port]')
  process.exit(2)
}
let last = null
// /mode?delay=ms&fail=1 — how the next submissions are answered (slow, failing).
let mode = { delay: 0, fail: false }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', '*'); res.end(); return }
  if (req.url.startsWith('/mode')) {
    const q = new URL(req.url, 'http://local').searchParams
    mode = { delay: Number(q.get('delay') ?? 0), fail: q.get('fail') === '1' }
    res.end('ok'); return
  }
  if (req.url === '/submit' && (req.method === 'POST' || req.method === 'PUT')) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] ?? ''
    const record = { method: req.method, contentType: contentType.split(';')[0], parts: [] }
    if (contentType.startsWith('multipart/')) {
      let form
      try {
        form = await new Request('http://local/', { method: 'POST', headers: { 'content-type': contentType }, body }).formData()
      } catch (error) {
        console.log('UNPARSABLE', contentType, JSON.stringify(body.toString('latin1').slice(0, 700)))
        last = { error: String(error) }
        res.statusCode = 400; res.end(); return
      }
      for (const [name, value] of form.entries()) {
        if (typeof value === 'string') record.parts.push({ name, json: JSON.parse(value) })
        else {
          const bytes = Buffer.from(await value.arrayBuffer())
          record.parts.push({ name, filename: value.name, type: value.type, size: bytes.length, sha1: createHash('sha1').update(bytes).digest('hex').slice(0, 10) })
        }
      }
    } else record.json = JSON.parse(body.toString())
    if (mode.delay) await new Promise((r) => setTimeout(r, mode.delay))
    if (mode.fail) { res.statusCode = 500; res.end('{"ok":false}'); return }
    last = record
    res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}'); return
  }
  if (req.url === '/last') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(last)); last = null; return }
  try {
    const file = await readFile(join(root, decodeURIComponent(req.url.split('?')[0])))
    res.setHeader('Content-Type', types[extname(req.url.split('?')[0])] ?? 'application/octet-stream'); res.end(file)
  } catch { res.statusCode = 404; res.end('not found') }
}).listen(port, '0.0.0.0', () => console.log(`listening ${port}`))
