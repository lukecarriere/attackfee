// The homepage (Attackfee brand, Marketing site-copy.md, Nov 17, 2026):
//   - "/" is the homepage: website/dist/index.html with its own home.css and an SVG hero;
//   - every link is root-relative with no extension ("/", "/demo", "/docs", ...), so no ".html" href ships;
//   - each page canonicals to itself under ATTACKFEE_SITE_URL (validated by @attackfee/protocol/site-url),
//     and with ATTACKFEE_SITE_URL unset or invalid there is no canonical tag at all;
//   - the former mission pages are not built; the worker answers them with a 308 (MOVED_PAGES).
// Words come from HOME in website/build.mjs (docs/copy.md points there). No scripts, no inline styles,
// no external requests, so the page works under the CSP `default-src 'self'`.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { chromium } from "playwright";
// @ts-ignore plain JS build script
import { build, cliSiteRaw, PAGES, HOME, HOME_ASSETS, ICON_FILES, SITE_FILES, DOC_PAGES, DOC_META, pluginRelease, LEGAL_PAGES, MOVED_PAGES, SITE_NAV, homeStrings, FOOTER_LINE } from "../website/build.mjs";
import { learnSourceFiles } from "../website/learn.mjs";
// @ts-ignore plain JS helper
import { section, lintText } from "../scripts/copy-lib.mjs";
import { parseSiteUrl } from "../packages/protocol/src/site-url.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = ROOT + "website/dist/";
const SITE = "https://site.example";
const tmp = () => mkdtempSync(join(tmpdir(), "attackfee-home-")) + "/";
const OUT = build(tmp(), "");
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
/** The homepage and the legal pages: every page the build renders from its own templates outside the guides. */
const FILES = ["index", ...LEGAL_PAGES.map((p: any) => p.file)];
const PLEX = ["IBMPlexSans-Regular-Latin1", "IBMPlexSans-SemiBold-Latin1", "IBMPlexSans-Bold-Latin1", "IBMPlexMono-Regular-Latin1"].map((f) => "fonts/plex/" + f + ".woff2");

/** Every file under `dir`, relative to it, sorted. */
function walk(dir: string, at = dir): string[] {
  return readdirSync(at).flatMap((f) => statSync(join(at, f)).isDirectory() ? walk(dir, join(at, f)) : [relative(dir, join(at, f))]).sort();
}
const hrefs = (h: string) => [...h.matchAll(/\shref="([^"]*)"/gi)].map((m) => m[1]);
const canonicals = (h: string) => [...h.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gi)].map((m) => m[0]);

/** Build checks on a dist folder: the homepage is there and no link anywhere points at a .html file. */
function checkDist(dir: string) {
  assert.ok(existsSync(dir + "index.html"), dir + "index.html is missing: the homepage must be built");
  const html = walk(dir).filter((f) => f.endsWith(".html"));
  assert.ok(html.length >= 5, "the homepage, the demo and the legal pages: " + html.join(", "));
  for (const f of html) {
    const bad = hrefs(readFileSync(dir + f, "utf8")).filter((u) => /\.html?(?:[?#]|$)/i.test(u));
    assert.deepEqual(bad, [], `${f}: no .html href (links are root-relative with no extension)`);
  }
}

test("build: website/dist/index.html exists and no .html href is left in website/dist (run `npm run build` first)", () => {
  assert.ok(existsSync(DIST), "website/dist/ is missing: run `npm run build` (or `npm run build:website`) first");
  checkDist(DIST);
});

test("build: a fresh build has the homepage, ships exactly its files, and has no .html href", () => {
  checkDist(OUT);
  assert.deepEqual(PAGES, [], "no mission pages are built");
  const rel = pluginRelease();
  const docs = ["docs.css", "learn.css", ...learnSourceFiles().map((f: string) => f + ".html"), ...DOC_PAGES.map((p: any) => p.file + ".html"), ...LEGAL_PAGES.map((p: any) => p.file + ".html")];
  const zip = existsSync(OUT + "download/" + rel.zip) ? ["download/" + rel.zip, "download/" + rel.shaName] : [];
  assert.deepEqual(walk(OUT), ["404.html", "demo.css", "demo.html", "demo.js", "index.html", "site.css", ...HOME_ASSETS, ...ICON_FILES, ...SITE_FILES, ".well-known/security.txt", ...docs, ...zip].sort());
  for (const f of HOME_ASSETS) assert.deepEqual(readFileSync(OUT + f), readFileSync(ROOT + "website/" + f), f + " is copied unchanged");
  for (const p of Object.keys(MOVED_PAGES)) assert.ok(!existsSync(OUT + p.slice(1) + ".html"), p + " is not built");
  // Every shipped path and text file passes the copy lint list from docs/copy.md.
  for (const f of walk(OUT)) assert.deepEqual(lintText("website/dist/" + f, f.replace(/[/._-]/g, " ")), [], "path: " + f);
  for (const f of walk(OUT).filter((f) => /\.(html|css|txt|svg)$/.test(f))) assert.deepEqual(lintText("website/dist/" + f, readFileSync(OUT + f, "utf8")), [], f);
});

interface Ref { file: string; kind: string; url: string; canonical: boolean }
/**
 * Every URL reference on the five pages: src, each srcset/imagesrcset entry, href, poster, action, data,
 * and every CSS url() in the HTML (inline styles, if any ever appear) and in every dist .css file.
 */
function urlRefs(dir: string): Ref[] {
  const out: Ref[] = [];
  const cssUrls = (file: string, text: string) => {
    for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) out.push({ file, kind: "url()", url: m[2].trim(), canonical: false });
  };
  for (const f of FILES) {
    const h = readFileSync(dir + f + ".html", "utf8");
    for (const m of h.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
      const attrs = m[2];
      const canonical = m[1].toLowerCase() === "link" && /\srel="canonical"/i.test(attrs);
      for (const a of attrs.matchAll(/\s(href|src|srcset|imagesrcset|poster|action|data)="([^"]*)"/gi)) {
        const kind = a[1].toLowerCase();
        const vals = kind.endsWith("srcset") ? a[2].split(",").map((c) => c.trim().split(/\s+/)[0]).filter(Boolean) : [a[2]];
        for (const v of vals) out.push({ file: f + ".html", kind, url: decode(v), canonical });
      }
    }
    cssUrls(f + ".html", h);
  }
  for (const f of walk(dir).filter((f) => f.endsWith(".css"))) cssUrls(f, readFileSync(dir + f, "utf8"));
  return out;
}
/** "#fragment"-only and data: references: allowed, and listed so they are noticed. */
const isFragmentOrData = (u: string) => u.startsWith("#") || /^data:/i.test(u);
/**
 * References that break the root-relative rule: anything not starting with a single "/" (relative paths,
 * "//host" and absolute http(s) URLs alike). The one exception is the canonical, and only when a site
 * root is set, pointing under it.
 */
function badRefs(dir: string, site: string | null): string[] {
  return urlRefs(dir).filter((r) => {
    if (isFragmentOrData(r.url)) return false;
    if (r.canonical) return !(site !== null && /^https:\/\//.test(r.url) && (r.url + "/").startsWith(site + "/"));
    return !/^\/(?!\/)/.test(r.url);
  }).map((r) => `${r.file} ${r.kind} ${JSON.stringify(r.url)}${r.canonical ? " (canonical)" : ""}`);
}

test("root-relative: every src, srcset entry, href and CSS url() on the built pages starts with '/' (canonical aside)", () => {
  // website/dist as built (with whatever ATTACKFEE_SITE_URL the build saw), a fresh build without a site root, and one with it.
  const builtSite = parseSiteUrl(cliSiteRaw()).url;
  assert.deepEqual(badRefs(DIST, builtSite), [], "website/dist");
  assert.deepEqual(badRefs(OUT, null), [], "fresh build, ATTACKFEE_SITE_URL unset");
  const refs = urlRefs(OUT);
  assert.deepEqual(refs.filter((r) => r.canonical), [], "no canonical without a site root");
  assert.ok(refs.length >= 30, "the scan sees the pages' references: " + refs.length);
  for (const k of ["href", "src", "url()"]) assert.ok(refs.some((r) => r.kind === k), "the scan sees " + k);
  assert.ok(refs.some((r) => r.file === "home.css" && r.kind === "url()"), "the scan reads the dist stylesheets");
  // In-page section links ("/#how") are root-relative too; bare fragments and data: are not used.
  assert.deepEqual(refs.filter((r) => isFragmentOrData(r.url)).map((r) => `${r.file} ${r.url}`), [], "fragment or data: references (allowed; none expected)");
  const set = build(tmp(), SITE, () => {});
  assert.deepEqual(badRefs(set, SITE), [], "fresh build, ATTACKFEE_SITE_URL set");
  for (const f of ["llms.txt", "llms-learn.txt"]) assert.deepEqual(lintText("website/dist/" + f, readFileSync(set + f, "utf8")), [], f);
  assert.deepEqual(urlRefs(set).filter((r) => /^https?:/i.test(r.url)).map((r) => r.canonical), FILES.map(() => true), "the only absolute URLs are the canonicals");
  // The checker itself: the same canonicals are flagged when no site root allows them.
  assert.deepEqual(badRefs(set, null).length, FILES.length, "a canonical without a site root is flagged");
});

test("links: wordmark '/', the main nav, and the footer on the homepage", () => {
  const home = readFileSync(OUT + "index.html", "utf8");
  assert.match(home, /<a class="mark" href="\/" aria-current="page">Attackfee<i aria-hidden="true"><\/i><\/a>/, "homepage wordmark is the current page");
  const nav = /<nav aria-label="Main">([\s\S]*?)<\/nav>/.exec(home)![1];
  assert.deepEqual([...nav.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], decode(m[2])]),
    [["/#how", "How it works"], ["/#agents", "For agents"], ["/#limits", "Limits"], ["/demo", "Demo"], ["/docs", DOC_META.label], ["/learn", "Learn"]]);
  assert.deepEqual(SITE_NAV.map((n: any) => n.href ?? n[0]), ["/#how", "/#agents", "/#limits", "/demo", "/docs", "/learn"]);
  for (const id of ["how", "agents", "limits"]) assert.match(home, new RegExp(`<section class="sec" id="${id}"`), "nav target #" + id);
  for (const to of new Set(Object.values(MOVED_PAGES) as string[])) assert.match(home, new RegExp(`id="${to.slice(2)}"`), "moved-page target " + to);
  const foot = /<footer class="site-foot">([\s\S]*?)<\/footer>/.exec(home)![1];
  assert.deepEqual([...foot.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => m[1]), ["/privacy", "/terms", "/support", "/download"]);
  for (const u of hrefs(home)) assert.match(u, /^\/(#(how|agents|limits)|demo|docs|learn|privacy|terms|support|download)?$|^\/(home\.css|favicon\.ico|favicon\.svg|apple-touch-icon\.png|fonts\/plex\/IBMPlexSans-Bold-Latin1\.woff2)$|^https:\/\//, u);
});

test("canonical: ATTACKFEE_SITE_URL unset (null), empty or invalid means no canonical tag on any page", () => {
  for (const raw of [null, "", "   ", "http://site.example", "garbage", "https://user@site.example", "https://site.example?x=1"]) {
    const warned: string[] = [];
    const dir = build(tmp(), raw as any, (m: string) => warned.push(m));
    for (const f of FILES) {
      const h = readFileSync(dir + f + ".html", "utf8");
      assert.deepEqual(canonicals(h), [], `${JSON.stringify(raw)}: ${f} has no canonical`);
      assert.equal(h, readFileSync(OUT + f + ".html", "utf8"), `${JSON.stringify(raw)}: ${f} is byte-identical to a build without ATTACKFEE_SITE_URL`);
      assert.doesNotMatch(h, /https?:|\/\/[a-z0-9]/i, `${f}: no absolute URL`);
    }
    if (raw !== null && raw.trim() !== "") {
      assert.equal(warned.length, 1, JSON.stringify(raw) + " is reported once");
      assert.ok(!warned[0].includes(raw), "the value itself is not logged");
    } else assert.deepEqual(warned, []);
  }
});

test("canonical: ATTACKFEE_SITE_URL=https://site.example gives each page a canonical to itself", () => {
  for (const raw of [SITE, SITE + "/", " " + SITE + "/\n"]) {
    const dir = build(tmp(), raw, () => assert.fail("valid value must not warn"));
    const want = (f: string) => SITE + "/" + (f === "index" ? "" : f);
    for (const f of FILES) {
      const h = readFileSync(dir + f + ".html", "utf8");
      assert.deepEqual(canonicals(h), [`<link rel="canonical" href="${want(f)}">`], `${JSON.stringify(raw)}: ${f}`);
      assert.ok(h.indexOf("rel=\"canonical\"") < h.indexOf("</head>"), f + ": canonical is in the head");
      const urls = [...h.matchAll(/https?:\/\/[^"'\\\s<]+/g)].map((m) => m[0]);
      assert.ok(urls.includes(want(f)), f);
      assert.ok(urls.every((u) => u === "https://schema.org" || u === "https://x.com/attackfee" || u.startsWith(SITE + "/")), f + ": " + urls.join(" "));
      if (f === "index") assert.ok(urls.includes("https://x.com/attackfee"), "Organization sameAs");
      if (f !== "index") {
        assert.ok(!urls.includes("https://schema.org"), f);
        assert.ok(!urls.includes("https://x.com/attackfee"), f);
      }
    }
  }
  // A site root with a path keeps it.
  const dir = build(tmp(), SITE + "/docs/", () => {});
  assert.deepEqual(canonicals(readFileSync(dir + "index.html", "utf8")), [`<link rel="canonical" href="${SITE}/docs/">`]);
  assert.deepEqual(canonicals(readFileSync(dir + "privacy.html", "utf8")), [`<link rel="canonical" href="${SITE}/docs/privacy">`]);
});

test("words: the homepage shows exactly the HOME strings, docs/copy.md holds the head tags, and nothing old remains", () => {
  const copy = readFileSync(ROOT + "docs/copy.md", "utf8");
  const head = section(copy, "Homepage head tags");
  assert.ok(head.includes("- `<title>`: " + HOME.title + "\n"), "title as placed by the PM");
  assert.ok(head.includes("- `<meta name=\"description\">`: " + HOME.description + "\n"), "description as placed by the PM");
  assert.ok(HOME.title.includes(" \u00B7 "), "the separator is U+00B7 MIDDLE DOT with a space on each side");
  assert.ok(copy.includes('"' + HOME.alt + '"'), "alt text");
  const h = readFileSync(OUT + "index.html", "utf8");
  assert.match(h, /<html lang="en">/);
  assert.ok(h.includes("<title>" + HOME.title + "</title>"));
  assert.ok(h.includes('<meta name="description" content="' + HOME.description + '">'));
  assert.ok(h.includes('<img src="/img/hail-grid.svg" alt="' + HOME.alt + '" width="640" height="640" fetchpriority="high">'));
  const body = h.replace(/<head>[\s\S]*<\/head>/, "");
  // Inline <b> and <code> runs join the text around them; block tags split it.
  const text = body.replace(/<\/?(b|code|i)\b[^>]*>/g, "").replace(/<[^>]+>/g, "\n").split("\n").map((t) => decode(t).trim()).filter(Boolean);
  const nav = ["How it works", "For agents", "Limits", "Demo", DOC_META.label, "Learn"];
  const foot = [...LEGAL_PAGES.map((p: any) => p.nav), "Download"];
  assert.deepEqual(text.filter((t) => t !== FOOTER_LINE), ["Attackfee", ...nav, ...homeStrings(), ...foot]);
  assert.equal(h.match(/<h1\b/g)!.length, 1, "one h1");
  assert.doesNotMatch(h, /TODO|lorem/i, "no placeholder left");
  assert.doesNotMatch(h, /agents can pay|no hosted demo/i, "retired claims are gone");
});

test("homepage: no scripts, no inline styles, no external requests; Plex preloaded locally with its OFL text", () => {
  const h = readFileSync(OUT + "index.html", "utf8");
  const body = h.replace(/<script type="application\/ld\+json">[^<]*<\/script>/, "");
  assert.doesNotMatch(body, /<script|<style|\sstyle=|\son[a-z]+\s*=|javascript:|<iframe|<object|<embed|<base\b|http-equiv/i);
  assert.doesNotMatch(body.replace(/<meta property="og:[^>]*>|<meta name="twitter:[^>]*>|<link rel="canonical"[^>]*>/g, ""), /https?:|\/\/[a-z0-9]/i, "no absolute or protocol-relative URL outside the head's social tags");
  assert.deepEqual([...h.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((l) => !l.includes('rel="canonical"')), [
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="preload" href="/fonts/plex/IBMPlexSans-Bold-Latin1.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="stylesheet" href="/home.css">',
  ], "Plex Sans Bold is the only preload");
  const css = readFileSync(OUT + "home.css", "utf8");
  assert.doesNotMatch(css, /@import|https?:|\/\/[a-z0-9]/i, "the stylesheet fetches nothing remote");
  assert.deepEqual([...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1].replace(/^\//, "")), PLEX);
  assert.equal(css.match(/font-display:swap/g)!.length, 4);
  const lic = readFileSync(OUT + "fonts/plex/LICENSE.txt", "utf8");
  assert.match(lic, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(lic, /Reserved Font Name ["'\u201C]Plex["'\u201D]/);
  for (const f of PLEX) assert.equal(readFileSync(OUT + f).subarray(0, 4).toString("latin1"), "wOF2", f);
  const svg = readFileSync(OUT + "img/hail-grid.svg", "utf8");
  assert.match(svg, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|\shref="http|xlink:href="http|@import/i, "the hero is plain shapes");
});

let server: Server;
let base = "";
const CSP = "default-src 'self'";
before(async () => {
  server = createServer((req, res) => {
    let f = (req.url ?? "/").split("?")[0].replace(/^\//, "") || "index";
    if (f === "nested/deep/" || f === "privacy/") f = f === "privacy/" ? "privacy" : "index"; // pages at other paths
    if (/^[a-z]+$/.test(f)) f += ".html";
    if (!/^[a-z0-9/-]+\.[a-z0-9]+$/i.test(f) || f.includes("..") || !existsSync(OUT + f)) { res.writeHead(404).end(); return; }
    const type: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css", jpg: "image/jpeg", woff2: "font/woff2", txt: "text/plain; charset=utf-8", png: "image/png", ico: "image/x-icon", svg: "image/svg+xml" };
    res.writeHead(200, { "content-type": type[f.split(".").pop()!] ?? "application/octet-stream", "content-security-policy": CSP }).end(readFileSync(OUT + f));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as any).port}/`;
});
after(() => server?.close());

test("in a browser under CSP default-src 'self': only same-origin requests, no CSP violations, no sideways scroll", async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1280, 390, 320]) {
      const ctx = await browser.newContext({ viewport: { width, height: width > 760 ? 800 : 844 } });
      const page = await ctx.newPage();
      const seen: string[] = [];
      const problems: string[] = [];
      page.on("request", (r) => seen.push(r.url()));
      page.on("console", (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) problems.push(m.text()); });
      await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error("Refused to load: CSP " + e.violatedDirective + " " + e.blockedURI)));
      const res = await page.goto(base, { waitUntil: "networkidle" });
      assert.equal(res!.status(), 200);
      assert.equal(res!.headers()["content-security-policy"], CSP);
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(problems, [], width + ": CSP violations");
      for (const u of seen) assert.ok(u.startsWith(base), `${width}: ${u} is same-origin`);
      assert.ok(seen.includes(base + "home.css") && seen.includes(base + "fonts/plex/IBMPlexSans-Bold-Latin1.woff2") && seen.includes(base + "img/hail-grid.svg"), width + ": stylesheet, Plex and the hero load");
      assert.equal(await page.evaluate(() => document.scripts.length), 0);
      assert.equal(await page.evaluate(() => document.fonts.check('700 20px "Attackfee Sans"')), true, width + ": Attackfee Sans (Plex) loaded");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, width + ": no sideways scroll");
      await ctx.close();
    }
    // Root-relative assets: the same pages served at other paths ("/nested/deep/", "/privacy/") still load
    // every stylesheet, font and image from the root, with nothing failing.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    for (const [path, want] of [["nested/deep/", ["home.css", "fonts/plex/IBMPlexSans-Bold-Latin1.woff2", "fonts/plex/IBMPlexSans-Regular-Latin1.woff2", "img/hail-grid.svg"]], ["privacy/", ["site.css"]]] as const) {
      const ok: string[] = [], bad: string[] = [];
      const onRes = (r: any) => (r.status() === 200 ? ok : bad).push(r.url() + " " + r.status());
      page.on("response", onRes);
      page.on("requestfailed", (r) => bad.push(r.url() + " failed"));
      assert.equal((await page.goto(base + path, { waitUntil: "networkidle" }))!.status(), 200, path);
      await page.evaluate(() => document.fonts.ready);
      page.off("response", onRes);
      page.removeAllListeners("requestfailed");
      assert.deepEqual(bad, [], path + ": nothing fails");
      for (const w of want) assert.ok(ok.includes(base + w + " 200"), `${path}: ${w} loads from the root (${ok.join(", ")})`);
    }
    await ctx.close();
  } finally {
    await browser.close();
  }
});
