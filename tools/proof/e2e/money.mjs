// Opens the money demo (German) with ?price=99.9: the amount shows as
// "99,90"; typing "1234,5" and leaving the field shows "1.234,50"; an empty
// amount fails the required rule; "2.000" reads as two thousand; typing
// "mus" in the address fills its datalist from the sample server's
// /suggest; the submission stores the amount as a number and the address
// as the text.
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
// Control ids: the code exports use fg_<path>; the renderer (the web component, kind "element") fg-<node id>.
const ID = kind === 'element'
  ? { price: 'fg-price', place: 'fg-place', list: 'fg-place-list', name: 'fg-name' }
  : { price: 'fg_price', place: 'fg_place', list: 'fg_place-list', name: 'fg_full_name' }
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
await page.goto(url + (url.includes('?') ? '&' : '?') + 'price=99.9', { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await page.waitForSelector('#' + ID.name)
await page.waitForTimeout(kind === 'blazor' ? 2000 : 500)
const wait = (ms = kind === 'blazor' ? 800 : 300) => page.waitForTimeout(ms)
const state = () => page.evaluate((ID) => {
  const value = (id) => document.getElementById(id)?.value ?? null
  const list = document.getElementById(ID.list)
  return {
    price: value(ID.price),
    place: value(ID.place),
    options: list ? [...list.options].map((o) => o.value) : null,
    required: /Pflichtfeld|required/i.test(document.body.innerText),
  }
}, ID)
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
r.start = await state()
await page.locator('#' + ID.price).fill('1234,5')
await page.locator('#' + ID.name).click(); await wait()
r.typed = await state()
await page.locator('#' + ID.price).fill('')
await page.locator('#' + ID.name).click(); await wait()
await page.locator('button[type=submit]').click(); await wait()
r.rejected = await state()
await page.locator('#' + ID.price).fill('2.000')
await page.locator('#' + ID.name).click(); await wait()
await page.locator('#' + ID.place).fill('mus'); await wait(900)
r.suggested = await state()
await page.locator('#' + ID.place).fill('Muscat, Oman')
await page.locator('#' + ID.name).fill('Ada'); await wait()
if (shot) await page.screenshot({ path: shot, fullPage: true })
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? latest.data : null
r.errors = errors
console.log(JSON.stringify(r))
await browser.close()
