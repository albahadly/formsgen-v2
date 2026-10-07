// Measures the rendered form so the three CSS flavours can be compared by
// numbers, not by eye:
//   node metrics.mjs <url> <out.json> [width]       (width default 1200)
// For the form root, every control (data-fg-path), heading, paragraph,
// choice option, button, group and description, the script records computed
// sizes (font size and weight, height, padding, border, radius) and
// positions (label-to-control gap, gap to the next cell, cell width). Colours
// are recorded under "color" keys and ignored by metrics-compare.mjs unless
// asked for. A second pass after an empty submit records the error state.
import { writeFileSync } from 'node:fs'
import { launch } from './_browser.mjs'
const [url, out, widthArg] = process.argv.slice(2)
const width = Number(widthArg || 1200)
const browser = await launch()
const page = await browser.newPage({ viewport: { width, height: 900 } })
await page.goto(url, { waitUntil: 'load' })
await page.waitForTimeout(1500)

const measure = () => page.evaluate(() => {
  const px = (v) => Math.round(parseFloat(v) * 100) / 100
  const cs = (el) => getComputedStyle(el)
  const box = (el) => el.getBoundingClientRect()
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const CELL = '.fg-cell, [class^="col-span-"], [class*=" col-span-"], [class^="col-"], [class*=" col-"]'
  const cellOf = (el) => el.closest(CELL)
  const typo = (el) => {
    if (!el) return null
    const s = cs(el)
    return { fontSize: px(s.fontSize), fontWeight: s.fontWeight, lineHeight: s.lineHeight === 'normal' ? 'normal' : px(s.lineHeight), color: s.color }
  }
  const boxMetrics = (el) => {
    const s = cs(el)
    const b = box(el)
    return {
      height: px(b.height), width: px(b.width), fontSize: px(s.fontSize), fontWeight: s.fontWeight,
      paddingTop: px(s.paddingTop), paddingRight: px(s.paddingRight), paddingBottom: px(s.paddingBottom), paddingLeft: px(s.paddingLeft),
      borderTop: px(s.borderTopWidth), radius: px(s.borderTopLeftRadius), borderStyle: parseFloat(s.borderTopWidth) > 0 ? s.borderTopStyle : 'none',
      color: s.color, background: s.backgroundColor, borderColor: s.borderTopColor,
    }
  }
  const form = document.querySelector('form')
  const fs = cs(form)
  const fb = box(form)
  const result = {
    form: {
      width: px(fb.width), contentWidth: px(fb.width - parseFloat(fs.paddingLeft) - parseFloat(fs.paddingRight)),
      paddingTop: px(fs.paddingTop), paddingLeft: px(fs.paddingLeft), left: px(fb.left), fontSize: px(fs.fontSize), fontFamily: fs.fontFamily.split(',')[0],
      color: fs.color, background: fs.backgroundColor,
    },
    cells: [], controls: {}, headings: [], paragraphs: [], options: {}, buttons: {}, groups: [], misc: {},
  }
  // Grid cells of the top-level grid, in order: their widths and the vertical gaps between them.
  const grid = form.querySelector('.fg-grid, .grid, .row')
  const cells = grid ? [...grid.children].filter((c) => c.matches(CELL) && c.checkVisibility()) : []
  cells.forEach((cell, i) => {
    const b = box(cell)
    const next = cells[i + 1]
    const first = cell.querySelector('[data-fg-path], h1, h2, h3, h4, h5, h6, p, legend, label')
    const cs0 = cs(cell)
    result.cells.push({ i, hint: text(first).slice(0, 24), width: px(b.width - parseFloat(cs0.paddingLeft) - parseFloat(cs0.paddingRight)), height: px(b.height), gapAfter: next ? px(box(next).top - b.bottom) : null })
  })
  for (const el of form.querySelectorAll('[data-fg-path]')) {
    const path = el.getAttribute('data-fg-path')
    const kind = el.getAttribute('data-fg-kind') || el.type || el.tagName.toLowerCase()
    const key = `${path}:${kind}:${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''}`
    if (result.controls[key]) continue
    if (!el.checkVisibility() || cs(el).clip !== 'auto' || (cs(el).position === 'absolute' && cs(el).opacity === '0')) continue
    const check = el.type === 'radio' || el.type === 'checkbox' || el.type === 'range'
    const m = check ? { height: px(box(el).height), width: px(box(el).width) } : boxMetrics(el)
    // A select's inline padding holds the framework's own chevron artwork.
    if (el.tagName === 'SELECT') { delete m.paddingLeft; delete m.paddingRight }
    const label = el.id ? form.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
    const legend = el.closest('fieldset')?.querySelector('legend')
    const labelEl0 = label && !label.contains(el) ? label : legend
    const labelEl = labelEl0 && labelEl0.offsetWidth > 1 ? labelEl0 : null
    const described = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)).filter(Boolean)
    const desc = described.find((d) => !/err/.test(d.id) && !d.hasAttribute('role'))
    const cell = cellOf(el)
    result.controls[key] = {
      ...m,
      label: typo(labelEl), labelGap: labelEl ? px(box(el).top - box(labelEl).bottom) : null,
      labelText: text(labelEl).slice(0, 30),
      required: (() => { const r = labelEl?.querySelector('[aria-hidden="true"]'); return r ? { fontSize: px(cs(r).fontSize), marginLeft: px(cs(r).marginLeft), gapFromText: px(box(r).left - (box(labelEl).left + (labelEl.firstChild?.nodeType === 3 ? (() => { const range = document.createRange(); range.selectNodeContents(labelEl.firstChild); return range.getBoundingClientRect().width })() : 0))) } : null })(),
      description: desc ? { ...typo(desc), gap: px(box(desc).top - box(el).bottom) } : null,
      cellWidth: cell ? px(box(cell).width - parseFloat(cs(cell).paddingLeft) - parseFloat(cs(cell).paddingRight)) : null,
    }
  }
  for (const h of form.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const s = cs(h)
    result.headings.push({ tag: h.tagName.toLowerCase(), text: text(h).slice(0, 24), inHtmlBlock: !!h.closest('.fg-html, [data-fg-html]'), fontSize: px(s.fontSize), fontWeight: s.fontWeight, marginTop: px(s.marginTop), marginBottom: px(s.marginBottom), textAlign: s.textAlign, color: s.color })
  }
  for (const p of form.querySelectorAll('p')) {
    if (p.closest('[hidden]') || p.hidden) continue
    // The spam-check hint is hidden on a timer once the test key passes.
    if (p.parentElement && p.parentElement.querySelector('[data-fg-captcha]')) continue
    const s = cs(p)
    const roleOrClass = p.getAttribute('role') || (p.id.includes('err') ? 'error' : p.closest('fieldset') ? 'in-fieldset' : 'p')
    const key = `${roleOrClass}:${text(p).slice(0, 22)}`
    result.paragraphs.push({ key, fontSize: px(s.fontSize), fontWeight: s.fontWeight, lineHeight: s.lineHeight === 'normal' ? 'normal' : px(s.lineHeight), marginTop: px(s.marginTop), marginBottom: px(s.marginBottom), color: s.color })
  }
  for (const input of form.querySelectorAll('input[type=radio], input[type=checkbox]')) {
    const row = input.closest('label') || input.parentElement
    const key = `${input.getAttribute('data-fg-path') || input.name || input.id}:${input.type}`
    if (result.options[key]) continue
    const label = input.closest('label') || form.querySelector(`label[for="${CSS.escape(input.id)}"]`)
    const next = row?.nextElementSibling
    const textNode = label ? [...label.childNodes].find((n) => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && n.tagName === 'SPAN' && n.textContent.trim())) : null
    const textLeft = textNode ? (() => { const range = document.createRange(); range.selectNodeContents(textNode); return range.getBoundingClientRect().left })() : null
    const hidden = cs(input).position === 'absolute' || cs(input).opacity === '0' || cs(input).clipPath !== 'none' || cs(input).clip !== 'auto'
    result.options[key] = {
      inputSize: hidden ? null : px(box(input).width), inputHidden: hidden,
      rowHeight: row ? px(box(row).height) : null, rowBorder: row ? px(cs(row).borderTopWidth) : null, rowRadius: row ? px(cs(row).borderTopLeftRadius) : null,
      label: typo(label), gapToNext: next && next.tagName === row.tagName && box(next).top >= box(row).bottom - 1 ? px(box(next).top - box(row).bottom) : null,
      textOffset: textLeft !== null && !hidden ? px(textLeft - box(input).left) : null,
      labelColor: label ? cs(label).color : null,
    }
  }
  for (const b of form.querySelectorAll('button, a[role=button], [type=submit]')) {
    const key = `${(b.getAttribute('type') || 'button')}:${text(b).slice(0, 20) || b.getAttribute('aria-label') || b.className.slice(0, 20)}`
    if (result.buttons[key]) continue
    const m = boxMetrics(b)
    result.buttons[key] = { ...m, visible: b.checkVisibility() }
  }
  for (const g of form.querySelectorAll('fieldset')) {
    const s = cs(g)
    const legend = g.querySelector(':scope > legend')
    const classes = g.className
    const kids = [...g.children].filter((k) => k !== legend && k.checkVisibility())
    // A Bootstrap .row is placed by its negative margins and its columns' top
    // margins: compare what is seen (the columns' extent), not the box.
    const shown = (c) => c.checkVisibility() && cs(c).clip === 'auto' && !(cs(c).position === 'absolute' && cs(c).opacity === '0')
    const extent = (el) => {
      const inner = el.classList.contains('row') ? [...el.children].filter(shown) : []
      if (inner.length === 0) return box(el)
      return { top: Math.min(...inner.map((c) => box(c).top)), bottom: Math.max(...inner.map((c) => box(c).bottom)), height: 0 }
    }
    const content = (el) => px(box(el).width - parseFloat(cs(el).paddingLeft) - parseFloat(cs(el).paddingRight))
    const children = kids.map((k, i) => {
      const e = extent(k)
      const prev = i === 0 ? null : extent(kids[i - 1])
      return {
        tag: k.tagName.toLowerCase(), height: px(e.bottom - e.top),
        gapBefore: px(e.top - (prev ? prev.bottom : legend ? box(legend).bottom : box(g).top + parseFloat(s.paddingTop))),
        parts: [...k.children].filter(shown).map((c) => ({ tag: c.tagName.toLowerCase(), height: px(box(c).height), width: c.tagName === 'LABEL' ? px(box(c).width) : content(c), marginBottom: px(cs(c).marginBottom) })),
      }
    })
    result.groups.push({ hint: text(legend).slice(0, 16) || classes.slice(0, 16), legend: text(legend).slice(0, 20), classes: classes.slice(0, 40), height: px(box(g).height), padding: px(s.paddingTop), border: px(s.borderTopWidth), radius: px(s.borderTopLeftRadius), legendTypo: typo(legend), legendHeight: legend ? px(box(legend).height) : null, legendTop: legend ? px(box(legend).top - box(g).top) : null, background: s.backgroundColor, children })
  }
  result.htmlBlocks = [...form.querySelectorAll('.fg-html')].map((blk) => ({
    height: px(box(blk).height), lineHeight: cs(blk).lineHeight, fontSize: px(cs(blk).fontSize),
    parts: [...blk.children].map((c) => ({ tag: c.tagName.toLowerCase(), height: px(box(c).height), fontSize: px(cs(c).fontSize), marginTop: px(cs(c).marginTop), marginBottom: px(cs(c).marginBottom), lineHeight: cs(c).lineHeight })),
  }))
  const pre = form.querySelector('pre')
  if (pre) result.misc.payload = boxMetrics(pre)
  const hr = form.querySelector('hr')
  if (hr) result.misc.divider = { marginTop: px(cs(hr).marginTop), marginBottom: px(cs(hr).marginBottom), border: px(cs(hr).borderTopWidth), opacity: cs(hr).opacity }
  const tabs = form.querySelector('[role=tablist]')
  if (tabs) result.misc.tabs = { height: px(box(tabs).height), buttons: [...tabs.querySelectorAll('button')].map((b) => ({ ...boxMetrics(b) })) }
  const steps = form.querySelector('ol, [data-fg-steps]')
  if (steps && steps.closest('form') && !steps.closest('.fg-html, [data-fg-html]')) result.misc.steps = { height: px(box(steps).height), fontSize: px(cs(steps).fontSize) }
  return result
})
const normal = await measure()
await page.locator('button[type=submit]').first().click({ timeout: 5000 }).catch(() => {})
await page.waitForTimeout(800)
const errors = await page.evaluate(() => {
  const px = (v) => Math.round(parseFloat(v) * 100) / 100
  const out = { errorTexts: [], invalidControls: [] }
  for (const p of document.querySelectorAll('[role=alert]')) {
    if (p.hidden || !p.checkVisibility()) continue
    const s = getComputedStyle(p)
    out.errorTexts.push({ id: p.id, fontSize: px(s.fontSize), fontWeight: s.fontWeight, marginTop: px(s.marginTop), color: s.color, gapAbove: (() => { const prev = p.previousElementSibling; return prev ? px(p.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : null })() })
  }
  for (const el of document.querySelectorAll('[data-fg-path]')) {
    const s = getComputedStyle(el)
    out.invalidControls.push({ path: el.getAttribute('data-fg-path'), borderColor: s.borderTopColor, borderWidth: px(s.borderTopWidth), classes: el.className.split(' ').filter((c) => /invalid|red/.test(c)).join(' ') })
  }
  return out
})
writeFileSync(out, JSON.stringify({ url, width, normal, errors }, null, 1))
console.log(`${out}: ${Object.keys(normal.controls).length} controls, ${normal.cells.length} cells, ${normal.headings.length} headings, ${Object.keys(normal.buttons).length} buttons, ${errors.errorTexts.length} errors shown`)
await browser.close()
