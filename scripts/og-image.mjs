/**
 * Renders the Open Graph card to public/assets/og-cover.png.
 *
 * A one-off asset generator, deliberately NOT a dependency of the build: it needs a
 * headless browser, and carrying Playwright as a devDependency to redraw one PNG a
 * couple of times a year is a bad trade. Run it on demand:
 *
 *   pnpm dlx playwright@1 install chromium   # first time only
 *   pnpm dlx --package=playwright@1 node scripts/og-image.mjs
 *
 * The card is deliberately language-neutral — wordmark and disciplines only, no
 * tagline — so one image serves both the German and English pages. Fonts are inlined
 * as base64 because the page is rendered from a string with no server behind it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const b64 = (p) => readFileSync(resolve(root, p)).toString("base64");
const rubik = b64("public/assets/fonts/rubik-latin.woff2");
const plex = b64("public/assets/fonts/ibm-plex-mono-400-latin.woff2");

// The monogram, lifted from the same source the DOM and WebGL layers draw.
const ldSvg = readFileSync(resolve(root, "public/assets/ld-logo.svg"), "utf8")
	.replace(/ fill="#312782"/, ' fill="currentColor"')
	.replace(/width="[^"]*" height="[^"]*"/, 'width="88" height="88"');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Rubik";src:url(data:font/woff2;base64,${rubik}) format("woff2");font-weight:300 700}
@font-face{font-family:"IBM Plex Mono";src:url(data:font/woff2;base64,${plex}) format("woff2");font-weight:400}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#05040f;color:#f4f2ff;
  font-family:"Rubik",sans-serif;overflow:hidden;position:relative}
/* Same accent the site uses, as a soft off-centre bloom rather than a flat panel. */
.glow{position:absolute;inset:-30% -10% auto -10%;height:120%;
  background:radial-gradient(60% 55% at 42% 45%,rgba(92,200,255,.30),transparent 70%)}
.grid{position:absolute;inset:0;opacity:.30;
  background-image:radial-gradient(rgba(244,242,255,.45) 1px,transparent 1px);
  background-size:9px 9px;
  /* Fades the dot field out to the right so the type stays the loudest thing. */
  mask-image:linear-gradient(105deg,#000 0 38%,transparent 78%)}
.inner{position:relative;height:100%;padding:74px 84px;
  display:flex;flex-direction:column;justify-content:space-between}
.mark{color:#f4f2ff}
h1{font-size:132px;font-weight:700;letter-spacing:-.045em;line-height:.9}
.disciplines{display:flex;gap:26px;font-family:"IBM Plex Mono",monospace;
  font-size:21px;letter-spacing:.15em;text-transform:uppercase;color:#b3adcf}
.disciplines span:not(:first-child){position:relative;padding-left:26px}
.disciplines span:not(:first-child)::before{content:"";position:absolute;left:0;top:50%;
  width:12px;height:1px;background:rgba(255,255,255,.28)}
.rule{height:1px;background:linear-gradient(90deg,rgba(92,200,255,.75),rgba(255,255,255,.06));
  margin-bottom:30px}
</style></head><body>
<div class="glow"></div><div class="grid"></div>
<div class="inner">
  <div class="mark">${ldSvg}</div>
  <div>
    <h1>lipsia&nbsp;digital</h1>
  </div>
  <div>
    <div class="rule"></div>
    <div class="disciplines">
      <span>Software Engineering</span><span>Information Systems</span><span>Digital Products</span>
    </div>
  </div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const out = resolve(root, "public/assets/og-cover.png");
writeFileSync(out, await page.screenshot({ type: "png" }));
await browser.close();
console.log(`wrote ${out}`);
