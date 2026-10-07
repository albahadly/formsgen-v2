// Full-page screenshots of one page for visual comparison (no assertions):
//   node shots.mjs <url> <outdir> <tag> [widths]      widths default 390,768,1200
// Writes <tag>-<width>.png per width; at the widest width also
// <tag>-<width>-dark.png (prefers-color-scheme: dark) and, when the page has a
// submit button that can be clicked, <tag>-<width>-errors.png after an empty
// submit (the error state).
import { mkdirSync } from 'node:fs'
import { launch } from './_browser.mjs'
const [url, outdir, tag, widthsArg] = process.argv.slice(2)
const widths = (widthsArg || '390,768,1200').split(',').map(Number)
mkdirSync(outdir, { recursive: true })
const browser = await launch()
async function shot(width, suffix, options = {}, after = async () => {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, ...options })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await after(page)
  await page.screenshot({ path: `${outdir}/${tag}-${width}${suffix}.png`, fullPage: true })
  await context.close()
}
for (const width of widths) await shot(width, '')
const widest = widths[widths.length - 1]
await shot(widest, '-dark', { colorScheme: 'dark' })
await shot(widest, '-errors', {}, async (page) => {
  await page.locator('button[type=submit]').first().click({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(800)
})
await browser.close()
console.log(`${tag}: ${widths.length + 2} screenshots in ${outdir}`)
