#!/usr/bin/env node
// FormsGen sample submission server: receives what an exported form sends
// (JSON, or multipart with a JSON "data" part and one part per file),
// stores each submission on disk and lists them at http://localhost:4180/.
//
//   node server.mjs [--port 4180] [--dir ./submissions] [--origin *] [--max-mb 25]
//
// Set the form's submit URL to http://localhost:4180/submit (any path works).
// With TURNSTILE_SECRET set, submissions must carry a passed Cloudflare
// Turnstile check (the form's spam check, "cf-turnstile-response"); the
// token is checked with Cloudflare, then left out of what is stored.
// No dependencies: Node 20 or newer. It is a starting point for local
// testing, not a production backend: no authentication or rate limits.

import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ID = /^\d{13}-[0-9a-f]{6}$/

/** Upload part names are data paths ("docs", "people.0.cv"); stored names are kept short and safe. */
function safeName(name) {
  const base = String(name).split(/[\\/]/).pop() ?? ''
  const cleaned = base.replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '').slice(0, 120)
  return cleaned || 'file'
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

/** Splits a multipart body into parts: { name, filename, type, body }. */
export function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  if (!match) throw new Error('multipart body without a boundary')
  const boundary = Buffer.from(`--${(match[1] ?? match[2]).trim()}`)
  const parts = []
  let start = body.indexOf(boundary)
  while (start !== -1) {
    const next = body.indexOf(boundary, start + boundary.length)
    if (next === -1) break
    // Between "--boundary\r\n" and "\r\n--boundary".
    const chunk = body.subarray(start + boundary.length + 2, next - 2)
    const headerEnd = chunk.indexOf('\r\n\r\n')
    if (headerEnd !== -1) {
      const headers = chunk.subarray(0, headerEnd).toString('utf8')
      const disposition = /content-disposition:([^\r\n]*)/i.exec(headers)?.[1] ?? ''
      const name = /\bname="([^"]*)"/i.exec(disposition)?.[1]
      const filename = /\bfilename="([^"]*)"/i.exec(disposition)?.[1]
      const type = /content-type:\s*([^\r\n]*)/i.exec(headers)?.[1]?.trim() ?? ''
      if (name !== undefined) parts.push({ name, filename, type, body: chunk.subarray(headerEnd + 4) })
    }
    start = next
  }
  return parts
}

function readBody(req, maxBytes) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** The answers and files of a request body, by content type. */
function decode(body, contentType) {
  const type = contentType.split(';')[0].trim().toLowerCase()
  if (type === 'application/json') return { data: JSON.parse(body.toString('utf8') || 'null'), files: [] }
  if (type === 'application/x-www-form-urlencoded') {
    return { data: Object.fromEntries(new URLSearchParams(body.toString('utf8'))), files: [] }
  }
  if (type === 'multipart/form-data') {
    let data = null
    const fields = {}
    const files = []
    for (const part of parseMultipart(body, contentType)) {
      // The answers: a "data" part (text, or a JSON blob some clients send as a file).
      if (part.name === 'data' && (part.filename === undefined || part.type.startsWith('application/json'))) {
        data = JSON.parse(part.body.toString('utf8'))
      } else if (part.filename !== undefined) files.push(part)
      else fields[part.name] = part.body.toString('utf8')
    }
    return { data: data ?? fields, files }
  }
  throw Object.assign(new Error(`unsupported content type ${type || '(none)'}`), { status: 415 })
}

/** The answers' spam-check token field (Cloudflare's own name). */
export const CAPTCHA_FIELD = 'cf-turnstile-response'

/** Asks Cloudflare whether a Turnstile token is good: { success, 'error-codes' }. */
export async function verifyTurnstile(secret, token, ip) {
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  return res.json()
}

/**
 * The server: POST or PUT anywhere stores a submission; GET / lists them,
 * GET /submissions returns them as JSON, GET /submissions/<id>/files/<n>
 * downloads a file.
 */
export function createSubmitServer({
  dir = 'submissions',
  origin = '*',
  maxMb = 25,
  log = console.log,
  turnstileSecret = '',
  verify = verifyTurnstile,
} = {}) {
  const root = resolve(dir)
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
  }
  const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(status, { ...cors, 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...extra })
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
  }

  async function list() {
    let ids = []
    try {
      ids = (await readdir(root)).filter((id) => ID.test(id))
    } catch {
      return []
    }
    const all = await Promise.all(
      ids.map(async (id) => {
        try {
          return JSON.parse(await readFile(join(root, id, 'submission.json'), 'utf8'))
        } catch {
          return null
        }
      }),
    )
    return all.filter(Boolean).sort((a, b) => b.id.localeCompare(a.id))
  }

  async function store(req) {
    const body = await readBody(req, maxMb * 1024 * 1024)
    let decoded
    try {
      decoded = decode(body, req.headers['content-type'] ?? '')
    } catch (error) {
      throw Object.assign(error, { status: error.status ?? 400 })
    }
    // The spam check: the token goes (it works once), after Cloudflare's yes.
    const data = decoded.data && typeof decoded.data === 'object' ? decoded.data : null
    const token = data && typeof data[CAPTCHA_FIELD] === 'string' ? data[CAPTCHA_FIELD] : ''
    if (data) delete data[CAPTCHA_FIELD]
    if (turnstileSecret) {
      if (!token) throw Object.assign(new Error('spam check missing'), { status: 403 })
      let result
      try {
        result = await verify(turnstileSecret, token, req.socket.remoteAddress)
      } catch {
        throw Object.assign(new Error('spam check unavailable'), { status: 503 })
      }
      if (!result || result.success !== true) {
        log(`[formsgen] spam check failed: ${(result?.['error-codes'] ?? []).join(', ') || 'no reason given'}`)
        throw Object.assign(new Error('spam check failed'), { status: 403 })
      }
    }
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`
    const folder = join(root, id)
    await mkdir(join(folder, 'files'), { recursive: true })
    const files = []
    for (const [n, file] of decoded.files.entries()) {
      const stored = `${n}-${safeName(file.filename || 'file')}`
      await writeFile(join(folder, 'files', stored), file.body)
      files.push({ field: file.name, name: file.filename, size: file.body.length, type: file.type, stored })
    }
    const record = {
      id,
      receivedAt: new Date().toISOString(),
      method: req.method,
      path: req.url,
      contentType: (req.headers['content-type'] ?? '').split(';')[0],
      data: decoded.data,
      files,
    }
    await writeFile(join(folder, 'submission.json'), `${JSON.stringify(record, null, 2)}\n`)
    log(`[formsgen] ${record.receivedAt} ${req.method} ${req.url} → ${id} (${files.length} file${files.length === 1 ? '' : 's'})`)
    return record
  }

  function page(records) {
    const rows = records
      .map((r) => {
        const files = r.files
          .map((f, n) => `<li><a href="/submissions/${r.id}/files/${n}">${escapeHtml(f.name)}</a> <small>${escapeHtml(f.field)} · ${f.size} bytes</small></li>`)
          .join('')
        return `<article><h2>${escapeHtml(new Date(r.receivedAt).toLocaleString())} <small>${r.id}</small></h2>
<pre>${escapeHtml(JSON.stringify(r.data, null, 2))}</pre>${files ? `<ul>${files}</ul>` : ''}</article>`
      })
      .join('\n')
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Submissions</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #0f172a; }
  article { border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem 1rem; margin-block: 1rem; }
  h2 { font-size: 1rem; margin: 0 0 0.5rem; } small { color: #64748b; font-weight: normal; }
  pre { background: #f8fafc; padding: 0.75rem; border-radius: 6px; overflow-x: auto; margin: 0; }
</style></head>
<body><h1>Submissions (${records.length})</h1>
<p>Forms post here: any path, for example <code>/submit</code>. Stored in <code>${escapeHtml(root)}</code>.</p>
${rows || '<p>Nothing yet.</p>'}
</body></html>`
  }

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (req.method === 'OPTIONS') return send(res, 204, '')
      if (req.method === 'POST' || req.method === 'PUT') {
        const record = await store(req)
        return send(res, 201, { ok: true, id: record.id })
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { ok: false, error: 'method not allowed' })
      if (url.pathname === '/') return send(res, 200, page(await list()), 'text/html; charset=utf-8')
      if (url.pathname === '/submissions') return send(res, 200, await list())
      const file = /^\/submissions\/([^/]+)\/files\/(\d+)$/.exec(url.pathname)
      if (file && ID.test(file[1])) {
        const record = JSON.parse(await readFile(join(root, file[1], 'submission.json'), 'utf8'))
        const entry = record.files[Number(file[2])]
        if (entry) {
          const body = await readFile(join(root, file[1], 'files', entry.stored))
          return send(res, 200, body, 'application/octet-stream', {
            'Content-Disposition': `attachment; filename="${safeName(entry.name)}"`,
          })
        }
      }
      return send(res, 404, { ok: false, error: 'not found' })
    } catch (error) {
      const status = error.status ?? (error.code === 'ENOENT' ? 404 : 500)
      if (!res.headersSent) send(res, status, { ok: false, error: status === 500 ? 'server error' : error.message })
      if (status === 500) log(`[formsgen] error: ${error.stack ?? error}`)
    }
  })
}

function option(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(option('port', process.env.PORT ?? 4180))
  const dir = option('dir', 'submissions')
  const turnstileSecret = process.env.TURNSTILE_SECRET ?? ''
  const server = createSubmitServer({ dir, origin: option('origin', '*'), maxMb: Number(option('max-mb', 25)), turnstileSecret })
  server.listen(port, () => {
    console.log(`FormsGen submission server: http://localhost:${port}/ (forms post to http://localhost:${port}/submit)`)
    console.log(`Storing submissions in ${resolve(dir)}`)
    if (turnstileSecret) console.log('Spam check: Cloudflare Turnstile tokens are required (TURNSTILE_SECRET is set)')
  })
}
