// Drives the rich-text demo in any runtime: required check, toolbar
// (bold, list, link), plain-text paste, item editors, answers in text,
// saved answers after a reload, reset, a sandboxed iframe, and the value
// stored by the sample server (FG_SUBMIT_PORT, 4280).
import { launch, SUBMIT } from './_browser.mjs'
const [url, kind, shot] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 760, height: 1600 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/404|ERR_|Failed to load/.test(m.text())) errors.push(m.text()) })
page.on('dialog', (d) => d.accept('https://example.org/me'))
const slow = kind === 'blazor' ? 700 : 250
const wait = () => page.waitForTimeout(slow)
async function open() {
  await page.goto(url, { waitUntil: kind === 'blazor' ? 'load' : 'domcontentloaded' })
  await page.waitForSelector('#fg_about')
  await page.waitForTimeout(kind === 'blazor' ? 2500 : 600)
}
const state = () => page.evaluate(() => ({
  editors: [...document.querySelectorAll('[data-fg-richtext]')].map((e) => [e.id, e.innerHTML]),
  echo: (document.evaluate("//*[starts-with(normalize-space(.), 'You wrote:')]", document, null, 9, null).singleNodeValue?.textContent ?? '').replace(/\s+/g, ' ').trim(),
}))
const button = (editorId, command) => page.locator(`#${editorId}`).locator('xpath=ancestor::*[@data-fg-rich][1]').locator(`[data-fg-rt-cmd="${command}"]`)
const r = {}
await open()
r.a11y = await page.evaluate(() => {
  const e = document.getElementById('fg_about')
  const bar = e.closest('[data-fg-rich]').querySelector('[role=toolbar]')
  return {
    editor: ['role', 'aria-multiline', 'contenteditable', 'aria-required', 'aria-labelledby'].map((a) => e.getAttribute(a)),
    label: document.getElementById(e.getAttribute('aria-labelledby')).textContent.trim(),
    toolbar: [bar.getAttribute('aria-label'), bar.getAttribute('aria-controls'), [...bar.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))],
  }
})
r.iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => ['src', 'sandbox', 'referrerpolicy', 'loading', 'allow', 'allowfullscreen', 'onload', 'title'].map((a) => f.getAttribute(a))))
await page.locator('button[type=submit]').click(); await wait()
r.required = (await page.locator('#fg_about').locator('xpath=ancestor::div[.//*[@data-fg-rich]][1]').textContent()).includes('This field is required')
await page.locator('#fg_full_name').fill('Ana')
await page.locator('#fg_about').click()
await page.keyboard.type('Hello ')
await button('fg_about', 'bold').click(); await page.keyboard.type('world'); await button('fg_about', 'bold').click()
await page.keyboard.type('!')
await page.keyboard.press('Enter')
await button('fg_about', 'insertUnorderedList').click(); await page.keyboard.type('one'); await page.keyboard.press('Enter'); await page.keyboard.type('two')
await page.keyboard.press('Enter'); await page.keyboard.press('Enter')
await page.keyboard.type('my site')
for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft')
await button('fg_about', 'link').click()
await page.keyboard.press('End')
await page.evaluate(() => {
  const dt = new DataTransfer()
  dt.setData('text/plain', ' <b>pasted</b> & "plain"')
  dt.setData('text/html', '<b style="color:red">pasted</b>')
  document.getElementById('fg_about').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
})
await wait(); await wait()
await page.locator('#fg_notes_0_note').click(); await page.keyboard.type('Note A')
await page.locator('#fg_full_name').click(); await wait(); await wait()
r.typed = await state()
r.requiredAfter = (await page.locator('#fg_about').locator('xpath=ancestor::div[.//*[@data-fg-rich]][1]').textContent()).includes('This field is required')
// Saved answers come back after a reload.
await open(); await wait()
r.restored = await state()
if (shot) await page.screenshot({ path: shot, fullPage: true })
await page.getByRole('button', { name: 'Start over', exact: true }).click(); await wait(); await wait()
r.reset = await state()
await page.locator('#fg_about').click(); await page.keyboard.type('Short ')
await button('fg_about', 'italic').click(); await page.keyboard.type('answer')
await page.locator('#fg_full_name').click(); await wait(); await wait()
await page.locator('button[type=submit]').click()
await page.waitForTimeout(kind === 'blazor' ? 2500 : 1200)
const [latest] = await (await fetch(`${SUBMIT}/submissions`)).json()
r.server = latest ? { contentType: latest.contentType, data: latest.data } : null
r.errors = errors
console.log(JSON.stringify(r, null, 1))
await browser.close()
