// Public-site discovery: canonical and social tags, sitemap, robots Sitemap line, llms.txt,
// homepage JSON-LD, and the www -> apex redirect. An explicit empty site root stays free of absolute URLs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { wwwRedirect, workerHandles, movedPage } from "../packages/edge-cf/src/host-redirect.ts";
import { build, cliSiteRaw, discoveryFiles, pagePath, HOME, PAGES, DOC_PAGES, LEGAL_PAGES, LLMS_BODY, LLMS_SUMMARY, LLMS_SITE, OG_ALT, DEMO_DESCRIPTION, homeStrings } from "../website/build.mjs";

const SITE = "https://site.example";
const ROOT = new URL("..", import.meta.url).pathname;
const tmp = () => mkdtempSync(join(tmpdir(), "attackfee-seo-")) + "/";
const htmlPath = (file: string) => (file === "index" ? "index.html" : file === "demo" ? "demo.html" : file + ".html");
const titleOf = (h: string) => /<title>([^<]*)<\/title>/.exec(h)![1];
const descOf = (h: string) => /<meta name="description" content="([^"]*)">/.exec(h)![1];

function walkMd(dir: string, at = dir): string[] {
  return readdirSync(at).flatMap((f) => {
    const p = join(at, f);
    if (f === "dist") return [];
    return statSync(p).isDirectory() ? walkMd(dir, p) : p.endsWith(".md") ? [p] : [];
  });
}

test("every public page: self canonical, Open Graph and Twitter tags from that page's title and description", () => {
  const dir = build(tmp(), SITE, () => {});
  const image = SITE + "/img/social-card.png";
  assert.ok(existsSync(dir + "img/social-card.png"), "the social card ships");
  const png = readFileSync(dir + "img/social-card.png");
  assert.equal(png.subarray(1, 4).toString("latin1"), "PNG");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630], "the social card is 1200x630");
  for (const file of discoveryFiles()) {
    const html = readFileSync(dir + htmlPath(file), "utf8");
    const url = SITE + pagePath(file);
    const title = titleOf(html);
    const description = descOf(html);
    assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1, file);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), file);
    assert.ok(html.includes(`<meta property="og:title" content="${title}">`), file);
    assert.ok(html.includes(`<meta property="og:description" content="${description}">`), file);
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`), file);
    assert.ok(html.includes(`<meta property="og:type" content="website">`), file);
    assert.ok(html.includes(`<meta property="og:image" content="${image}">`), file);
    assert.ok(html.includes(`<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${OG_ALT}">`), file);
    assert.ok(html.includes(`<meta name="twitter:image:alt" content="${OG_ALT}">`), file);
    assert.ok(html.includes(`<meta name="twitter:card" content="summary_large_image">`), file);
    assert.ok(html.includes(`<meta name="twitter:title" content="${title}">`), file);
    assert.ok(html.includes(`<meta name="twitter:description" content="${description}">`), file);
    assert.ok(html.includes(`<meta name="twitter:image" content="${image}">`), file);
    const jsonLd = file === "index" || file === "demo" || file.startsWith("learn/") ? 1 : 0;
    assert.equal([...html.matchAll(/<script type="application\/ld\+json"/g)].length, jsonLd, file);
  }
});

test("empty site root: no canonical, no social tags, no JSON-LD, no sitemap, no llms.txt", () => {
  const dir = build(tmp(), "");
  assert.equal(existsSync(dir + "sitemap.xml"), false);
  assert.equal(existsSync(dir + "llms.txt"), false);
  assert.equal(existsSync(dir + "llms-learn.txt"), false);
  assert.equal(readFileSync(dir + "robots.txt", "utf8"), readFileSync(ROOT + "website/robots.txt", "utf8"));
  for (const file of discoveryFiles()) {
    const html = readFileSync(dir + htmlPath(file), "utf8");
    assert.doesNotMatch(html, /rel="canonical"|property="og:|name="twitter:|application\/ld\+json/, file);
  }
});

test("sitemap lists the public pages and no API routes; llms.txt uses only sentences already on the site", () => {
  const dir = build(tmp(), SITE, () => {});
  const sm = readFileSync(dir + "sitemap.xml", "utf8");
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, discoveryFiles().map((f: string) => SITE + pagePath(f)));
  assert.ok(!locs.some((u: string) => u.includes(".html") || u.includes("/v1/") || u.includes("attackfee.json")));
  const llms = readFileSync(dir + "llms.txt", "utf8");
  assert.match(llms, /^# Attackfee\n/);
  assert.doesNotMatch(llms, /\b(cashu|ecash|sats|bitcoin|lightning)\b/i);
  const corpus = walkMd(ROOT + "website").map((p) => readFileSync(p, "utf8")).join("\n");
  const prose = llms.split("\n## ")[0].replace(/^>\s*/gm, "").replace(/^#.*$/gm, "");
  const sentences = prose.split(/(?<=\.)\s+/).map((s) => s.trim()).filter((s) => s.endsWith("."));
  assert.ok(sentences.length >= 8, sentences.join(" | "));
  // Attackfee: the homepage words and Marketing's llms.txt lines (recorded verbatim in docs/copy.md) count as on the site.
  const copy = readFileSync(ROOT + "docs/copy.md", "utf8");
  for (const line of [LLMS_SUMMARY, LLMS_BODY, LLMS_SITE]) assert.ok(copy.includes(`"${line}"`), "the llms.txt line is in docs/copy.md verbatim: " + line);
  const homeText = [HOME.description, ...homeStrings(), LLMS_SUMMARY, LLMS_BODY, LLMS_SITE].join(" ");
  for (const s of sentences) assert.ok(s === HOME.description || corpus.includes(s) || homeText.includes(s), "not on the site: " + s);
  for (const p of [...DOC_PAGES, ...PAGES, ...LEGAL_PAGES]) {
    assert.ok(llms.includes(`](${SITE}${pagePath(p.file)}): ${p.description}`), p.file);
  }
  assert.ok(llms.includes(`](${SITE}/demo): ${DEMO_DESCRIPTION}`), "demo");
  assert.doesNotMatch(llms, /agents can pay|no hosted demo/i);
  assert.ok(llms.includes(`](${SITE}/): ${HOME.description}`));
});

test("homepage JSON-LD is SoftwareApplication and the site CSP allows that script by hash", async () => {
  const dir = build(tmp(), SITE, () => {});
  const home = readFileSync(dir + "index.html", "utf8");
  const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(home)![1];
  const doc = JSON.parse(body);
  assert.equal(doc["@context"], "https://schema.org");
  const data = doc["@graph"].find((n: any) => n["@type"] === "SoftwareApplication");
  assert.equal(data["@type"], "SoftwareApplication");
  assert.equal(data.name, "Attackfee");
  assert.equal(data.description, HOME.description);
  assert.equal(data.url, SITE + "/");
  assert.equal(data.image, SITE + "/img/social-card.png");
  assert.equal(data.documentation, SITE + "/docs");
  assert.equal("offers" in data, false);
  assert.equal("aggregateRating" in data, false);
  // No offer or rating markup on the product node. FAQ answers may say "price" in words (Nov 18 brief).
  assert.doesNotMatch(JSON.stringify(data), /price|rating|cashu|ecash|sats|bitcoin/i);
  assert.doesNotMatch(body, /rating|cashu|ecash|sats|bitcoin|"offers"/i);
  const hash = createHash("sha256").update(body).digest("base64");
  const headers = readFileSync(dir + "_headers", "utf8");
  const csp = headers.split("\n").find((l) => l.includes("default-src 'none'"))!.replace(/^\s*Content-Security-Policy:\s*/, "");
  assert.ok(csp.includes(`script-src 'sha256-${hash}'`), csp);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/);
  for (const d of ["default-src 'none'", "style-src 'self'", "img-src 'self'", "font-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"]) assert.ok(csp.includes(d), d);

  const types: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css", jpg: "image/jpeg", woff2: "font/woff2", png: "image/png", svg: "image/svg+xml", ico: "image/x-icon" };
  const server: Server = createServer((req, res) => {
    let p = (req.url ?? "/").split("?")[0];
    if (p.endsWith("/")) p = p.slice(0, -1);
    if (p === "") p = "/index.html";
    else if (!p.includes(".")) p += ".html";
    const rel = p.replace(/^\//, "");
    if (rel.includes("..") || !existsSync(dir + rel)) { res.writeHead(404).end(); return; }
    const ext = rel.split(".").pop()!;
    res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream", "content-security-policy": csp }).end(readFileSync(dir + rel));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const problems: string[] = [];
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error("CSP " + e.violatedDirective + " " + e.blockedURI)));
    page.on("console", (m) => { if (/^CSP /.test(m.text())) problems.push(m.text()); });
    assert.equal((await page.goto(base + "/", { waitUntil: "networkidle" }))!.status(), 200);
    assert.deepEqual(problems, [], problems.join("\n"));
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    assert.ok(JSON.parse(raw!)["@graph"].some((n: { "@type": string }) => n["@type"] === "SoftwareApplication"));
    assert.equal(await page.evaluate(() => document.scripts.length), 1);
    problems.length = 0;
    assert.equal((await page.goto(base + "/privacy", { waitUntil: "networkidle" }))!.status(), 200);
    assert.deepEqual(problems, []);
    assert.equal(await page.evaluate(() => document.scripts.length), 0);
    assert.match(await page.locator("h1").innerText(), /Privacy/);
  } finally {
    await browser.close();
    server.close();
  }
});

test("www redirects to the apex with 308; other hosts and static paths do not", async () => {
  const req = (url: string, method = "GET") => wwwRedirect(new Request(url, { method }), SITE);
  const docs = req("https://www.site.example/docs?q=1");
  assert.equal(docs!.status, 308);
  assert.equal(docs!.headers.get("location"), "https://site.example/docs?q=1");
  assert.equal(await docs!.text(), "");
  const post = req("https://www.site.example/v1/health", "POST");
  assert.equal(post!.status, 308);
  assert.equal(post!.headers.get("location"), "https://site.example/v1/health");
  assert.equal(await post!.text(), "");
  assert.equal(req("https://site.example/docs"), null);
  assert.equal(req("https://www.other.example/docs"), null);
  assert.equal(wwwRedirect(new Request("https://www.site.example/"), "http://site.example"), null);
  assert.equal(wwwRedirect(new Request("https://www.site.example/"), undefined), null);
  const spoof = new Request("https://site.example/mission", { headers: { host: "www.site.example" } });
  assert.equal(wwwRedirect(spoof, SITE), null);
  const apex = cliSiteRaw();
  assert.equal(typeof apex, "string");
  const live = wwwRedirect(new Request("https://www." + new URL(apex!).host + "/mission"), apex);
  assert.equal(live!.status, 308);
  assert.equal(live!.headers.get("location"), "https://" + new URL(apex!).host + "/mission");
  assert.equal(await live!.text(), "");
  assert.equal(workerHandles("/v1/health"), true);
  assert.equal(workerHandles("/demo/contact"), true);
  assert.equal(workerHandles("/.well-known/attackfee.json"), true);
  assert.equal(workerHandles("/demo"), false);
  assert.equal(workerHandles("/mission"), false);
  // Former mission pages: GET and HEAD get a 308 to the homepage section; other methods and paths pass through.
  for (const [p, to] of [["/mission", "/#why"], ["/vision/", "/#why"], ["/values", "/#privacy"], ["/ecosystem", "/#limits"]]) {
    for (const method of ["GET", "HEAD"]) {
      const r = movedPage(new Request(SITE + p + "?x=1", { method }));
      assert.equal(r!.status, 308, method + " " + p);
      assert.equal(r!.headers.get("location"), to);
    }
  }
  assert.equal(movedPage(new Request(SITE + "/mission", { method: "POST", body: "a=b" })), null);
  for (const p of ["/", "/docs", "/constructor", "/__proto__", "/toString", "/missions"]) assert.equal(movedPage(new Request(SITE + p)), null, p);
  const siteSrc = readFileSync(ROOT + "packages/edge-cf/src/site.ts", "utf8");
  assert.ok(siteSrc.indexOf("movedPage(req)") < siteSrc.indexOf("workerHandles(url.pathname)"), "moved pages answer before the asset hand-off");
  assert.equal(workerHandles("/sitemap.xml"), false);
  const src = readFileSync(ROOT + "packages/edge-cf/src/site.ts", "utf8");
  const body = src.slice(src.indexOf("async fetch"));
  assert.ok(body.indexOf("wwwRedirect(req, env.ATTACKFEE_SITE_URL)") < body.indexOf("workerHandles(url.pathname)"));
  assert.ok(body.indexOf("workerHandles(url.pathname)") < body.indexOf("storeFailSlot.run"));
});

test("a gated route reaches the worker; static pages and files go to assets", () => {
  const handler = readFileSync(ROOT + "packages/edge-cf/src/handler.ts", "utf8");
  const prefixes = [...handler.matchAll(/list\(env\.(?:WRITE|SEARCH|ACCOUNT)_PATHS, (\[[^\]]*\])\)/g)].flatMap((m) => JSON.parse(m[1]) as string[]);
  assert.ok(prefixes.includes("/search"), "the edge default still gates /search");
  for (const prefix of prefixes) {
    const path = prefix.endsWith("/") ? prefix + "item" : prefix;
    assert.equal(workerHandles(path), true, path + " is gated and must not be routed to assets");
  }
  assert.equal(workerHandles("/demo/contact"), true);
  assert.equal(workerHandles("/v1/redeem"), true);
  assert.equal(workerHandles("/attackfee/v1/attackfee.js"), true);
  const assets = ["/", "/docs", "/docs/server", "/docs/wordpress", "/learn", "/learn/", "/learn/concepts/what-is-a-write-surface", "/learn.md", "/learn/concepts/what-is-a-write-surface.md", "/pricing", "/sitemap.xml", "/llms.txt", "/llms-learn.txt", "/robots.txt", "/mission", "/vision", "/values", "/ecosystem", "/privacy", "/terms", "/support", "/download", "/demo", "/site.css", "/learn.css", "/demo.js", "/img/hail-grid.svg", "/fonts/plex/IBMPlexSans-Bold-Latin1.woff2", "/download/attackfee.zip", "/index.md", "/docs/server.md", "/llms-full.txt"];
  for (const path of assets) assert.equal(workerHandles(path), false, path + " is a static file");
  assert.equal(workerHandles("/mission/"), false);
  assert.equal(workerHandles("/search/"), true);
  const site = readFileSync(ROOT + "packages/edge-cf/src/site.ts", "utf8");
  // Static paths reach the assets through the agent view (agent-view.ts), which only picks HTML or the Markdown twin.
  assert.match(site, /if \(!workerHandles\(url\.pathname\)\) return serveSite\(req, env\.ASSETS\)/);
});
