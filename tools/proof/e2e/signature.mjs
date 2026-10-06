// Drives the signature demo in any runtime: required check, drawing,
// typing, Clear, pads in items, reset, then a submit stored by the sample
// server (FG_SUBMIT_PORT, 4280).
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 1600 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()) })
await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'networkidle' })
await page.waitForSelector('#fg_signature')
if (kind === 'blazor') await page.waitForTimeout(2500)
const slow = kind === 'blazor' ? 700 : 250
const wait = () => page.waitForTimeout(slow)
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const pads = () => page.evaluate(() => [...document.querySelectorAll('canvas[data-fg-signature]')].map((c) => {
  const ctx = c.getContext('2d')
  const data = c.width && c.height ? ctx.getImageData(0, 0, c.width, c.height).data : []
  let ink = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++
  const typed = c.closest('[data-fg-sign]').querySelector('[data-fg-sign-type]')
  return { id: c.id, ink: ink > 0, typed: typed ? typed.value : null, label: c.getAttribute('aria-label'), touchAction: getComputedStyle(c).touchAction, height: Math.round(c.clientHeight / 10) * 10 }
}))
const errorText = async () => (await page.locator('#fg_signature').locator('xpath=ancestor::fieldset[1]').textContent()).includes('This field is required') ? 'required' : ''
async function draw(id, strokes) {
  const box = await page.locator('#' + id).boundingBox()
  for (const stroke of strokes) {
    const [first, ...rest] = stroke
    await page.mouse.move(box.x + first[0], box.y + first[1])
    await page.mouse.down()
    for (const [x, y] of rest) await page.mouse.move(box.x + x, box.y + y, { steps: 4 })
    await page.mouse.up()
  }
  await wait()
}
// The newest submission once one newer than `before` arrives (up to 15 s).
async function newest(before) {
  for (let i = 0; i < 60; i++) {
    const list = await (await fetch(`${SUBMIT}/submissions`)).json()
    if (list[0] && list[0].id !== before) return list[0]
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return null
}
const lastId = async () => ((await (await fetch(`${SUBMIT}/submissions`)).json())[0] || {}).id
const r = {}
r.start = await pads()
await fill('fg_full_name', 'Ana Lima')
async function fill(id, v) { await page.locator('#' + id).fill(v); await page.locator('#' + id).blur(); await wait() }
await page.locator('button[type=submit]').click(); await wait()
r.requiredError = await errorText()
await draw('fg_signature', [[[20, 60], [60, 30], [100, 80], [140, 40]], [[160, 70], [220, 70]]])
r.drawn = { pads: await pads(), error: await errorText(), note: norm(await page.getByText('Signed:').textContent()) }
await draw('fg_witnesses_0_wsig', [[[30, 40], [120, 60]]])
await page.getByRole('button', { name: 'Add witness', exact: true }).click(); await wait()
await draw('fg_witnesses_1_wsig', [[[30, 40], [90, 20]]])
r.items = await pads()
await page.locator('#fg_witnesses_1_wsig').locator('xpath=ancestor::*[@data-fg-sign][1]').locator('[data-fg-sign-clear]').click(); await wait()
r.clearedItem = await pads()
await page.locator('[data-fg-sign-type]').first().fill('Ana Lima'); await wait(); await wait()
r.typed = await pads()
await page.getByRole('button', { name: 'Start over', exact: true }).click(); await wait(); await wait()
r.reset = { pads: await pads(), name: await page.locator('#fg_full_name').inputValue() }
await fill('fg_full_name', 'Bo Chen')
await draw('fg_signature', [[[30, 50], [90, 90], [150, 40]]])
await draw('fg_witnesses_0_wsig', [[[20, 30], [100, 50]]])
if (shot) await page.screenshot({ path: shot, fullPage: true })
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
if (latest) {
  const png = new Uint8Array(await (await fetch(`${SUBMIT}/submissions/${latest.id}/files/0`)).arrayBuffer())
  r.server = {
    contentType: latest.contentType,
    data: latest.data,
    files: latest.files.map((f) => [f.field, f.name, f.type, f.size > 200]),
    png: [...png.slice(1, 4)].map((b) => String.fromCharCode(b)).join(''),
  }
} else r.server = null
r.errors = errors
console.log(JSON.stringify(r, (k, v) => (k === 'size' ? undefined : v), 1))
await browser.close()
