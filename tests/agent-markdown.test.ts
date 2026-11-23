// Markdown twins: every sitemap page ships a .md twin built from the same content as its HTML (no
// cloaking), the HTML gains only one alternate link, llms.txt links the twins, llms-full.txt holds them
// all, robots.txt names each AI agent, and the sitemap carries lastmod.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, discoveryFiles, pagePath, HOME, DOC_PAGES, LEGAL_PAGES, DEMO_DESCRIPTION, sitemapXml } from "../website/build.mjs";
import { twinPath, mainBlocks, markdownPlain, stripAlternate, alternateLink, outsideCode, KEY_FACTS } from "../website/agent-text.mjs";
import { OLD_BRAND } from "../scripts/check-served-brand.mjs";
import { AI_AGENTS } from "../packages/edge-cf/src/agent-view.ts";

const SITE = "https://site.example";
const ROOT = new URL("..", import.meta.url).pathname;
const tmp = () => mkdtempSync(join(tmpdir(), "attackfee-md-")) + "/";
const htmlPath = (file: string) => (file === "index" ? "index.html" : file === "demo" ? "demo.html" : file + ".html");
const squash = (s: string) => s.replace(/\s+/g, "");
const dir = build(tmp(), SITE, () => {});

test("outsideCode drops fenced and inline code only", () => {
  assert.equal(outsideCode("a `<script>` b\n```html\n<script src=x></script>\n# not a heading\n```\nc"), "a  b\n\nc");
});

test("twin paths: /index.md for home, the page path plus .md otherwise", () => {
  assert.equal(twinPath("index"), "/index.md");
  assert.equal(twinPath("docs/index"), "/docs.md");
  assert.equal(twinPath("docs/widget"), "/docs/widget.md");
  assert.equal(twinPath("download/index"), "/download.md");
  assert.equal(twinPath("privacy"), "/privacy.md");
  assert.equal(twinPath("demo"), "/demo.md");
  assert.equal(twinPath("learn/index"), "/learn.md");
  assert.equal(twinPath("learn/concepts/index"), "/learn/concepts.md");
  assert.equal(twinPath("learn/concepts/what-is-a-write-surface"), "/learn/concepts/what-is-a-write-surface.md");
});

test("every sitemap page has a Markdown twin with one h1, no HTML, no script and no site chrome", () => {
  const locs = [...readFileSync(dir + "sitemap.xml", "utf8").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, discoveryFiles().map((f: string) => SITE + pagePath(f)));
  for (const file of discoveryFiles()) {
    const p = dir + twinPath(file).slice(1);
    assert.ok(existsSync(p), file + ": twin " + twinPath(file));
    const md = readFileSync(p, "utf8");
    const prose = outsideCode(md);
    assert.match(md, /^# \S/, file + ": starts with the page h1");
    assert.equal([...prose.matchAll(/^# /gm)].length, 1, file + ": one h1");
    // Code examples in the guides show a script tag as text; outside code there is no markup at all.
    assert.doesNotMatch(prose, /<script|<nav|<header|<footer|<html|<body|<form|<\/?(?:div|span|section|main)\b/i, file);
    assert.ok(!md.includes("This site has no analytics and no tracking scripts."), file + ": no footer chrome");
    assert.doesNotMatch(md, OLD_BRAND, file);
    assert.ok(md.endsWith("\n") && !md.endsWith("\n\n"), file + ": one trailing newline");
  }
});

test("no cloaking: every text block in each page's <main> is in its Markdown twin, word for word", () => {
  for (const file of discoveryFiles()) {
    const html = readFileSync(dir + htmlPath(file), "utf8");
    const md = squash(markdownPlain(readFileSync(dir + twinPath(file).slice(1), "utf8")));
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)![1];
    const blocks = mainBlocks(html);
    assert.ok(blocks.length >= 3, file + ": found the page's blocks");
    assert.ok(blocks.some((b: string) => squash(b) === squash(h1.replace(/<[^>]+>/g, ""))), file + ": the h1 is a block");
    for (const b of blocks) assert.ok(md.includes(squash(b)), `${file}: missing from the twin: ${b}`);
  }
});

test("key facts are identical in the HTML and the Markdown: the write price, how it works, free reads and paid writes", () => {
  const html = squash(mainBlocks(readFileSync(dir + "index.html", "utf8")).join("\n"));
  const md = squash(markdownPlain(readFileSync(dir + "index.md", "utf8")));
  const copy = squash([HOME.lede, HOME.definition, ...HOME.facts, ...HOME.sections.flatMap((s: { body: unknown[] }) => s.body.flatMap((b) => (typeof b === "string" ? [b] : ((b as { ol?: string[]; ul?: string[] }).ol ?? (b as { ul: string[] }).ul)))), ...HOME.faq.flat()].join(" ").replace(/\*\*|`/g, ""));
  assert.ok(KEY_FACTS.length >= 6);
  for (const fact of KEY_FACTS) {
    assert.ok(copy.includes(squash(fact)), "the fact is existing homepage copy: " + fact);
    assert.ok(html.includes(squash(fact)), "HTML: " + fact);
    assert.ok(md.includes(squash(fact)), "Markdown: " + fact);
  }
  assert.ok(KEY_FACTS.some((f: string) => /under a cent/.test(f) && /\/v1\/price/.test(f)), "the write price fact");
  assert.ok(KEY_FACTS.some((f: string) => /^Reads stay free\./.test(f)), "the free reads fact");
  const demo = squash(markdownPlain(readFileSync(dir + "demo.md", "utf8")));
  assert.ok(demo.includes(squash("A write costs under a cent; current prices are at /v1/price.")), "demo price line");
});

test("the HTML gains exactly one alternate link to its twin, in the head; without it the page is unchanged", () => {
  const plain = build(tmp(), "", () => {});
  for (const file of discoveryFiles()) {
    const html = readFileSync(dir + htmlPath(file), "utf8");
    const tag = `<link rel="alternate" type="text/markdown" href="${twinPath(file)}">`;
    assert.equal(alternateLink(file, SITE), tag);
    assert.equal(html.split(tag).length, 2, file + ": one alternate link");
    assert.ok(html.indexOf(tag) < html.indexOf("</head>"), file + ": in the head");
    assert.equal(stripAlternate(html), html.replace(tag, ""), file);
    assert.doesNotMatch(stripAlternate(html), /text\/markdown/, file);
    assert.doesNotMatch(readFileSync(plain + htmlPath(file), "utf8"), /rel="alternate"/, file + ": no site root, no alternate link");
  }
  assert.equal(alternateLink("index", null), "");
});

test("llms.txt links every Markdown twin and llms-full.txt; llms-full.txt is every twin in sitemap order", () => {
  const llms = readFileSync(dir + "llms.txt", "utf8");
  for (const p of [...DOC_PAGES, ...LEGAL_PAGES]) assert.ok(llms.includes(`](${SITE}${twinPath(p.file)}): ${p.description}`), p.file);
  assert.ok(llms.includes(`](${SITE}${twinPath("demo")}): ${DEMO_DESCRIPTION}`), "demo");
  assert.ok(llms.includes(`](${SITE}/index.md): ${HOME.description}`), "home");
  assert.ok(llms.includes(`](${SITE}/llms-full.txt)`), "llms-full.txt");
  const full = readFileSync(dir + "llms-full.txt", "utf8");
  let at = 0;
  for (const file of discoveryFiles()) {
    const md = readFileSync(dir + twinPath(file).slice(1), "utf8");
    const head = `Source: ${SITE}${pagePath(file)}\n\n`;
    const i = full.indexOf(head + md, at);
    assert.ok(i >= at, file + ": in llms-full.txt, in order");
    at = i + head.length + md.length;
  }
  assert.doesNotMatch(outsideCode(full), /<script/i);
  assert.doesNotMatch(full, OLD_BRAND);
  const plain = build(tmp(), "", () => {});
  assert.equal(existsSync(plain + "llms-full.txt"), false, "no site root, no llms-full.txt");
});

test("robots.txt allows everyone and names each AI agent in an explicit allow group", () => {
  const src = readFileSync(ROOT + "website/robots.txt", "utf8");
  assert.ok(src.startsWith("User-agent: *\nAllow: /\n"), "the open default stays first");
  const groups = src.split(/\n\s*\n/).map((g) => g.trim()).filter(Boolean);
  assert.equal(groups.length, 2);
  const named = [...groups[1].matchAll(/^User-agent: (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(named, [...AI_AGENTS]);
  assert.match(groups[1], /\nAllow: \/$/);
  assert.doesNotMatch(src, /^\s*disallow/im);
  assert.ok(readFileSync(dir + "robots.txt", "utf8").startsWith(src), "the build ships the source");
});

test("the sitemap gives each page a YYYY-MM-DD lastmod when the page has a date", () => {
  const sm = readFileSync(dir + "sitemap.xml", "utf8");
  const rows = [...sm.matchAll(/<url><loc>([^<]*)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?<\/url>/g)];
  assert.equal(rows.length, discoveryFiles().length);
  for (const r of rows) assert.match(r[2] ?? "", /^\d{4}-\d{2}-\d{2}$/, r[1] + ": lastmod");
  assert.equal(sitemapXml(SITE, () => "2026-11-18").includes("<lastmod>2026-11-18</lastmod>"), true);
  assert.doesNotMatch(sitemapXml(SITE, () => ""), /lastmod/, "no date, no lastmod");
});
