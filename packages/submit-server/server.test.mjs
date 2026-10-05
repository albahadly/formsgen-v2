// node --test: the sample server stores JSON, form-encoded and multipart submissions.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { createSubmitServer, parseMultipart } from './server.mjs'

let server
let base
let dir
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fg-submit-'))
  server = createSubmitServer({ dir, maxMb: 1, log: () => {} })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  server.close()
  await rm(dir, { recursive: true, force: true })
})

test('a JSON submission is stored and listed', async () => {
  const res = await fetch(`${base}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ana', guests: [{ g: 'Bo' }] }) })
  assert.equal(res.status, 201)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  const { ok, id } = await res.json()
  assert.equal(ok, true)
  const record = JSON.parse(await readFile(join(dir, id, 'submission.json'), 'utf8'))
  assert.deepEqual(record.data, { name: 'Ana', guests: [{ g: 'Bo' }] })
  assert.equal(record.method, 'POST')
  assert.equal(record.path, '/submit')
  const list = await (await fetch(`${base}/submissions`)).json()
  assert.equal(list[0].id, id)
})

test('multipart: the JSON data part plus files, downloadable by index', async () => {
  const body = new FormData()
  body.append('data', JSON.stringify({ name: 'Ana', cv: [{ name: 'cv.pdf' }] }))
  body.append('cv', new Blob(['%PDF-1.7 bytes'], { type: 'application/pdf' }), 'cv.pdf')
  body.append('people.0.photo', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), '../../evil name.png')
  const res = await fetch(`${base}/anything`, { method: 'PUT', body })
  assert.equal(res.status, 201)
  const { id } = await res.json()
  const record = JSON.parse(await readFile(join(dir, id, 'submission.json'), 'utf8'))
  assert.deepEqual(record.data, { name: 'Ana', cv: [{ name: 'cv.pdf' }] })
  assert.deepEqual(record.files.map((f) => [f.field, f.name, f.size, f.type]), [
    ['cv', 'cv.pdf', 14, 'application/pdf'],
    ['people.0.photo', '../../evil name.png', 3, 'image/png'],
  ])
  // Stored inside the submission's folder whatever the name says.
  assert.deepEqual((await readdir(join(dir, id, 'files'))).sort(), ['0-cv.pdf', '1-evil name.png'])
  const file = await fetch(`${base}/submissions/${id}/files/0`)
  assert.equal(await file.text(), '%PDF-1.7 bytes')
  assert.match(file.headers.get('content-disposition'), /attachment; filename="cv.pdf"/)
})

test('form-encoded bodies, the listing page, preflight and limits', async () => {
  const res = await fetch(`${base}/submit`, { method: 'POST', body: new URLSearchParams({ a: '1', b: '<x>' }) })
  assert.equal(res.status, 201)
  const page = await (await fetch(`${base}/`)).text()
  assert.match(page, /<h1>Submissions \(3\)<\/h1>/)
  assert.match(page, /&lt;x&gt;/)
  assert.doesNotMatch(page, /"<x>"/)
  const preflight = await fetch(`${base}/submit`, { method: 'OPTIONS' })
  assert.equal(preflight.status, 204)
  assert.match(preflight.headers.get('access-control-allow-headers'), /Content-Type/)
  const big = await fetch(`${base}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: 'x'.repeat(1.5 * 1024 * 1024) }) }).catch(() => null)
  if (big) assert.equal(big.status, 413)
  assert.equal((await fetch(`${base}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' })).status, 400)
  assert.equal((await fetch(`${base}/submit`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hi' })).status, 415)
  assert.equal((await fetch(`${base}/submissions/../../etc/files/0`)).status, 404)
  assert.equal((await fetch(`${base}/submissions`)).status, 200)
})

test('a JSON blob named data is the answers too', async () => {
  const body = new FormData()
  body.append('data', new Blob(['{"a":1}'], { type: 'application/json' }))
  const { id } = await (await fetch(`${base}/submit`, { method: 'POST', body })).json()
  const record = JSON.parse(await readFile(join(dir, id, 'submission.json'), 'utf8'))
  assert.deepEqual([record.data, record.files], [{ a: 1 }, []])
})

test('multipart parsing keeps binary bodies intact', () => {
  const body = Buffer.concat([
    Buffer.from('--b\r\nContent-Disposition: form-data; name="f"; filename="x.bin"\r\nContent-Type: application/octet-stream\r\n\r\n'),
    Buffer.from([0, 13, 10, 45, 45, 255]),
    Buffer.from('\r\n--b--\r\n'),
  ])
  const [part] = parseMultipart(body, 'multipart/form-data; boundary="b"')
  assert.deepEqual([...part.body], [0, 13, 10, 45, 45, 255])
  assert.equal(part.filename, 'x.bin')
})
