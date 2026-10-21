// Screenshots of the builder in its light and dark theme: every view, the
// three dialogs, the phone layout, and the canvas card in the four
// combinations of builder theme × form theme. Prints a JSON object and
// exits 1 on a page error.
//   node theme-shots.mjs <builder-url> <shots-dir>
import { mkdirSync } from 'node:fs'
import { launch } from './e2e/_browser.mjs'
const [url, shots = 'work/shots'] = process.argv.slice(2)
if (!url) { console.error('usage: node theme-shots.mjs <builder-url> <shots-dir>'); process.exit(2) }
mkdirSync(shots, { recursive: true })
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_|Failed to load/.test(m.text())) errors.push(m.text()) })
page.on('dialog', (d) => d.accept()) // "replace the current form?"
const tid = (id) => page.locator(`[data-testid="${id}"]`)
const htmlTheme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))
const card = () => page.locator('[data-testid="panel-canvas"] .fg-form')
async function setFormTheme(theme) {
  if ((await card().getAttribute('data-fg-theme')) !== theme) await tid('preview-theme-toggle').click()
  await page.waitForTimeout(200)
}
await page.goto(url)
await page.evaluate(() => localStorage.clear())
await page.reload(); await page.waitForTimeout(500)
await tid('toolbar-templates').click(); await page.waitForTimeout(200)
await tid('templates-select').selectOption('registration')
await tid('template-use').click(); await page.waitForTimeout(300)
await page.locator('[data-testid^="canvas-node-"]').nth(1).click(); await page.waitForTimeout(150)
const r = { themes: {}, card: [] }
for (const theme of ['light', 'dark']) {
  if ((await htmlTheme()) !== theme) await tid('theme-select').selectOption(theme)
  await page.waitForTimeout(200)
  await setFormTheme('light')
  r.themes[theme] = {
    html: await htmlTheme(),
    colorScheme: await page.evaluate(() => document.documentElement.style.colorScheme),
    stored: await page.evaluate(() => localStorage.getItem('formsgen.theme')),
    formTheme: await card().getAttribute('data-fg-theme'),
    version: await tid('app-version').textContent(),
  }
  for (const view of ['editor', 'preview', 'code']) {
    await tid(`view-${view}`).click(); await page.waitForTimeout(200)
    await page.screenshot({ path: `${shots}/theme-${theme}-${view}.png` })
  }
  await tid('view-editor').click(); await page.waitForTimeout(150)
  for (const [name, open] of [['settings', 'open-settings'], ['templates', 'toolbar-templates'], ['export', 'toolbar-export']]) {
    await tid(open).click(); await page.waitForTimeout(name === 'export' ? 600 : 250)
    await page.screenshot({ path: `${shots}/theme-${theme}-${name}.png` })
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300)
  await page.screenshot({ path: `${shots}/theme-${theme}-phone.png` })
  await page.setViewportSize({ width: 1400, height: 900 }); await page.waitForTimeout(300)
  // The chrome inside the card follows the form's theme, not the builder's.
  for (const form of ['light', 'dark']) {
    await setFormTheme(form)
    await card().screenshot({ path: `${shots}/card-builder-${theme}-form-${form}.png` })
    r.card.push({ builder: theme, form })
  }
  await setFormTheme('light')
}
await page.reload(); await page.waitForTimeout(500)
r.afterReload = await htmlTheme() // the stored choice survives a reload
r.errors = errors
console.log(JSON.stringify(r, null, 2))
await browser.close()
process.exit(errors.length === 0 ? 0 : 1)
