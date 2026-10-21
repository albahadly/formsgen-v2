// Fills the redirect demo and submits: the answers reach the sample server
// (4280) and the page goes to its address (the submissions page).
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 700 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await page.waitForSelector('#fg_full_name')
await page.waitForTimeout(kind === 'blazor' ? 1500 : 300)
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
await page.locator('#fg_full_name').fill('Ada')
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? latest.data : null
await page.waitForURL((u) => u.origin === SUBMIT, { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(500)
r.arrived = page.url() === `${SUBMIT}/`
r.title = await page.title()
r.noThanks = await page.evaluate(() => document.querySelector('[data-fg-thanks]') === null)
if (shot) await page.screenshot({ path: shot })
r.errors = errors
console.log(JSON.stringify(r))
await browser.close()
