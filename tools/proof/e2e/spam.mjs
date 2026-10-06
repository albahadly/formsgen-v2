// Drives the spam-check demo in any runtime: the submit button waits for
// Cloudflare Turnstile (test key, always passes; the script is held back 3 s
// so the waiting state can be seen), the token goes with the answers and is
// checked by the sample server (FG_CAPTCHA_PORT 4281, TURNSTILE_SECRET = test secret),
// a fresh check follows each submission, and a check that can't load says so.
import { launch, CAPTCHA } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js**'
const errors = []
const r = {}
async function newPage(mode) {
  const page = await browser.newPage({ viewport: { width: 760, height: 1000 } })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport|challenges\.cloudflare|Private Access Token|preload/i.test(m.text())) errors.push(m.text()) })
  if (mode === 'slow') await page.route(SCRIPT, async (route) => { await new Promise((res) => setTimeout(res, 3000)); await route.continue() })
  if (mode === 'down') await page.route(SCRIPT, (route) => route.abort())
  await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
  await page.waitForSelector('#fg_full_name')
  return page
}
const look = (page) => page.evaluate(() => {
  const button = document.querySelector('button[type=submit]')
  const hint = document.getElementById('fg_captcha_hint')
  const shown = (el) => !!el && !el.hidden && el.offsetParent !== null
  return {
    disabled: button.disabled,
    describedBy: button.getAttribute('aria-describedby'),
    hint: shown(hint) ? hint.textContent.trim() : null,
    failed: [...document.querySelectorAll('p')].filter((p) => shown(p) && p.textContent.includes("didn't load")).length > 0,
    widget: !!document.querySelector('iframe[src*="challenges.cloudflare.com"]') || !!document.querySelector('[name="cf-turnstile-response"]'),
  }
})
const lastId = async () => ((await (await fetch(`${CAPTCHA}/submissions`)).json())[0] || {}).id
async function newest(before) {
  for (let i = 0; i < 60; i++) {
    const list = await (await fetch(`${CAPTCHA}/submissions`)).json()
    if (list[0] && list[0].id !== before) return list[0]
    await new Promise((res) => setTimeout(res, 250))
  }
  return null
}
const page = await newPage('slow')
await page.waitForTimeout(kind === 'blazor' ? 1500 : 500)
r.waiting = await look(page)
await page.waitForFunction(() => !document.querySelector('button[type=submit]').disabled, null, { timeout: 30000 })
r.passed = await look(page)
// Sent: the token goes with the answers (once).
const sent = []
page.on('request', (req) => { if (req.method() === 'POST' && req.url().includes(':4281/')) sent.push(req.postData() ?? '') })
await page.locator('button[type=submit]').click(); await page.waitForTimeout(kind === 'blazor' ? 700 : 300)
r.requiredFirst = (await page.locator('#fg_full_name').locator('xpath=ancestor::div[1]/..').textContent()).includes('This field is required')
r.afterInvalid = (await look(page)).disabled
await page.locator('#fg_full_name').fill('Ana')
let before = await lastId()
await page.locator('button[type=submit]').click()
const first = await newest(before)
r.server = first ? { data: first.data, contentType: first.contentType } : null
// The checking server stores only submissions whose token Cloudflare
// confirms, so a stored one shows the token went. In the browser runtimes
// the request itself is checked too (Blazor Server posts from the server).
if (kind !== 'blazor') {
  const tokens = sent.map((body) => {
    const data = body.startsWith('{') ? JSON.parse(body) : JSON.parse(/\{[\s\S]*\}/.exec(body)[0])
    return typeof data['cf-turnstile-response'] === 'string' && data['cf-turnstile-response'].length > 10
  })
  if (tokens.length !== 1 || !tokens[0]) errors.push(`token not in the request: ${JSON.stringify(tokens)}`)
}
r.afterSend = (await look(page)).disabled
await page.waitForFunction(() => !document.querySelector('button[type=submit]').disabled, null, { timeout: 30000 })
r.secondCheck = await look(page)
before = await lastId()
await page.locator('#fg_full_name').fill('Bo')
await page.locator('button[type=submit]').click()
const second = await newest(before)
r.secondServer = second ? second.data : null
if (shot) await page.screenshot({ path: shot, fullPage: true })
await page.close()
// The check can't load: the visitor is told, the button stays disabled.
const down = await newPage('down')
await down.waitForTimeout(kind === 'blazor' ? 2500 : 1200)
r.down = await look(down)
await down.close()
r.errors = errors
console.log(JSON.stringify(r, null, 1))
await browser.close()
