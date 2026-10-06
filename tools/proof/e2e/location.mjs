// Drives the location demo in any runtime: the map loads (Leaflet from
// cdnjs), required check, a map click, typed coordinates, "Use my location"
// (granted, then refused), Clear, a map in a new item, saved answers after a
// reload, reset, then a submit stored by the sample server (FG_SUBMIT_PORT, 4280).
// Map clicks land on fractional pixels, so clicked points are compared with
// what the map itself says is under the pointer (to 1e-4).
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const context = await browser.newContext({ viewport: { width: 760, height: 1700 }, geolocation: { latitude: 51.50073, longitude: -0.124625 }, permissions: ['geolocation'] })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
const slow = kind === 'blazor' ? 700 : 300
const wait = () => page.waitForTimeout(slow)
const mapReady = (id) => page.waitForFunction((id) => {
  const group = document.getElementById(id)?.closest('[data-fg-loc]')
  return !!group && !!group.fgLocMap && !!group.fgLocMap.map && group.querySelector('.leaflet-container') !== null
}, id, { timeout: 30000 })
async function open() {
  await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
  await page.waitForSelector('#fg_place')
  await mapReady('fg_place')
  await page.waitForTimeout(kind === 'blazor' ? 1500 : 500)
}
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const state = (id = 'fg_place') => page.evaluate((id) => {
  const lat = document.getElementById(id)
  const group = lat.closest('[data-fg-loc]')
  const s = group.fgLocMap
  const at = s && s.marker ? s.marker.getLatLng() : null
  const typed = lat.value === '' || group.querySelector('[data-fg-loc-lng]').value === '' ? null : [Number(lat.value), Number(group.querySelector('[data-fg-loc-lng]').value)]
  return {
    boxes: [lat.value, group.querySelector('[data-fg-loc-lng]').value],
    pinMatches: at ? !!typed && Math.abs(at.lat - typed[0]) < 1e-6 && Math.abs(at.lng - typed[1]) < 1e-6 : typed === null,
    pins: group.querySelectorAll('.fg-location-pin').length,
    status: group.querySelector('[data-fg-loc-status]').textContent.trim(),
    zoom: s && s.map ? s.map.getZoom() : null,
  }
}, id)
const echo = async () => ({
  echo: norm(await page.getByText('Meet at:').textContent()),
  chosen: await page.getByText('A place was chosen.').isVisible().catch(() => false),
})
const requiredShown = async () => (await page.locator('#fg_place').locator('xpath=ancestor::fieldset[1]').textContent()).includes('This field is required')
// Clicks the map dx/dy pixels from its centre; true when the boxes then hold
// the point the map puts under the pointer.
async function clickMap(id, dx, dy) {
  const map = page.locator(`#${id}`).locator('xpath=ancestor::*[@data-fg-loc][1]').locator('[data-fg-loc-map]')
  // Wait for the layout to settle (Blazor shows messages after a round trip).
  let box = await map.boundingBox()
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250)
    const next = await map.boundingBox()
    if (next.x === box.x && next.y === box.y && next.width === box.width) break
    box = next
  }
  // Whole pixels: mouse events report whole-pixel positions.
  const x = Math.round(box.x + box.width / 2 + dx)
  const y = Math.round(box.y + box.height / 2 + dy)
  const expected = await page.evaluate(([id, x, y]) => {
    const group = document.getElementById(id).closest('[data-fg-loc]')
    const p = group.fgLocMap.map.mouseEventToLatLng({ clientX: x, clientY: y })
    return [p.lat, p.wrap().lng]
  }, [id, x, y])
  await page.mouse.click(x, y)
  await wait()
  const boxes = (await state(id)).boxes.map(Number)
  return Math.abs(boxes[0] - expected[0]) < 1e-4 && Math.abs(boxes[1] - expected[1]) < 1e-4
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
await open()
r.a11y = await page.evaluate(() => {
  const lat = document.getElementById('fg_place')
  const group = lat.closest('[data-fg-loc]')
  const map = group.querySelector('[data-fg-loc-map]')
  return {
    map: [map.getAttribute('role'), map.getAttribute('aria-label'), Math.round(map.clientHeight / 10) * 10],
    lat: [lat.type, lat.closest('label').textContent.trim(), lat.getAttribute('min'), lat.getAttribute('max'), lat.getAttribute('step')],
    lng: [document.getElementById('fg_place_lng').closest('label').textContent.trim()],
    buttons: [...group.querySelectorAll('button')].map((b) => b.textContent.trim()),
    status: group.querySelector('[data-fg-loc-status]').getAttribute('aria-live'),
    tiles: !!document.querySelector('.leaflet-tile-pane'),
    attribution: (group.querySelector('.leaflet-control-attribution')?.textContent ?? '').includes('OpenStreetMap'),
  }
})
r.start = { ...(await state()), ...(await echo()) }
await page.locator('button[type=submit]').click(); await wait()
r.required = await requiredShown()
await page.locator('#fg_full_name').fill('Ana')
r.clickOk = await clickMap('fg_place', 60, -40)
const clicked = await state()
r.clicked = { pins: clicked.pins, pinMatches: clicked.pinMatches, zoom: clicked.zoom, required: await requiredShown(), echoMatches: (await echo()).echo === `Meet at: ${clicked.boxes[0]}, ${clicked.boxes[1]}`, chosen: (await echo()).chosen }
await page.locator('#fg_place').fill('23.6')
await page.locator('#fg_place_lng').fill('58.45')
await page.locator('#fg_full_name').click(); await wait()
r.typed = { ...(await state()), ...(await echo()) }
await page.locator('#fg_place').locator('xpath=ancestor::*[@data-fg-loc][1]').locator('[data-fg-loc-mine]').click()
await page.waitForTimeout(kind === 'blazor' ? 1500 : 800)
r.mine = { ...(await state()), ...(await echo()) }
// Refused: the device answers "permission denied".
await page.evaluate(() => { navigator.geolocation.getCurrentPosition = (ok, fail) => setTimeout(() => fail({ code: 1, message: 'denied' }), 50) })
await page.locator('#fg_place').locator('xpath=ancestor::*[@data-fg-loc][1]').locator('[data-fg-loc-mine]').click()
await page.waitForTimeout(kind === 'blazor' ? 1500 : 800)
r.refused = { ...(await state()), ...(await echo()) }
await page.locator('#fg_place').locator('xpath=ancestor::*[@data-fg-loc][1]').locator('[data-fg-loc-clear]').click(); await wait()
r.cleared = { ...(await state()), ...(await echo()), required: await requiredShown() }
// A map in a new item.
await page.getByRole('button', { name: 'Add stop', exact: true }).click(); await wait()
await mapReady('fg_stops_0_spot')
r.itemHasMyLocation = await page.locator('#fg_stops_0_spot').locator('xpath=ancestor::*[@data-fg-loc][1]').locator('[data-fg-loc-mine]').count()
r.itemClickOk = await clickMap('fg_stops_0_spot', -30, 20)
const item = await state('fg_stops_0_spot')
r.item = { pins: item.pins, pinMatches: item.pinMatches, zoom: item.zoom }
// Saved answers come back after a reload (boxes and pins).
await page.locator('#fg_place').fill('-33.8568')
await page.locator('#fg_place_lng').fill('151.2153')
await page.locator('#fg_full_name').click(); await wait(); await wait()
await open()
await mapReady('fg_stops_0_spot').catch(() => {})
await page.waitForTimeout(800)
r.restored = { place: await state(), item: { pins: (await state('fg_stops_0_spot')).pins, pinMatches: (await state('fg_stops_0_spot')).pinMatches }, ...(await echo()) }
if (shot) await page.screenshot({ path: shot, fullPage: true })
await page.getByRole('button', { name: 'Start over', exact: true }).click(); await wait(); await wait()
await mapReady('fg_place')
await page.waitForTimeout(500)
r.reset = { ...(await state()), ...(await echo()), items: await page.locator('[data-fg-loc]').count() }
await page.locator('#fg_full_name').fill('Bo')
await page.locator('#fg_place').fill('48.858')
await page.locator('#fg_place_lng').fill('2.2945')
await page.locator('#fg_full_name').click(); await wait()
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? { contentType: latest.contentType, data: latest.data } : null
r.errors = errors
console.log(JSON.stringify(r, null, 1))
await browser.close()
