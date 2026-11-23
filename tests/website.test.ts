// The pages built from website/*.md outside the guides: privacy, terms and support (LEGAL_PAGES), plus the 404.
// The former mission pages (Amendment 2 §D/§E) are not built any more; the worker answers them with a 308 to
// the homepage section that replaced each (MOVED_PAGES). The built pages carry no scripts, analytics, pixels,
// cookies or external requests.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, readdirSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
// @ts-ignore plain JS build script
import { build, PAGES, LEGAL_PAGES, MOVED_PAGES, SITE_NAV } from "../website/build.mjs";
// @ts-ignore plain JS helper
import { runLint } from "../scripts/copy-lint.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = build(mkdtempSync(join(tmpdir(), "attackfee-website-")) + "/", ""); // ATTACKFEE_SITE_URL unset: no canonical tags
const html = (f: string) => readFileSync(OUT + f + ".html", "utf8");
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const A2 = ROOT + "AMENDMENT_2.md";
const FILES = [...LEGAL_PAGES.map((p: any) => p.file), "404"];
/** The font files site.css can load (the same files home.css loads), relative to the site root. */
const FONTS = ["IBMPlexSans-Regular-Latin1", "IBMPlexSans-SemiBold-Latin1", "IBMPlexSans-Bold-Latin1", "IBMPlexMono-Regular-Latin1"].map((f) => "fonts/plex/" + f + ".woff2");

test("the former mission pages are not built and each has a homepage section to move to", () => {
  assert.deepEqual(PAGES, []);
  assert.deepEqual(Object.keys(MOVED_PAGES), ["/mission", "/vision", "/values", "/ecosystem"]);
  const home = html("index");
  for (const [from, to] of Object.entries(MOVED_PAGES) as [string, string][]) {
    assert.ok(!existsSync(OUT + from.slice(1) + ".html"), from + " is not built");
    assert.ok(!existsSync(ROOT + "website" + from + ".md"), from + ".md is gone");
    assert.match(to, /^\/#[a-z]+$/);
    assert.ok(home.includes(`id="${to.slice(2)}"`), from + " -> " + to);
  }
});

test("docs/positioning.md is Amendment 2 §B as written (one banned word replaced), with the discovery note", { skip: existsSync(A2) ? false : "AMENDMENT_2.md not present" }, () => {
  const a = readFileSync(A2, "utf8");
  const sec = (start: string) => { const i = a.indexOf(start) + start.length; return a.slice(i, a.indexOf("\n---\n", i)).trim(); };
  // The brand brief's lint list bans "taxes"; positioning.md is linted, so that one word is "gates" (EM, Oct 1).
  const b = sec("## B. Where Attackfee sits (for the team, not the homepage)\n").replace("They clash only if Attackfee taxes the read.", "They clash only if Attackfee gates the read.");
  const pos = norm(readFileSync(ROOT + "docs/positioning.md", "utf8"));
  assert.ok(pos.includes(norm(b)), "positioning.md carries §B verbatim");
  assert.match(pos, /## Discovery .*AMENDMENT_3\.md/, "discovery note points at Amendment 3");
});

test("legal pages and the 404: header with the main nav, wordmark home, footer, no media", () => {
  for (const f of FILES) {
    const h = html(f);
    const nav = /<nav aria-label="Pages">([\s\S]*?)<\/nav>/.exec(h)![1];
    assert.deepEqual([...nav.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], decode(m[2])]), SITE_NAV, f);
    assert.match(h, /<a class="mark" href="\/">Attackfee<i aria-hidden="true"><\/i><\/a>/, f + ": the wordmark goes to the homepage");
    assert.match(h, /<footer class="site-foot">/, f);
    assert.doesNotMatch(h, /<img|<svg|<picture|<video|<audio|<iframe|<form/i, f);
  }
});

test("no analytics: no <script>, no inline handlers, no external URLs, no pixels, no cookies in the built HTML and CSS", () => {
  const files = readdirSync(OUT).sort();
  // The homepage (index.html, home.css, img/, fonts/) is checked in tests/homepage.test.ts, the icons in tests/favicon.test.ts,
  // _headers in tests/site-headers.test.ts, robots.txt in tests/robots.test.ts.
  assert.deepEqual(files, [".well-known", "404.html", "_headers", "apple-touch-icon.png", "demo.css", "demo.html", "demo.js", "docs", "docs.css", "download", "favicon.ico", "favicon.svg", "fonts", "home.css", "img", "index.html", "learn", "learn.css", "privacy.html", "robots.txt", "site.css", "support.html", "terms.html"], "nothing else is shipped");
  for (const f of FILES) {
    const h = html(f);
    assert.doesNotMatch(h, /<script/i, f + ": no script tag");
    assert.doesNotMatch(h, /<noscript|<object|<embed|<iframe|<img|<base\b/i, f);
    assert.doesNotMatch(h, /\son[a-z]+\s*=/i, f + ": no inline event handlers");
    assert.doesNotMatch(h, /javascript:|http-equiv|set-cookie|document\.cookie|posthog|gtag|googletagmanager|google-analytics|plausible|segment\.|fbq|hotjar|matomo/i, f);
    assert.doesNotMatch(h, /https?:|\/\/[a-z0-9]/i, f + ": no absolute or protocol-relative URL anywhere");
    const urls = [...h.matchAll(/\s(?:href|src|action|srcset|poster|data)="([^"]*)"/gi)].map((m) => m[1]);
    for (const u of urls) assert.match(u, /^\/(#(how|agents|limits)|demo|docs(\/[a-z-]+)?|learn|privacy|terms|support|download)?$|^\/(site\.css|docs\.css|favicon\.ico|favicon\.svg|apple-touch-icon\.png)$/, `${f}: ${u} is a local page, a stylesheet or an icon`);
    const links = [...h.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
    assert.deepEqual(links, ['<link rel="icon" href="/favicon.ico" sizes="32x32">', '<link rel="icon" href="/favicon.svg" type="image/svg+xml">', '<link rel="apple-touch-icon" href="/apple-touch-icon.png">', '<link rel="stylesheet" href="/site.css">', '<link rel="stylesheet" href="/docs.css">'], f + ": the three local icons and two local stylesheets, no preconnect/prefetch/fonts");
  }
  // site.css loads the Plex files the homepage already ships, from /fonts/plex/, and nothing else.
  const css = readFileSync(OUT + "site.css", "utf8");
  assert.doesNotMatch(css, /@import|https?:|\/\/[a-z0-9]/i, "the stylesheet fetches nothing remote");
  assert.deepEqual([...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]), FONTS.map((f) => "/" + f), "its only url()s are the local Plex files");
  for (const f of FONTS) assert.ok(existsSync(OUT + f), f + " ships in the build");
});

let server: Server;
let base = "";
before(async () => {
  server = createServer((req, res) => {
    // Extensionless routes, as the site is served: "/privacy" is privacy.html.
    let f = (req.url ?? "/").split("?")[0].replace(/^\//, "") || "index";
    if (/^[a-z0-9]+$/.test(f)) f += ".html";
    if (!(/^[a-z0-9]+\.(html|css)$/.test(f) || FONTS.includes(f)) || !existsSync(OUT + f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": f.endsWith(".css") ? "text/css" : f.endsWith(".woff2") ? "font/woff2" : "text/html; charset=utf-8" }).end(readFileSync(OUT + f));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as any).port}/`;
});
after(() => server?.close());

test("in a browser each page makes only same-origin requests (the page, its stylesheets and Plex), sets no cookies and has no scripts", async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const seen: string[] = [];
    page.on("request", (r) => seen.push(r.url()));
    for (const f of FILES) {
      seen.length = 0;
      await page.goto(base + f, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const got = [...new Set(seen)];
      for (const u of got) assert.ok([base + f, base + "site.css", base + "docs.css", ...FONTS.map((x) => base + x)].includes(u), f + ": " + u);
      assert.ok(got.includes(base + "site.css") && got.includes(base + FONTS[2]), f + ": site.css and Plex Sans Bold load");
      assert.equal(await page.evaluate(() => document.fonts.check('700 22px "Attackfee Sans"') && document.fonts.check('18px "Attackfee Sans"')), true, f + ": Plex loaded");
      assert.equal(await page.evaluate(() => document.scripts.length), 0);
      assert.equal(await page.evaluate(() => document.cookie), "");
    }
    assert.deepEqual(await ctx.cookies(), []);
  } finally {
    await browser.close();
  }
});

test("copy lint covers website/ and docs/positioning.md, and they pass as written", async () => {
  const r = await runLint();
  assert.deepEqual(r.hits.filter((h: any) => h.file.startsWith("website/") || h.file === "docs/positioning.md"), []);
});
