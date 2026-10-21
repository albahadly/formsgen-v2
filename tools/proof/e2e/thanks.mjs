// Fills the thanks demo and submits: the thank-you (with the answers piped
// in) replaces the form, the sample server (4280) has the answers; "Send
// another response" brings the form back, empty.
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
const slow = kind === 'blazor' ? 900 : 300
const wait = () => page.waitForTimeout(slow)
await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await page.waitForSelector('#fg_full_name')
await page.waitForTimeout(kind === 'blazor' ? 1500 : 300)
const shown = (selector) => page.evaluate((selector) => { const el = document.querySelector(selector); return el ? (el.checkVisibility() ? 1 : 0) : 0 }, selector)
// Runtimes differ in hiding (HTML keeps the hidden block, the others do not
// render it) and in the whitespace between elements: the message's own
// paragraph counts, and only when shown.
const state = async () => ({
  thanks: await shown('[data-fg-thanks]'),
  thanksText: (await shown('[data-fg-thanks]')) ? await page.evaluate(() => document.querySelector('[data-fg-thanks] p').textContent.replace(/\s+/g, ' ').trim()) : null,
  field: await shown('#fg_full_name'),
  submit: await shown('button[type=submit]'),
  name: await page.evaluate(() => document.getElementById('fg_full_name')?.value ?? null),
})
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
await page.locator('#fg_full_name').fill('Ada')
await page.locator('#fg_email').fill('ada@example.com')
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? latest.data : null
await page.waitForSelector('[data-fg-thanks]:not([hidden])', { timeout: 15000 }).catch(() => {})
await wait(); await wait()
r.sent = await state()
if (shot) await page.screenshot({ path: shot, fullPage: true })
await page.locator('[data-fg-again]').click()
await wait(); await wait()
r.again = await state()
r.errors = errors
console.log(JSON.stringify(r))
await browser.close()
