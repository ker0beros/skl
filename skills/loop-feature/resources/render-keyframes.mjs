#!/usr/bin/env node
// render-keyframes.mjs — loop-feature visual/animation capture helper.
//
// Renders a Claude Design HTML bundle (or a live URL) to:
//   - a layout screenshot per viewport
//   - keyframe screenshots at given timestamps (start / mid / end)
//   - animation-timings.json (computed animation/transition timings sniffed from the DOM)
//
// The SAME script captures the design reference (Phase A) and the live implementation
// (Phase B, ui-comprehensive-tester) so the two are directly comparable.
//
// Usage:
//   node render-keyframes.mjs --html <file.html> --out <dir> [--viewport 1440x900,390x844]
//                             [--timestamps 0,600,1200] [--selector "#root"] [--name <prefix>]
//   node render-keyframes.mjs --url  <http://localhost:3000/route> --out <dir> [...]
//
// Notes:
//   - Playwright is resolved from the repo's web/node_modules (vendored). Browser binaries
//     are the ones `make e2e` installs; if missing, Playwright prints an actionable error.
//   - --html is served over an ephemeral local HTTP server rooted at the file's directory,
//     so relative assets and module scripts load correctly (file:// would break CORS).

import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, basename, resolve, extname } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
// resources -> loop-feature -> skills -> .claude -> <repo root>
const repoRoot = resolve(__dirname, '..', '..', '..', '..')

// ---- arg parsing -----------------------------------------------------------
function parseArgs(argv) {
  const out = { viewport: '1440x900', timestamps: '0,600,1200', name: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { help: true }
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = argv[i + 1]
      out[key] = val
      i++
    }
  }
  return out
}

const HELP = `render-keyframes.mjs — loop-feature visual/animation capture helper

  --html <file>        HTML bundle to render (served over a local http server)
  --url  <url>         live URL to render instead of an HTML file
  --out  <dir>         output directory (created if missing)            [required]
  --viewport <list>    comma list of WxH, e.g. 1440x900,390x844         [default 1440x900]
  --timestamps <list>  comma list of ms to capture keyframes at         [default 0,600,1200]
  --selector <css>     screenshot only this element (else full page)
  --name <prefix>      filename prefix (default: derived from --html/--url)
  --help               show this help

Outputs per viewport: <name>-<W>x<H>-layout.png, <name>-<W>x<H>-{start|mid|end}.png,
and a single animation-timings.json in <out>.`

const args = parseArgs(process.argv.slice(2))
if (args.help) { console.log(HELP); process.exit(0) }
if (!args.out) { console.error('error: --out is required\n\n' + HELP); process.exit(2) }
if (!args.html && !args.url) { console.error('error: one of --html or --url is required'); process.exit(2) }

const outDir = resolve(args.out)
mkdirSync(outDir, { recursive: true })

const viewports = String(args.viewport).split(',').map((s) => {
  const [w, h] = s.toLowerCase().split('x').map(Number)
  if (!w || !h) { console.error(`error: bad --viewport segment "${s}" (want WxH)`); process.exit(2) }
  return { width: w, height: h }
})
const timestamps = String(args.timestamps).split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
const roleFor = (i, n) => (n === 1 ? 'still' : i === 0 ? 'start' : i === n - 1 ? 'end' : n === 3 ? 'mid' : `mid${i}`)

// ---- resolve Playwright chromium (project-agnostic) ------------------------
// Searches several candidate module roots so this works on web projects, repos with a
// web/ subdir, or a skill-local bootstrap (install.sh --with-playwright). Override with
// --playwright-base <dir> or env GO_LOOP_PLAYWRIGHT_BASE.
function loadChromium() {
  const bases = [
    args['playwright-base'],
    process.env.GO_LOOP_PLAYWRIGHT_BASE,
    repoRoot,                         // <project>/node_modules
    join(repoRoot, 'web'),            // <project>/web/node_modules
    join(repoRoot, 'frontend'),       // <project>/frontend/node_modules
    __dirname,                        // skill resources/node_modules (--with-playwright)
  ].filter(Boolean)
  for (const base of bases) {
    let req
    try { req = createRequire(join(base, 'package.json')) } catch { continue }
    for (const mod of ['@playwright/test', 'playwright', 'playwright-core']) {
      try { const pw = req(mod); if (pw?.chromium) return pw.chromium } catch { /* try next */ }
    }
  }
  console.error('error: Playwright is unavailable — web design rendering / web parity is disabled.\n' +
    'Searched: ' + bases.join(', ') + '\n' +
    'Fix: install Playwright where the project can resolve it (e.g. `npm i -D @playwright/test && npx playwright install chromium`),\n' +
    'or pass --playwright-base <dir>, or set GO_LOOP_PLAYWRIGHT_BASE. On mobile-only projects, use the Mobile MCP parity path instead.')
  process.exit(3)
}

// ---- tiny static server for --html -----------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon' }

async function startStaticServer(rootDir) {
  const server = http.createServer((reqMsg, res) => {
    try {
      const urlPath = decodeURIComponent((reqMsg.url || '/').split('?')[0])
      let filePath = join(rootDir, urlPath)
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html')
      if (!filePath.startsWith(rootDir) || !existsSync(filePath)) { res.statusCode = 404; res.end('not found'); return }
      res.setHeader('Content-Type', MIME[extname(filePath).toLowerCase()] || 'application/octet-stream')
      res.end(readFileSync(filePath))
    } catch (e) { res.statusCode = 500; res.end(String(e)) }
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { server, port: server.address().port }
}

// ---- main ------------------------------------------------------------------
const chromium = loadChromium()

let targetUrl, server
if (args.html) {
  const htmlPath = resolve(args.html)
  if (!existsSync(htmlPath)) { console.error(`error: --html not found: ${htmlPath}`); process.exit(2) }
  const started = await startStaticServer(dirname(htmlPath))
  server = started.server
  targetUrl = `http://127.0.0.1:${started.port}/${basename(htmlPath)}`
} else {
  targetUrl = args.url
}

const namePrefix = args.name || (args.html ? basename(args.html).replace(/\.[^.]+$/, '') : new URL(targetUrl).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'page')

const browser = await chromium.launch()
const timings = { target: targetUrl, capturedAt: null, viewports: [] }

try {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 })
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 }))
    await page.waitForTimeout(800) // fonts / Babel-in-browser settle

    const shotTarget = args.selector ? page.locator(args.selector) : page
    const tag = `${vp.width}x${vp.height}`

    // layout
    await shotTarget.screenshot({ path: join(outDir, `${namePrefix}-${tag}-layout.png`), ...(args.selector ? {} : { fullPage: true }) })

    // keyframes — reload before each so animations replay from t0
    const frames = []
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i]
      if (i > 0) {
        await page.goto(targetUrl, { waitUntil: 'load', timeout: 60000 })
        await page.waitForTimeout(50)
      }
      if (ts > 0) await page.waitForTimeout(ts)
      const role = roleFor(i, timestamps.length)
      const file = `${namePrefix}-${tag}-${role}.png`
      await (args.selector ? page.locator(args.selector) : page).screenshot({ path: join(outDir, file) })
      frames.push({ ms: ts, role, file })
    }

    // sniff computed animation/transition timings
    const sniffed = await page.evaluate(() => {
      const out = []
      const els = Array.from(document.querySelectorAll('*')).slice(0, 4000)
      for (const el of els) {
        const cs = getComputedStyle(el)
        const hasAnim = cs.animationName && cs.animationName !== 'none'
        const hasTrans = cs.transitionDuration && cs.transitionDuration !== '0s'
        if (!hasAnim && !hasTrans) continue
        const id = el.id ? `#${el.id}` : ''
        const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
        out.push({
          el: `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 80),
          animationName: hasAnim ? cs.animationName : null,
          animationDuration: hasAnim ? cs.animationDuration : null,
          animationTimingFunction: hasAnim ? cs.animationTimingFunction : null,
          animationIterationCount: hasAnim ? cs.animationIterationCount : null,
          transitionProperty: hasTrans ? cs.transitionProperty : null,
          transitionDuration: hasTrans ? cs.transitionDuration : null,
          transitionTimingFunction: hasTrans ? cs.transitionTimingFunction : null,
        })
        if (out.length >= 200) break
      }
      return out
    })

    timings.viewports.push({ viewport: tag, frames, animations: sniffed })
    await page.close()
    console.log(`captured ${tag}: layout + ${frames.length} keyframes, ${sniffed.length} animated elements`)
  }
} finally {
  await browser.close()
  if (server) server.close()
}

writeFileSync(join(outDir, 'animation-timings.json'), JSON.stringify(timings, null, 2))
console.log(`wrote ${join(outDir, 'animation-timings.json')}`)
console.log(`done → ${outDir}`)
