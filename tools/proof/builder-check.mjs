// Browser check of the builder itself (the review fixes after Phase 34):
//   node builder-check.mjs <builder-url> <shots-dir>
// Prints a JSON object; see tools/proof/README.md for what each key means.
import { mkdirSync } from 'node:fs'
import { launch } from './e2e/_browser.mjs'
const [url, shots = 'work/shots'] = process.argv.slice(2)
mkdirSync(shots, { recursive: true })
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_|Failed to load/.test(m.text())) errors.push(m.text()) })
page.on('dialog', (d) => d.accept())
const tid = (id) => page.locator(`[data-testid="${id}"]`)
await page.goto(url)
await page.evaluate(() => localStorage.clear())
await page.reload(); await page.waitForTimeout(500)
const r = {}
// 1. Typing in the canvas rich-text editor must not remove the element.
await tid('palette-item-richtext').click(); await page.waitForTimeout(400)
r.nodes1 = await page.locator('[data-testid^="canvas-node-"]').count()
await page.evaluate(() => { const ed = document.querySelector('[data-testid="panel-canvas"] [data-fg-richtext]'); ed.focus() })
await page.keyboard.type('abc'); await page.keyboard.press('Backspace'); await page.keyboard.press('Delete'); await page.waitForTimeout(300)
r.nodesAfterTyping = await page.locator('[data-testid^="canvas-node-"]').count()
r.editorInert = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="panel-canvas"] [data-fg-richtext]')).pointerEvents)
// 2. A click on the map area selects the location element.
await tid('palette-item-location').click(); await page.waitForTimeout(400)
await page.waitForFunction(() => document.querySelector('[data-testid="panel-canvas"] .leaflet-container') !== null, null, { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1500)
await tid('palette-item-text').click(); await page.waitForTimeout(300) // select something else
const map = page.locator('[data-testid="panel-canvas"] [data-fg-loc-map]').first()
const box = await map.boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(400)
r.mapClickSelects = await tid('control-height').count() > 0 && await tid('control-tiles').count() > 0
r.mapInert = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="panel-canvas"] .leaflet-container')).pointerEvents)
// 3. Number controls clamp.
await tid('control-height').fill('9999'); await tid('control-height').blur(); await page.waitForTimeout(300)
r.heightClamped = await tid('control-height').inputValue()
await tid('control-zoom').fill('0'); await tid('control-zoom').blur(); await page.waitForTimeout(300)
r.zoomClamped = await tid('control-zoom').inputValue()
// 4. A bad site key is not saved: the draft survives a reload.
await tid('open-settings').click(); await page.waitForTimeout(300)
await tid('settings-captcha').fill('bad key!'); await tid('settings-captcha').press('Tab'); await page.waitForTimeout(300)
r.badKeyWarning = await page.locator('[role=alert]', { hasText: 'Turnstile' }).count()
await page.keyboard.press('Escape'); await page.waitForTimeout(800)
await page.reload(); await page.waitForTimeout(800)
r.nodesAfterReload = await page.locator('[data-testid^="canvas-node-"]').count()
r.captchaInSchema = await page.evaluate(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /draft|schema|formsgen/i.test(k)) ?? '') ?? 'null')?.meta?.captcha ?? null) } catch { return 'unreadable' } })
// 5. Preview runs the check with the test key when a real-looking key is set.
await tid('open-settings').click(); await page.waitForTimeout(300)
await tid('settings-captcha').fill('0x4AAAAAAAnotTheTestKey01'); await tid('settings-captcha').press('Tab'); await page.waitForTimeout(300)
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
await tid('view-preview').click()
await page.waitForFunction(() => { const b = document.querySelector('[data-testid="panel-preview"] button[type=submit]'); return b && !b.disabled }, null, { timeout: 30000 }).catch(() => {})
r.previewSubmitEnabled = await page.evaluate(() => !document.querySelector('[data-testid="panel-preview"] button[type=submit]').disabled)
await page.screenshot({ path: `${shots}/builder-preview.png` })
// 6. Arabic form (Settings → locale "ar", rtl): new rich-text, signature and
// location fields start with Arabic labels.
await tid('view-editor').click(); await page.waitForTimeout(200)
await page.evaluate(() => localStorage.clear())
await page.reload(); await page.waitForTimeout(500)
await tid('open-settings').click(); await page.waitForTimeout(300)
await tid('settings-locale').fill('ar'); await tid('settings-locale').press('Tab'); await tid('settings-dir').selectOption('rtl'); await page.waitForTimeout(200)
await page.keyboard.press('Escape'); await page.waitForTimeout(300)
for (const item of ['richtext', 'signature', 'location']) { await tid(`palette-item-${item}`).click(); await page.waitForTimeout(400) }
r.arabicLabels = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="canvas-node-"]')].map((n) => (n.querySelector('legend, .fg-label')?.textContent ?? '').trim().slice(0, 30)))
await page.waitForFunction(() => document.querySelector('[data-testid="panel-canvas"] .leaflet-container') !== null, null, { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1500)
await page.screenshot({ path: `${shots}/builder-editor-ar.png` })
r.errors = errors
console.log(JSON.stringify(r, null, 1))
await browser.close()
