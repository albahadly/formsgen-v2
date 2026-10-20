// Browser launch and server addresses for the scenario scripts, taken from
// the environment that lib.sh prepares (see tools/proof/README.md):
//   FG_HOST             how the browser reaches servers on this machine
//   FG_SUBMIT_PORT      the sample server the scenarios read back from (4280)
//   FG_CAPTCHA_PORT     the one started with TURNSTILE_SECRET (4281)
//   PLAYWRIGHT_CHROMIUM a Chromium binary to use instead of Playwright's own
//   PLAYWRIGHT_CHANNEL  a browser Playwright finds on the machine instead
//                       ("msedge" on Windows, where nothing is downloaded)
//   HTTPS_PROXY         when set, the browser goes through it for the CDNs,
//                       bypassing it for FG_HOST, and trusts the proxy's CA
//                       through PROXY_CA_SPKI (TLS verification stays on).
import { chromium } from 'playwright'

export const HOST = process.env.FG_HOST || '127.0.0.1'
export const SUBMIT = `http://${HOST}:${process.env.FG_SUBMIT_PORT || 4280}`
export const CAPTCHA = `http://${HOST}:${process.env.FG_CAPTCHA_PORT || 4281}`

export async function launch(options = {}) {
  const env = {}
  if (process.env.PLAYWRIGHT_CHROMIUM) env.executablePath = process.env.PLAYWRIGHT_CHROMIUM
  else if (process.env.PLAYWRIGHT_CHANNEL) env.channel = process.env.PLAYWRIGHT_CHANNEL
  if (process.env.HTTPS_PROXY) {
    env.proxy = { server: process.env.HTTPS_PROXY, bypass: HOST }
    env.args = [`--ignore-certificate-errors-spki-list=${process.env.PROXY_CA_SPKI ?? ''}`]
  }
  return chromium.launch({ ...env, ...options, args: [...(env.args ?? []), ...(options.args ?? [])] })
}
