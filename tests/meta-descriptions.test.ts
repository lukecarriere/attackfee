// Meta descriptions (QA NO-GO, Oct 3: four inner pages had none). Every built page has exactly one non-empty
// <meta name="description"> in its head. The homepage keeps its "Homepage head tags" description
// (tests/homepage.test.ts), the demo page its DEMO_DESCRIPTION, and the guides and legal pages their docs/copy.md text.
// The former mission pages (and their "Inner page descriptions") are gone; the worker redirects them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
// @ts-ignore plain JS build script
import { build, PAGES, HOME, DOC_PAGES, LEGAL_PAGES, DEMO_DESCRIPTION } from "../website/build.mjs";
import { loadLearnPages } from "../website/learn.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = ROOT + "website/dist/";
const OUT = build(mkdtempSync(join(tmpdir(), "attackfee-meta-")) + "/", "");
const SET = build(mkdtempSync(join(tmpdir(), "attackfee-meta-set-")) + "/", "https://site.example", () => {});
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

function walk(dir: string, at = dir): string[] {
  return readdirSync(at).flatMap((f) => statSync(join(at, f)).isDirectory() ? walk(dir, join(at, f)) : [relative(dir, join(at, f))]).sort();
}

/** Every <meta name="description"> in a page: where it sits and its decoded content. */
function metas(h: string) {
  const head = /<head>([\s\S]*?)<\/head>/.exec(h)![1];
  const all = [...h.matchAll(/<meta\b[^>]*\bname\s*=\s*["']?description\b[^>]*>/gi)].map((m) => m[0]);
  const inHead = [...head.matchAll(/<meta\b[^>]*\bname\s*=\s*["']?description\b[^>]*>/gi)].map((m) => m[0]);
  return { all, inHead, content: all.map((t) => { const c = /\scontent="([^"]*)"/.exec(t); return c ? decode(c[1]) : null; }) };
}

function check(dir: string, label: string) {
  const pages = walk(dir).filter((f) => f.endsWith(".html"));
  const guides = DOC_PAGES.map((p: { file: string }) => p.file + ".html").concat(LEGAL_PAGES.map((p: { file: string }) => p.file + ".html"));
  const learn = loadLearnPages().map((p) => p.file + ".html");
  assert.deepEqual(pages, ["404.html", "demo.html", "index.html", ...guides, ...learn].sort(), label + ": the built pages");
  for (const f of pages) {
    const m = metas(readFileSync(dir + f, "utf8"));
    assert.equal(m.all.length, 1, `${label} ${f}: exactly one meta description`);
    assert.equal(m.inHead.length, 1, `${label} ${f}: it is in the head`);
    assert.ok(m.content[0] && m.content[0].trim() !== "", `${label} ${f}: not empty`);
  }
  assert.deepEqual(PAGES, [], "no mission pages");
  const demo = readFileSync(dir + "demo.html", "utf8");
  assert.equal(metas(demo).content[0], DEMO_DESCRIPTION, label + ": the demo page description");
  assert.equal(metas(readFileSync(dir + "index.html", "utf8")).content[0], HOME.description, label + ": the homepage keeps its description");
  for (const p of DOC_PAGES) {
    const h = readFileSync(dir + p.file + ".html", "utf8");
    assert.equal(metas(h).content[0], p.description, `${label} ${p.file}: docs/copy.md description`);
    assert.ok(h.includes(`<meta name="description" content="${p.description}">`), `${label} ${p.file}: verbatim in the attribute`);
  }
  for (const p of LEGAL_PAGES) {
    const h = readFileSync(dir + p.file + ".html", "utf8");
    assert.equal(metas(h).content[0], p.description, `${label} ${p.file}: docs/copy.md legal description`);
    assert.ok(h.includes(`<meta name="description" content="${p.description}">`), `${label} ${p.file}: verbatim in the attribute`);
  }
  for (const p of loadLearnPages()) {
    const h = readFileSync(dir + p.file + ".html", "utf8");
    assert.equal(metas(h).content[0], p.description, `${label} ${p.file}: front matter description`);
  }
}

test("docs/copy.md no longer lists inner page descriptions; the demo description is set and plain", () => {
  const copy = readFileSync(ROOT + "docs/copy.md", "utf8");
  assert.equal(copy.includes("\n## Inner page descriptions"), false);
  assert.ok([...DEMO_DESCRIPTION].length >= 70 && [...DEMO_DESCRIPTION].length <= 160, DEMO_DESCRIPTION);
  assert.doesNotMatch(DEMO_DESCRIPTION, /[&<>"]/);
});

test("meta description: every built page has exactly one, none empty, each from its documented source", () => {
  check(OUT, "fresh build");
  check(SET, "fresh build with a site root");
  assert.ok(existsSync(DIST), "website/dist/ is missing: run `npm run build` (or `npm run build:website`) first");
  check(DIST, "website/dist");
});

test("5cd9c85: legal descriptions were inlined in the build, not in docs/copy.md", () => {
  const copy = execFileSync("git", ["show", "5cd9c85:docs/copy.md"], { encoding: "utf8" });
  const build = execFileSync("git", ["show", "5cd9c85:website/build.mjs"], { encoding: "utf8" });
  assert.equal(copy.includes("## Legal page descriptions"), false);
  assert.match(build, new RegExp("What the " + "To" + "ll MCP server and [a-z0-9.]+ collect"));
  const now = readFileSync(ROOT + "docs/copy.md", "utf8");
  const src = readFileSync(ROOT + "website/build.mjs", "utf8");
  assert.ok(now.includes("## Legal page descriptions"));
  assert.equal(src.includes("What the Attackfee MCP server and example.invalid collect"), false);
  assert.equal(LEGAL_PAGES.find((p: { file: string }) => p.file === "privacy").description, "The Attackfee MCP server runs on your computer and stores no data. Pages, docs and downloads are static files with no analytics.");
});

test("meta description: the parser catches a missing, doubled or empty tag", () => {
  const page = (head: string) => `<!doctype html><html><head>${head}</head><body></body></html>`;
  assert.equal(metas(page("")).all.length, 0);
  assert.equal(metas(page('<meta name="description" content="a"><meta name="description" content="b">')).all.length, 2);
  assert.equal(metas(page('<meta name="description" content="">')).content[0], "");
  assert.equal(metas(page('<meta name="description" content="Tom &amp; &quot;Jerry&quot;">')).content[0], 'Tom & "Jerry"');
});
