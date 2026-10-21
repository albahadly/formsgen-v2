// Opens the scores demo with ?nps=3 (the scale prefilled from the address):
// the low score shows the "what went wrong" box, submitting without a star
// rating fails on the required rule, then four stars and a 9 hide the box,
// the paragraph says "You gave 4 stars", and the submission the sample
// server (4280) stores carries both as numbers.
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
// Control ids: the code exports use fg_<path>-<n>; the renderer (the web component, kind "element") fg-<node id>-<n>.
const ID = kind === 'element'
  ? { stars: 'fg-stars-', nps: 'fg-nps-', why: 'fg-why', name: 'fg-name' }
  : { stars: 'fg_stars-', nps: 'fg_nps-', why: 'fg_why', name: 'fg_full_name' }
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
await page.goto(url + (url.includes('?') ? '&' : '?') + 'nps=3', { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await page.waitForSelector('#' + ID.name)
await page.waitForTimeout(kind === 'blazor' ? 2000 : 500)
const state = () => page.evaluate((ID) => {
  const picked = (prefix, max) => { for (let n = 0; n <= max; n++) if (document.getElementById(prefix + n)?.checked) return n; return null }
  const shown = (id) => { const el = document.getElementById(id); return el ? (el.checkVisibility() ? 1 : 0) : 0 }
  const stars = [...document.querySelectorAll('.fg-rating-star')]
  const starColor = (i) => getComputedStyle(stars[i]).color
  return {
    stars: picked(ID.stars, 5),
    starCount: stars.length,
    // the stars left of the chosen one share its colour (CSS-only fill), the ones right of it do not
    filled: stars.length ? stars.map((_, i) => starColor(i) === starColor(stars.length - 1)) : null,
    nps: picked(ID.nps, 10),
    npsCount: document.querySelectorAll('.fg-nps-option').length,
    ends: document.querySelector('.fg-nps-ends')?.textContent.trim() ?? null,
    why: shown(ID.why),
    said: (document.body.innerText.match(/You gave \S+ stars\./) || [null])[0],
    required: /required/i.test(document.body.innerText),
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
await page.locator('button[type=submit]').click()
await page.waitForTimeout(kind === 'blazor' ? 800 : 300)
r.rejected = await state()
await page.locator(`label[for="${ID.stars}4"]`).click()
await page.locator(`label[for="${ID.nps}9"]`).click()
await page.waitForTimeout(kind === 'blazor' ? 800 : 300)
r.picked = await state()
if (shot) await page.screenshot({ path: shot, fullPage: true })
await page.locator('#' + ID.name).fill('Ada')
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? latest.data : null
r.errors = errors
console.log(JSON.stringify(r))
await browser.close()
