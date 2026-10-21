// Opens the prefill demo with a query string naming every kind of field
// (text, number, select, a list by comma and one by repeated parameters, a
// toggle, a field inside a named group, a password that must stay empty,
// a hidden field's own parameter): the controls show the values, the
// paragraph and the condition react to them, and the submission the sample
// server (4280) stores carries them all.
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const query = 'full_name=Ada+Lovelace&age=36&plan=pro&topics=news,offers&langs=en&langs=ar&agree=1&address.city=London&secret=nope&utm_source=newsletter'
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 1300 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
await page.goto(url + (url.includes('?') ? '&' : '?') + query, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await page.waitForSelector('#fg_full_name')
await page.waitForTimeout(kind === 'blazor' ? 2000 : 500)
const state = () => page.evaluate(() => {
  const value = (id) => document.getElementById(id)?.value ?? null
  const checked = (id) => document.getElementById(id)?.checked ?? null
  const shown = (id) => { const el = document.getElementById(id); return el ? (el.checkVisibility() ? 1 : 0) : 0 }
  return {
    name: value('fg_full_name'),
    age: value('fg_age'),
    plan: value('fg_plan'),
    topics: ['news', 'offers', 'tips'].filter((v) => checked(`fg_topics-${v}`)),
    langs: [...(document.getElementById('fg_langs')?.selectedOptions ?? [])].map((o) => o.value),
    agree: checked('fg_agree'),
    city: value('fg_address_city'),
    secret: value('fg_secret'),
    hello: document.body.innerText.includes('Hello Ada Lovelace'),
    proCode: shown('fg_pro_code'),
  }
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
if (shot) await page.screenshot({ path: shot, fullPage: true })
await page.locator('#fg_pro_code').fill('PRO-1')
const before = await lastId()
await page.locator('button[type=submit]').click()
const latest = await newest(before)
r.server = latest ? latest.data : null
r.errors = errors
console.log(JSON.stringify(r))
await browser.close()
