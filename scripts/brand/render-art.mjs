// Brand art for the site (brand.md "Visual direction"): the hail-grid hero (SVG), the favicon set and the
// 1200x630 social card. Everything is drawn here, deterministically, so the files can be rebuilt and diffed.
// No photography, no third-party service. Run: node scripts/brand/render-art.mjs
// Writes website/img/hail-grid.svg, website/favicon.svg, website/favicon.ico, website/apple-touch-icon.png
// and website/img/social-card.png (the PNGs are rendered with the repo's Playwright Chromium).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const C = { ink: "#0F1216", graphite: "#1E242B", steel: "#5C6670", paper: "#F5F6F4", hail: "#D8E6EE", signal: "#FF4F1F", read: "#2E6F95" };

/** Small seeded PRNG (mulberry32) so the hail lands in the same place on every build. */
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (n) => Math.round(n * 10) / 10;

/** Hail on a grid: pale streaks fall diagonally; reads pass through open cells; a few writes are lit. */
export function hailGrid({ w = 640, h = 640, seed = 7, cols = 8, rows = 3, title = true } = {}) {
  const rand = rng(seed);
  const cell = Math.floor((w - 80) / cols);
  const gx = Math.round((w - cell * cols) / 2);
  const gy = h - 40 - cell * rows;
  const lit = new Set(["1,0", "5,1", "2,2", "6,2"]);
  const streaks = [];
  for (let i = 0; i < 120; i++) {
    const x = rand() * (w + 160) - 160;
    const y = rand() * (gy + cell) - 20;
    const len = 14 + rand() * 34;
    const o = (0.18 + rand() * 0.55).toFixed(2);
    streaks.push(`<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x + len * 0.42)}" y2="${r1(y + len)}" stroke-opacity="${o}"/>`);
  }
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = gx + c * cell + 4, y = gy + r * cell + 4, s = cell - 8;
    if (lit.has(`${c},${r}`)) cells.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${C.signal}"/>`);
    else cells.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="none" stroke="${C.hail}" stroke-opacity=".28"/>`);
  }
  // Reads: three streaks that cross the grid untouched, drawn over the open cells.
  const through = [[gx + cell * 3.3, gy - 30], [gx + cell * 0.2, gy + cell * 0.9], [gx + cell * 7.1, gy + cell * 0.4]]
    .map(([x, y]) => `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x + 26)}" y2="${r1(y + 62)}" stroke-opacity=".7"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    (title ? `<title>Hail falling on a grid: most cells stay open, a few are lit</title>` : "") +
    `<rect width="${w}" height="${h}" fill="${C.ink}"/>` +
    `<g stroke="${C.hail}" stroke-width="1.5" stroke-linecap="round">${streaks.join("")}</g>` +
    `<g stroke-width="1.5">${cells.join("")}</g>` +
    `<g stroke="${C.hail}" stroke-width="1.5" stroke-linecap="round">${through.join("")}</g>` +
    `</svg>\n`;
}

/** The mark: a Hail "A" on an Ink square, with the Signal meter square beside its right foot. */
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Attackfee</title><rect width="512" height="512" rx="104" fill="${C.ink}"/><path fill="${C.hail}" fill-rule="evenodd" d="M196 112H268L368 400H300L280 340H184L164 400H96ZM202 284H262L232 196Z"/><rect x="384" y="352" width="48" height="48" fill="${C.signal}"/></svg>\n`;

function card() {
  const font = (f) => readFileSync(ROOT + "website/fonts/plex/" + f).toString("base64");
  const art = hailGrid({ w: 520, h: 630, seed: 11, cols: 6, rows: 3, title: false });
  return `<!doctype html><html><head><style>
@font-face{font-family:P;src:url(data:font/woff2;base64,${font("IBMPlexSans-Bold-Latin1.woff2")}) format("woff2");font-weight:700}
@font-face{font-family:P;src:url(data:font/woff2;base64,${font("IBMPlexSans-Regular-Latin1.woff2")}) format("woff2");font-weight:400}
html,body{margin:0;width:1200px;height:630px;background:${C.ink};overflow:hidden}
.l{position:absolute;left:80px;top:0;bottom:0;width:600px;display:flex;flex-direction:column;justify-content:center;color:${C.hail};font-family:P}
.w{font-weight:700;font-size:44px;letter-spacing:-.02em;display:flex;align-items:flex-end;gap:10px}
.w i{display:inline-block;width:14px;height:14px;background:${C.signal};margin-bottom:9px}
h1{font-weight:700;font-size:68px;line-height:1.04;letter-spacing:-.025em;margin:44px 0 26px}
p{font-size:26px;line-height:1.4;margin:0;color:${C.hail};opacity:.8}
.r{position:absolute;right:0;top:0;width:520px;height:630px}
</style></head><body><div class="l"><div class="w">Attackfee<i></i></div><h1>Open to read.<br>Priced to write.</h1><p>Write-side security for websites and APIs.</p></div><div class="r">${art}</div></body></html>`;
}

/** ICO with PNG payloads (16 and 32 px). */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([size, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size, e); head.writeUInt8(size, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(([, b]) => b)]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(ROOT + "website/img/hail-grid.svg", hailGrid());
  writeFileSync(ROOT + "website/favicon.svg", FAVICON_SVG);
  const browser = await chromium.launch();
  try {
    const shot = async (html, size, opts = {}) => {
      const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const buf = await page.screenshot({ type: "png", omitBackground: !!opts.transparent });
      await page.close();
      return buf;
    };
    const icon = (px, rounded) => `<!doctype html><html><body style="margin:0;background:transparent">${rounded ? FAVICON_SVG.replace("<svg ", `<svg width="${px}" height="${px}" `) : FAVICON_SVG.replace('rx="104"', 'rx="0"').replace("<svg ", `<svg width="${px}" height="${px}" `)}</body></html>`;
    writeFileSync(ROOT + "website/img/social-card.png", await shot(card(), { width: 1200, height: 630 }));
    // Apple touch icons are square; iOS rounds the corners itself.
    writeFileSync(ROOT + "website/apple-touch-icon.png", await shot(icon(180, false), { width: 180, height: 180 }));
    writeFileSync(ROOT + "website/favicon.ico", ico([[16, await shot(icon(16, true), { width: 16, height: 16 }, { transparent: true })], [32, await shot(icon(32, true), { width: 32, height: 32 }, { transparent: true })]]));
  } finally {
    await browser.close();
  }
  console.log("brand art: wrote hail-grid.svg, favicon.svg, favicon.ico, apple-touch-icon.png, social-card.png");
}
