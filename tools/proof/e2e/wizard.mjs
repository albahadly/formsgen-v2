// Drives the wizard demo in any runtime: a signature drawn with long strokes
// (over Blazor Server's 32 KB message size), rich text and a map on step 1;
// Next and Back re-render the step, and the three values must still show
// (pad ink, editor HTML, coordinate boxes and pin); a condition shows a
// second map; reset; then a submit stored by the sample server (4280).
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 1700 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
const slow = kind === 'blazor' ? 800 : 300
const wait = () => page.waitForTimeout(slow)
const mapReady = (id) => page.waitForFunction((id) => {
  const group = document.getElementById(id)?.closest('[data-fg-loc]')
  return !!group && !!group.fgLocMap && !!group.fgLocMap.map && group.querySelector('.leaflet-container') !== null
}, id, { timeout: 30000 })
await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await page.waitForSelector('#fg_signature')
await mapReady('fg_place')
await page.waitForTimeout(kind === 'blazor' ? 1500 : 500)
const inkOf = (id) => page.evaluate((id) => {
  const c = document.getElementById(id)
  if (!c) return null
  const ctx = c.getContext('2d')
  const data = c.width && c.height ? ctx.getImageData(0, 0, c.width, c.height).data : []
  let ink = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++
  return ink
}, id)
const state = async () => ({
  ink: (await inkOf('fg_signature')) > 200,
  // Blazor shows the editor the cleaned markup of the same bold text after a re-render (<strong> for the typed <b>).
  editor: (await page.evaluate(() => document.getElementById('fg_about')?.innerHTML ?? null))?.replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>') ?? null,
  boxes: await page.evaluate(() => [document.getElementById('fg_place')?.value ?? null, document.getElementById('fg_place_lng')?.value ?? null]),
  pin: await page.evaluate(() => document.getElementById('fg_place')?.closest('[data-fg-loc]')?.querySelectorAll('.fg-location-pin').length ?? null),
  signed: await page.getByText('Thanks for signing.').isVisible().catch(() => false),
  extra: await page.evaluate(() => { const el = document.getElementById('fg_extra_place'); return el ? (el.checkVisibility() ? 1 : 0) : 0 }),
})
async function draw(id, strokes) {
  const box = await page.locator('#' + id).boundingBox()
  for (const stroke of strokes) {
    const [first, ...rest] = stroke
    await page.mouse.move(box.x + first[0], box.y + first[1])
    await page.mouse.down()
    for (const [x, y] of rest) await page.mouse.move(box.x + x, box.y + y, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(kind === 'blazor' ? 900 : 250)
  }
}
async function newest(before) {
  for (let i = 0; i < 60; i++) {
    const list = await (await fetch(`${SUBMIT}/submissions`)).json()
    if (list[0] && list[0].id !== before) return list[0]
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return null
}
const lastId = async () => ((await (await fetch(`${SUBMIT}/submissions`)).json())[0] || {}).id
// Runtimes differ in hiding (HTML keeps hidden nodes, Vue/React remove them): count what is visible.
const visible = (selector) => page.evaluate((selector) => [...document.querySelectorAll(selector)].filter((el) => el.checkVisibility()).length, selector)
const r = {}
r.start = await state()
await page.locator('#fg_full_name').fill('Ana')
// Three long strokes across the whole pad: well over 32 KB as a PNG.
const w = (await page.locator('#fg_signature').boundingBox()).width
const zig = (y0) => Array.from({ length: 14 }, (_, i) => [10 + (i * (w - 20)) / 13, y0 + (i % 2 ? 40 : 0)])
await draw('fg_signature', [zig(20), zig(70), zig(110)])
await page.locator('#fg_about').click()
await page.keyboard.type('I build ')
await page.locator('[data-fg-rt-cmd="bold"]').first().click()
await page.keyboard.type('forms')
await page.locator('#fg_full_name').click(); await wait()
await page.locator('#fg_place').fill('23.6')
await page.locator('#fg_place_lng').fill('58.45')
await page.locator('#fg_full_name').click(); await wait(); await wait()
r.filled = await state()
// Next, then Back: step 1 is rendered again and must show the same values.
await page.getByRole('button', { name: 'Next', exact: true }).click(); await wait(); await wait()
r.step2 = { notes: await visible('#fg_notes'), pad: await visible('#fg_signature') }
await page.getByRole('button', { name: 'Back', exact: true }).click(); await wait()
await mapReady('fg_place')
await page.waitForTimeout(kind === 'blazor' ? 2500 : 1200)
r.back = await state()
// A condition shows a second map, hides it, shows it again.
await page.locator('#fg_more').check(); await wait()
await mapReady('fg_extra_place')
await page.locator('#fg_extra_place').fill('51.51')
await page.locator('#fg_extra_place_lng').fill('-0.1')
await page.locator('#fg_full_name').click(); await wait()
r.extraShown = { maps: await visible('.leaflet-container'), boxes: await page.evaluate(() => [document.getElementById('fg_extra_place').value, document.getElementById('fg_extra_place_lng').value]) }
await page.locator('#fg_more').uncheck(); await wait(); await wait()
r.extraHidden = { maps: await visible('.leaflet-container'), field: await visible('#fg_extra_place') }
await page.locator('#fg_more').check(); await wait()
await mapReady('fg_extra_place')
await page.waitForTimeout(kind === 'blazor' ? 1500 : 600)
r.extraAgain = { maps: await visible('.leaflet-container'), boxes: await page.evaluate(() => [document.getElementById('fg_extra_place').value, document.getElementById('fg_extra_place_lng').value]), pins: await page.evaluate(() => document.getElementById('fg_extra_place').closest('[data-fg-loc]').querySelectorAll('.fg-location-pin').length) }
if (shot) await page.screenshot({ path: shot, fullPage: true })
// Submit from step 2.
await page.getByRole('button', { name: 'Next', exact: true }).click(); await wait(); await wait()
await page.locator('#fg_notes').fill('ok')
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? { contentType: latest.contentType, data: latest.data, files: (latest.files || []).map((f) => [f.field, f.name, f.type, f.size > 20000]) } : null
// Reset: everything empties, the pad included.
await page.getByRole('button', { name: 'Back', exact: true }).click(); await wait()
await page.getByRole('button', { name: 'Start over', exact: true }).click(); await wait(); await wait()
await mapReady('fg_place')
await page.waitForTimeout(kind === 'blazor' ? 1500 : 600)
r.reset = await state()
r.errors = errors
console.log(JSON.stringify(r, null, 1))
await browser.close()
