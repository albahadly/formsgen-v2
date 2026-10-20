// The design canvas must lay fields out like the preview: for every template
// and device, each named field's cell width as a share of its own grid on the
// canvas and in the preview (the share cancels the canvas chrome around
// nested lists). Prints a JSON object and exits 1 on a mismatch or page error.
//   node canvas-parity.mjs <builder-url>
import { launch } from './e2e/_browser.mjs'
const [url] = process.argv.slice(2)
if (!url) { console.error('usage: node canvas-parity.mjs <builder-url>'); process.exit(2) }
// The canvas grid gap is 0.5rem, the renderer's is --fg-space: a half-width
// cell differs by under 1% of the grid; 2.5 leaves room for rounding.
const TOLERANCE = 2.5
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_|Failed to load/.test(m.text())) errors.push(m.text()) })
page.on('dialog', (d) => d.accept()) // "replace the current form?"
const tid = (id) => page.locator(`[data-testid="${id}"]`)
await page.goto(url)
await page.evaluate(() => localStorage.clear())
await page.reload(); await page.waitForTimeout(500)

await tid('toolbar-templates').click(); await page.waitForTimeout(300)
const templates = await tid('templates-select').locator('option').evaluateAll((os) => os.map((o) => o.value))
await page.keyboard.press('Escape'); await page.waitForTimeout(200)

// name → cell width / grid width, in %, for cells that wrap one named control.
function shares(scope) {
  return page.evaluate((scope) => {
    const out = {}
    for (const cell of document.querySelector(scope).querySelectorAll('.fg-cell')) {
      const named = cell.querySelectorAll('[name]')
      if (named.length !== 1) continue
      const name = named[0].getAttribute('name')
      if (name in out) continue
      const grid = cell.parentElement.getBoundingClientRect().width
      out[name] = Math.round((cell.getBoundingClientRect().width / grid) * 1000) / 10
    }
    return out
  }, scope)
}

const r = { templates: {}, compared: 0, mismatches: [] }
for (const id of templates) {
  await tid('toolbar-templates').click(); await page.waitForTimeout(200)
  await tid('templates-select').selectOption(id)
  await tid('template-use').click(); await page.waitForTimeout(300)
  r.templates[id] = {}
  for (const device of ['desktop', 'tablet', 'mobile']) {
    await tid(`device-${device}`).click()
    await tid('view-editor').click(); await page.waitForTimeout(200)
    const editor = await shares('[data-testid="panel-canvas"]')
    await tid('view-preview').click(); await page.waitForTimeout(200)
    const preview = await shares('[data-testid="panel-preview"]')
    let compared = 0
    for (const [name, share] of Object.entries(preview)) {
      if (!(name in editor)) continue
      compared++
      if (Math.abs(editor[name] - share) > TOLERANCE) r.mismatches.push({ template: id, device, name, editor: editor[name], preview: share })
    }
    r.templates[id][device] = compared
    r.compared += compared
  }
}
r.errors = errors
console.log(JSON.stringify(r, null, 2))
await browser.close()
process.exit(r.mismatches.length === 0 && errors.length === 0 ? 0 : 1)
