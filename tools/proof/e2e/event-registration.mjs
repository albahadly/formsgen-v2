// Drives the event-registration example (examples/) in any runtime: an empty
// submit is refused (nothing reaches the sample server), choosing "Other"
// shows the conditional textarea and another choice hides it again, then a
// complete submit is stored by the sample server (4280) and read back.
// Fields are found by their labels, which every runtime renders the same way
// (the renderer and the exports use different element ids).
import { HOST, SUBMIT, launch } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const context = await browser.newContext({ viewport: { width: 760, height: 1500 } })
// The examples post to http://localhost:4280/submit, as a developer runs them.
// In the proof browser localhost is not this machine, so those requests go to
// the sample server at FG_HOST (same port) instead.
await context.route('http://localhost:4280/**', (route) => route.continue({ url: route.request().url().replace('//localhost:', `//${HOST}:`) }))
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load|WebSocket|transport/.test(m.text())) errors.push(m.text()) })
const slow = kind === 'blazor' ? 700 : 250
const wait = () => page.waitForTimeout(slow)
const field = (label) => page.getByLabel(label).first()
const choice = (role, name) => page.getByRole(role, { name, exact: true })
await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
await field('First name').waitFor()
if (kind === 'blazor') await page.waitForTimeout(1500)
const lastId = async () => ((await (await fetch(`${SUBMIT}/submissions`)).json())[0] || {}).id
async function newest(before) {
  for (let i = 0; i < 60; i++) {
    const list = await (await fetch(`${SUBMIT}/submissions`)).json()
    if (list[0] && list[0].id !== before) return list[0]
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return null
}
const r = {}
r.start = { other: await field('Tell us more').isVisible() }
// An empty submit is refused: nothing reaches the server.
const before = await lastId()
await choice('button', 'Register').click(); await wait(); await wait()
r.empty = { stored: (await lastId()) !== before }
await field('First name').fill('Ana'); await wait()
await field('Last name').fill('Lopez'); await wait()
await field('Email').fill('ana@example.com'); await wait()
await field('Phone').fill('+968 9123 4567'); await wait()
await field('Ticket').selectOption('vip'); await wait()
await field('Seats').fill('2'); await wait()
// "Other" shows the conditional textarea, "Vegan" hides it, "Other" again shows it.
await choice('radio', 'Other').check(); await wait()
r.other = { visible: await field('Tell us more').isVisible() }
await choice('radio', 'Vegan').check(); await wait()
r.vegan = { visible: await field('Tell us more').isVisible() }
await choice('radio', 'Other').check(); await wait()
await field('Tell us more').fill('Halal, please'); await wait()
await choice('checkbox', 'Building forms').check(); await wait()
await choice('checkbox', 'Accessible by default').check(); await wait()
await field('Arrival date').fill('2026-11-05'); await wait()
await field('Anything else?').fill('Window seat'); await wait()
await choice('checkbox', 'I agree to the event terms').check(); await wait()
if (shot) await page.screenshot({ path: shot, fullPage: true })
const beforeSubmit = await lastId()
await choice('button', 'Register').click()
const latest = await newest(beforeSubmit)
r.server = latest ? { contentType: latest.contentType, data: latest.data } : null
// Not compared across runtimes: the host page's own reaction (React and Vue
// show a thank-you line from the submit callback) and the page title.
r.extra = { host: await page.locator('[data-example-thanks]').isVisible().catch(() => false), title: await page.title() }
r.errors = errors
console.log(JSON.stringify(r, null, 1))
await browser.close()
