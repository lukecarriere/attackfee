// Learning Center: /learn and /learn/<hub>/<slug> on the existing static build.
// A hub crumb links /learn/<hub> only when that hub index is in the set. This tree
// publishes an index for every hub, so each hub crumb is a link.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, discoveryFiles, pagePath, sourceLastmod } from "../website/build.mjs";
import { LEARN_HUBS, LLMS_BYTE_CAP, LEARN_CATALOG_LINE, loadLearnPages, namesPath } from "../website/learn.mjs";
import { twinPath, mainBlocks, markdownPlain } from "../website/agent-text.mjs";
import { workerHandles } from "../packages/edge-cf/src/host-redirect.ts";
import { serveSite } from "../packages/edge-cf/src/agent-view.ts";
// @ts-ignore plain JS helper
import { lintText } from "../scripts/copy-lib.mjs";
import { OLD_BRAND } from "../scripts/check-served-brand.mjs";

const SITE = "https://site.example";
const ROOT = new URL("..", import.meta.url).pathname;
const tmp = () => mkdtempSync(join(tmpdir(), "attackfee-learn-")) + "/";
const squash = (s: string) => s.replace(/\s+/g, "");
const BANNED = ["ca", "pt", "cha"].join("");
const OLD = ["to", "ll"].join("");
const KNOWN = ["/docs", "/docs/quick-start", "/demo", "/"];

const SEED_INDEX = "learn/index";
const SEED_PAGE = "learn/concepts/what-is-a-write-surface";
const INDEX_DESC = "Short answers about write-side security. Reads stay free. Writes such as comments, signups, logins, posted search, and write APIs need a pass.";
const PAGE_DESC = "A write surface is a route that changes something on your site, such as a comment form, a signup, a login, a posted search query, or a write API. Reads are not write surfaces.";

function source(rel: string, fields: Record<string, unknown>, body?: string) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      lines.push(k + ":");
      for (const item of v) {
        if (item && typeof item === "object") {
          const row = item as { q: string; a: string };
          lines.push("  - q: " + row.q);
          lines.push("    a: " + row.a);
        } else lines.push("  - " + item);
      }
    } else lines.push(`${k}: ${v}`);
  }
  const title = String(fields.title ?? "A write surface");
  lines.push("---", "", body ?? `# ${title}\n\nA short page about a route that changes something.\n\nSee the [docs](/docs).\n`);
  return { rel, text: lines.join("\n") };
}

function goodFields(over: Record<string, unknown> = {}) {
  return {
    title: "A write surface",
    description: "A short page about a route that changes something.",
    hub: "concepts",
    slug: "a-write-surface",
    type: "concept",
    order: 10,
    related: ["/docs", "/docs/quick-start", "/demo"],
    audience: "both",
    status: "published",
    schema: "WebPage",
    ...over,
  };
}

async function learnMod() {
  return import("../website/learn.mjs");
}

test("host-redirect treats /learn and nested learn paths as site assets", () => {
  for (const p of ["/learn", "/learn/", "/learn/concepts/what-is-a-write-surface", "/learn.md", "/learn/concepts/what-is-a-write-surface.md", "/learn.css", "/llms.txt", "/llms-learn.txt", "/llms-full.txt"]) {
    assert.equal(workerHandles(p), false, p);
  }
});

test("page and twin paths: the learn index is /learn and /learn.md", () => {
  assert.equal(pagePath("learn/index"), "/learn");
  assert.equal(pagePath("learn/concepts/index"), "/learn/concepts");
  assert.equal(pagePath(SEED_PAGE), "/learn/concepts/what-is-a-write-surface");
  assert.equal(twinPath("learn/index"), "/learn.md");
  assert.equal(twinPath("learn/concepts/index"), "/learn/concepts.md");
  assert.equal(twinPath(SEED_PAGE), "/learn/concepts/what-is-a-write-surface.md");
});

test("front matter: a good page passes, and each required field and failure mode fails", async () => {
  const learn = await learnMod();
  const ctx = { knownPaths: KNOWN, today: "2026-11-20", lastmod: () => "" };
  const ok = source("concepts/a-write-surface.md", goodFields());
  assert.deepEqual(learn.validateLearnFiles([ok], ctx), []);

  const drop = (key: string) => {
    const fields = goodFields();
    delete (fields as Record<string, unknown>)[key];
    return source("concepts/a-write-surface.md", fields);
  };
  for (const key of ["title", "description", "hub", "slug", "type", "order", "related", "audience", "status"]) {
    const errors = learn.validateLearnFiles([drop(key)], ctx);
    assert.ok(errors.some((e: string) => e.includes(key)), key + ": " + errors.join(" | "));
  }

  const cases: [string, { rel: string; text: string }[], Record<string, unknown> | undefined, RegExp][] = [
    ["slug mismatch", [source("concepts/a-write-surface.md", goodFields({ slug: "other" }))], undefined, /slug/],
    ["hub mismatch", [source("concepts/a-write-surface.md", goodFields({ hub: "agents" }))], undefined, /hub/],
    ["unknown hub", [source("nope/a-write-surface.md", goodFields({ hub: "nope" }))], undefined, /hub/],
    ["unknown type", [source("concepts/a-write-surface.md", goodFields({ type: "essay" }))], undefined, /type/],
    ["draft", [source("concepts/a-write-surface.md", goodFields({ status: "draft" }))], undefined, /published/],
    ["bad order", [source("concepts/a-write-surface.md", goodFields({ order: "1.5" }))], undefined, /order/],
    ["bad audience", [source("concepts/a-write-surface.md", goodFields({ audience: "everyone" }))], undefined, /audience/],
    ["bad schema", [source("concepts/a-write-surface.md", goodFields({ schema: "Product" }))], undefined, /schema/],
    ["few related", [source("concepts/a-write-surface.md", goodFields({ related: ["/docs"] }))], undefined, /related/],
    ["many related", [source("concepts/a-write-surface.md", goodFields({ related: ["/docs", "/demo", "/", "/docs/quick-start", "/docs/widget", "/docs/server", "/docs/agent", "/docs/mcp", "/docs/ask"] }))], { knownPaths: [...KNOWN, "/docs/widget", "/docs/server", "/docs/agent", "/docs/mcp", "/docs/ask"] }, /related/],
    ["second h1", [source("concepts/a-write-surface.md", goodFields(), "# A write surface\n\n# Again\n")], undefined, /h1/],
    ["title mismatch", [source("concepts/a-write-surface.md", goodFields(), "# Other title\n\nSee the [docs](/docs).\n")], undefined, /title|h1/],
    ["unsupported", [source("concepts/a-write-surface.md", goodFields(), "# A write surface\n\n> quoted\n")], undefined, /unsupported/],
    ["broken related", [source("concepts/a-write-surface.md", goodFields({ related: ["/docs", "/docs/quick-start", "/missing-page"] }))], undefined, /missing-page/],
    ["broken body link", [source("concepts/a-write-surface.md", goodFields(), "# A write surface\n\nSee [gone](/missing-page).\n")], undefined, /missing-page/],
    ["lint", [source("concepts/a-write-surface.md", goodFields(), "# A write surface\n\nPay with bitcoin today.\n")], undefined, /bitcoin/],
    ["old name", [source("concepts/a-write-surface.md", goodFields(), `# A write surface\n\nSee ${OLD} today.\n`)], undefined, /old product name/],
    ["banned heading", [source("concepts/a-write-surface.md", goodFields({ title: "No " + BANNED.toUpperCase() }), "# No " + BANNED.toUpperCase() + "\n\nSee the [docs](/docs).\n")], undefined, new RegExp(BANNED, "i")],
    ["dollar", [source("concepts/a-write-surface.md", goodFields(), "# A write surface\n\nIt costs $4.\n")], undefined, /dollar/],
    ["future updated", [source("concepts/a-write-surface.md", goodFields({ updated: "2999-01-01" }))], undefined, /updated/],
    ["bad slug", [source("concepts/Bad.md", goodFields({ slug: "Bad" }))], undefined, /slug/],
    ["faq short", [source("concepts/a-write-surface.md", goodFields({ faq: [{ q: "One?", a: "A." }, { q: "Two?", a: "B." }] }))], undefined, /faq/],
  ];
  for (const [name, files, extra, re] of cases) {
    const errors = learn.validateLearnFiles(files, { ...ctx, ...extra });
    assert.ok(errors.some((e: string) => re.test(e)), name + ": " + errors.join(" | "));
  }

  const dup = learn.validateLearnFiles([
    source("concepts/a-write-surface.md", goodFields()),
    source("concepts/other.md", goodFields({ slug: "a-write-surface" })),
  ], ctx);
  assert.ok(dup.some((e: string) => /duplicate slug/.test(e)), dup.join(" | "));

  const dated = learn.validateLearnFiles([
    source("concepts/a-write-surface.md", goodFields({ updated: "2026-11-01" })),
  ], { ...ctx, lastmod: () => "2026-11-18" });
  assert.deepEqual(dated, [], dated.join(" | "));
  const stale = learn.validateLearnFiles([
    source("concepts/a-write-surface.md", goodFields({ updated: "2026-11-20" })),
  ], { ...ctx, lastmod: () => "2026-11-01" });
  assert.ok(stale.some((e: string) => /updated/.test(e)), stale.join(" | "));

  const faq = source("concepts/a-write-surface.md", goodFields({
    faq: [{ q: "What changes?", a: "A comment, a signup, or a login." }, { q: "What stays open?", a: "Reads stay free." }, { q: "Where next?", a: "Open the docs." }],
  }));
  assert.deepEqual(learn.validateLearnFiles([faq], ctx), []);

  const gaps = learn.listingGaps(
    [{ file: SEED_INDEX, path: "/learn", markdown: "# Learn\n" }],
    { files: ["index"], sitemap: `<loc>${SITE}/</loc>`, llms: "no learn path", full: "# Home\n", base: SITE },
  );
  assert.ok(gaps.some((e: string) => /discovery/.test(e)), gaps.join(" | "));
  assert.ok(gaps.some((e: string) => /sitemap/.test(e)), gaps.join(" | "));
  assert.ok(gaps.some((e: string) => /llms\.txt/.test(e)), gaps.join(" | "));
  assert.ok(gaps.some((e: string) => /llms-full/.test(e)), gaps.join(" | "));

  const covered = learn.listingGaps(
    [{ file: SEED_PAGE, path: "/learn/concepts/what-is-a-write-surface", markdown: "# Learn\n" }],
    { files: [SEED_PAGE], sitemap: `<loc>${SITE}/learn/concepts/what-is-a-write-surface</loc>`, llms: "hubs only", learn: `${SITE}/learn/concepts/what-is-a-write-surface\n`, full: "# Learn\n", base: SITE },
  );
  assert.deepEqual(covered, [], covered.join(" | "));
  const dropped = learn.listingGaps(
    [{ file: SEED_PAGE, path: "/learn/concepts/what-is-a-write-surface", markdown: "# Learn\n" }],
    { files: [SEED_PAGE], sitemap: `<loc>${SITE}/learn/concepts/what-is-a-write-surface</loc>`, llms: "hubs only", learn: "# Attackfee\n", full: "# Learn\n", base: SITE },
  );
  assert.ok(dropped.some((e: string) => /llms-learn\.txt/.test(e)), dropped.join(" | "));
});

test("renderer: one h1, crumbs, related links, JSON-LD, and twin parity", async () => {
  const learn = await learnMod();
  const parsed = learn.parseLearnFile("concepts/a-write-surface.md", source("concepts/a-write-surface.md", goodFields()).text);
  assert.deepEqual(parsed.errors, []);
  const labels = { "/": "Attackfee", "/learn": "Learn", "/docs": "Docs", "/docs/quick-start": "Quick start", "/demo": "Demo" };
  const plain = learn.renderLearnPage(parsed.page, { base: SITE, lastmod: "2026-11-20", labels, hubPages: [] });
  assert.equal([...plain.html.matchAll(/<h1>/g)].length, 1);
  assert.match(plain.html, /<title>A write surface · Attackfee Learning Center<\/title>/);
  assert.match(plain.html, /<span>Concepts<\/span>/);
  assert.equal(plain.html.includes('href="/learn/concepts"'), false);
  assert.match(plain.html, /href="\/docs\/quick-start"/);
  assert.match(plain.html, /href="\/demo"/);
  assert.match(plain.html, /href="\/learn"/);
  const scripts = [...plain.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const doc = JSON.parse(scripts[0][1]);
  const web = doc["@graph"].find((n: { "@type": string }) => n["@type"] === "WebPage");
  const crumbs = doc["@graph"].find((n: { "@type": string }) => n["@type"] === "BreadcrumbList");
  assert.equal(web.inLanguage, "en");
  assert.equal(web.url, SITE + "/learn/concepts/a-write-surface");
  assert.equal(web.dateModified, "2026-11-20");
  assert.equal(web.isPartOf.name, "Attackfee");
  assert.equal(web.isPartOf.url, SITE + "/");
  assert.deepEqual(crumbs.itemListElement.map((i: { name: string }) => i.name), ["Attackfee", "Learn", "Concepts", "A write surface"]);
  assert.equal("item" in crumbs.itemListElement[2], false);
  assert.equal(doc["@graph"].some((n: { "@type": string }) => n["@type"] === "Organization" || n["@type"] === "SoftwareApplication"), false);
  assert.equal(JSON.stringify(doc).includes('"offers"'), false);
  assert.equal(JSON.stringify(doc).includes("aggregateRating"), false);
  const md = squash(markdownPlain(plain.markdown));
  for (const block of mainBlocks(plain.html)) assert.ok(md.includes(squash(block)), block);
  assert.equal(plain.markdown.startsWith("# A write surface\n"), true);
  assert.doesNotMatch(plain.html, /href="[^"]*\.html/);

  const linked = learn.renderLearnPage(parsed.page, { base: SITE, lastmod: "", labels, hubPages: ["concepts"] });
  assert.match(linked.html, /href="\/learn\/concepts"/);
  const linkedDoc = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(linked.html)![1]);
  const linkedWeb = linkedDoc["@graph"].find((n: { "@type": string }) => n["@type"] === "WebPage");
  assert.equal("dateModified" in linkedWeb, false);
  const hubCrumb = linkedDoc["@graph"].find((n: { "@type": string }) => n["@type"] === "BreadcrumbList").itemListElement[2];
  assert.equal(hubCrumb.item, SITE + "/learn/concepts");

  const article = learn.renderLearnPage({ ...parsed.page, schema: "TechArticle" }, { base: SITE, lastmod: "2026-11-20", labels, hubPages: [] });
  const articleDoc = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(article.html)![1]);
  assert.equal(articleDoc["@graph"].some((n: { "@type": string }) => n["@type"] === "TechArticle"), true);
  const noDate = learn.renderLearnPage({ ...parsed.page, schema: "TechArticle" }, { base: SITE, lastmod: "", labels, hubPages: [] });
  const noDateDoc = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(noDate.html)![1]);
  assert.equal(noDateDoc["@graph"].some((n: { "@type": string }) => n["@type"] === "TechArticle"), false);

  const bare = learn.renderLearnPage(parsed.page, { base: null, lastmod: "", labels, hubPages: [] });
  assert.doesNotMatch(bare.html, /application\/ld\+json|rel="canonical"|https?:/);
});

test("checker fails on a missing field, a broken link, a duplicate slug, and a lint hit", () => {
  const run = (dir: string) => spawnSync(process.execPath, [ROOT + "website/learn.mjs", "--check", "--dir", dir], { encoding: "utf8" });
  const write = (name: string, files: { rel: string; text: string }[]) => {
    const dir = tmp();
    for (const f of files) {
      const path = dir + f.rel;
      mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
      writeFileSync(path, f.text);
    }
    const r = run(dir);
    rmSync(dir, { recursive: true, force: true });
    assert.notEqual(r.status, 0, name);
    assert.match(r.stderr + r.stdout, /^learn:/m, name + "\n" + r.stderr + r.stdout);
    return r.stderr + r.stdout;
  };
  assert.match(write("missing", [source("concepts/a-write-surface.md", (() => { const f = goodFields(); delete (f as { title?: string }).title; return f; })())]), /title/);
  assert.match(write("link", [source("concepts/a-write-surface.md", goodFields({ related: ["/docs", "/docs/quick-start", "/missing-page"] }))]), /missing-page/);
  assert.match(write("dup", [
    source("concepts/a-write-surface.md", goodFields()),
    source("concepts/other.md", goodFields({ slug: "a-write-surface" })),
  ]), /duplicate slug/);
  assert.match(write("lint", [source("concepts/a-write-surface.md", goodFields(), "# A write surface\n\nPay with bitcoin today.\n")]), /bitcoin/);
});

test("the two seeds are built, listed, and paired with twins", () => {
  const dir = build(tmp(), SITE, () => {});
  assert.ok(existsSync(ROOT + "website/learn/index.md"));
  assert.ok(existsSync(ROOT + "website/learn/concepts/what-is-a-write-surface.md"));
  assert.ok(discoveryFiles().includes(SEED_INDEX));
  assert.ok(discoveryFiles().includes(SEED_PAGE));

  const sm = readFileSync(dir + "sitemap.xml", "utf8");
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.includes(SITE + "/learn"));
  assert.ok(locs.includes(SITE + "/learn/concepts/what-is-a-write-surface"));
  assert.equal(locs.some((u) => u.endsWith(".md")), false);
  const hubs = ["concepts", "write-surfaces", "agents", "payments", "wordpress", "comparisons", "limits"];
  for (const hub of hubs) {
    assert.equal(existsSync(ROOT + "website/learn/" + hub + "/index.md"), true, hub);
    assert.equal(discoveryFiles().includes("learn/" + hub + "/index"), true, hub);
    assert.equal(locs.includes(SITE + "/learn/" + hub), true, hub);
  }
  for (const file of discoveryFiles().filter((f: string) => f.startsWith("learn/"))) {
    const loc = `${SITE}${pagePath(file)}`;
    assert.ok(sm.includes(`<loc>${loc}</loc>`), file);
    const row = new RegExp(`<loc>${loc}</loc><lastmod>(\\d{4}-\\d{2}-\\d{2})</lastmod>`).exec(sm);
    const gitDate = sourceLastmod(file);
    if (gitDate) assert.equal(row?.[1], gitDate, file);
    else assert.equal(row, null, file + " has no commit yet");
  }

  const llms = readFileSync(dir + "llms.txt", "utf8");
  const docsAt = llms.indexOf("\n## Docs\n");
  const learnAt = llms.indexOf("\n## Learning Center\n");
  const alsoAt = llms.indexOf("\n## Also on this site\n");
  assert.ok(docsAt >= 0 && learnAt > docsAt && alsoAt > learnAt);
  assert.ok(llms.includes(`](${SITE}/learn): ${INDEX_DESC}`));
  assert.ok(llms.includes(`](${SITE}/llms-learn.txt):`));
  assert.equal(llms.includes(`${SITE}/learn/concepts/what-is-a-write-surface`), false);
  const full = readFileSync(dir + "llms-full.txt", "utf8");
  for (const file of [SEED_INDEX, SEED_PAGE]) {
    const html = readFileSync(dir + file + ".html", "utf8");
    const md = readFileSync(dir + twinPath(file).slice(1), "utf8");
    assert.equal([...html.matchAll(/<h1>/g)].length, 1, file);
    assert.equal([...html.matchAll(/rel="alternate" type="text\/markdown"/g)].length, 1, file);
    assert.match(html, new RegExp(`<link rel="alternate" type="text/markdown" href="${twinPath(file)}">`), file);
    assert.match(html, / · Attackfee Learning Center</);
    assert.match(html, /<nav class="crumbs"/, file);
    assert.match(html, /<nav class="related"/, file);
    assert.match(md, /## Related\n/);
    const plain = squash(markdownPlain(md));
    for (const block of mainBlocks(html)) assert.ok(plain.includes(squash(block)), file + ": " + block);
    assert.ok(full.includes(md), file);
    assert.doesNotMatch(html, /href="[^"]*\.html/);
    assert.deepEqual(lintText("website/dist/" + file + ".html", html), [], file);
    assert.doesNotMatch(html, OLD_BRAND, file);
    assert.doesNotMatch(md, OLD_BRAND, file);
    const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1];
    const doc = JSON.parse(body);
    assert.equal([...html.matchAll(/<script/g)].length, 1, file);
    assert.ok(doc["@graph"].some((n: { "@type": string }) => n["@type"] === "WebPage"));
    assert.ok(doc["@graph"].some((n: { "@type": string }) => n["@type"] === "BreadcrumbList"));
    assert.equal(JSON.stringify(doc).includes('"offers"'), false);
    assert.equal(JSON.stringify(doc).includes("aggregateRating"), false);
  }

  const index = readFileSync(dir + "learn/index.html", "utf8");
  const article = readFileSync(dir + SEED_PAGE + ".html", "utf8");
  assert.match(index, new RegExp(`<meta name="description" content="${INDEX_DESC}">`));
  assert.match(article, new RegExp(`<meta name="description" content="${PAGE_DESC}">`));
  for (const hub of ["/learn/concepts", "/learn/write-surfaces", "/learn/agents", "/learn/payments", "/learn/wordpress", "/learn/comparisons", "/learn/limits"]) {
    assert.equal(index.includes(`href="${hub}"`), true, hub);
  }
  for (const name of ["Concepts", "Write surfaces", "Agents", "Payments", "WordPress", "Comparisons", "Privacy and limits"]) {
    assert.match(index, new RegExp(name));
  }
  assert.match(index, /href="\/learn\/concepts\/what-is-a-write-surface"/);
  assert.match(index, /href="\/docs"/);
  assert.match(article, /href="\/learn"/);
  assert.match(article, /href="\/docs\/quick-start"/);
  assert.match(article, /href="\/demo"/);
  assert.match(article, /<a href="\/learn\/concepts"/);
  assert.match(article, /20 actions for 15 minutes/);
  assert.match(article, /403/);
  assert.match(article, /402/);
  const catalog = readFileSync(dir + "llms-learn.txt", "utf8");
  assert.match(catalog, /^# Attackfee\n\n> /);
  assert.ok(catalog.includes(`> ${INDEX_DESC}`));
  assert.ok(catalog.includes(`](${SITE}/learn.md): ${INDEX_DESC}`));
  assert.ok(catalog.includes(`](${SITE}/learn): ${INDEX_DESC}`));
  assert.ok(catalog.includes(`](${SITE}/learn/concepts/what-is-a-write-surface.md): ${PAGE_DESC}`));
  assert.ok(catalog.includes(`](${SITE}/learn/concepts/what-is-a-write-surface): ${PAGE_DESC}`));
  assert.equal(sm.includes("llms-learn"), false);
});

test("llms.txt names every hub and the catalog under 16384 bytes; llms-learn.txt lists every learn page", () => {
  const dir = build(tmp(), SITE, () => {});
  const llms = readFileSync(dir + "llms.txt", "utf8");
  const catalog = readFileSync(dir + "llms-learn.txt", "utf8");
  const full = readFileSync(dir + "llms-full.txt", "utf8");
  const sm = readFileSync(dir + "sitemap.xml", "utf8");
  assert.equal(LLMS_BYTE_CAP, 16384);
  assert.ok(Buffer.byteLength(llms) <= 16384, "llms.txt is " + Buffer.byteLength(llms) + " bytes");
  assert.ok(llms.includes(`](${SITE}/llms-learn.txt): ${LEARN_CATALOG_LINE}`));
  assert.match(catalog, /^# Attackfee\n\n> /);
  const pages = loadLearnPages();
  const landing = pages.find((p) => p.path === "/learn");
  assert.ok(landing);
  assert.ok(catalog.startsWith(`# Attackfee\n\n> ${landing.description}\n`));
  let headingAt = catalog.indexOf("\n## Learning Center\n");
  assert.ok(headingAt > 0);
  for (const [id, label] of LEARN_HUBS) {
    const hub = pages.find((p) => p.path === "/learn/" + id);
    assert.ok(hub, id);
    assert.ok(namesPath(llms, "/learn/" + id), id);
    assert.ok(llms.includes(`](${SITE}/learn/${id}): ${hub.description}`), id);
    const at = catalog.indexOf(`\n## ${label}\n`);
    assert.ok(at > headingAt, label);
    headingAt = at;
  }
  const learnFiles = discoveryFiles().filter((f: string) => f.startsWith("learn/"));
  const learnLocs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname).filter((p) => p === "/learn" || p.startsWith("/learn/"));
  assert.deepEqual(learnLocs.sort(), learnFiles.map((f: string) => pagePath(f)).sort());
  let twinAt = -1;
  for (const page of pages) {
    assert.ok(learnLocs.includes(page.path), page.path);
    assert.ok(namesPath(catalog, page.path), page.path + " missing from llms-learn.txt");
    assert.ok(namesPath(llms, page.path) || namesPath(catalog, page.path), page.path + " missing from the agent-readable index");
    const mdLink = catalog.indexOf(`](${SITE}${twinPath(page.file)}): ${page.description}`);
    assert.ok(mdLink > twinAt, page.file);
    twinAt = mdLink;
    assert.ok(catalog.includes(`](${SITE}${page.path}): ${page.description}`), page.path);
    assert.ok(full.includes(readFileSync(dir + twinPath(page.file).slice(1), "utf8")), page.file);
  }
  assert.equal(sm.includes("llms-learn"), false);
  assert.equal(llms.slice(llms.indexOf("\n## Markdown\n")).includes("/learn"), false);
  assert.equal(existsSync(build(tmp(), "", () => {}) + "llms-learn.txt"), false);
  assert.deepEqual(lintText("website/dist/llms.txt", llms), [], "llms.txt");
  assert.deepEqual(lintText("website/dist/llms-learn.txt", catalog), [], "llms-learn.txt");
});

test("real tree check exits 0", () => {
  const r = spawnSync(process.execPath, [ROOT + "website/learn.mjs", "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /^learn: ok\n/);
});

test("csp helper hashes one learn script and leaves other responses alone", async () => {
  const { learnPageCsp } = await import("../packages/edge-cf/src/agent-view.ts");
  const body = '{"@context":"https://schema.org","@type":"WebPage","name":"Learn"}';
  const html = `<!doctype html><script type="application/ld+json">${body}</script>`;
  const hash = createHash("sha256").update(body).digest("base64");
  const csp = learnPageCsp("/learn/concepts/what-is-a-write-surface", 200, "text/html; charset=utf-8", html);
  assert.equal(csp, `default-src 'none'; script-src 'sha256-${hash}'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
  assert.match(csp, /default-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.equal(learnPageCsp("/docs", 200, "text/html", html), null);
  assert.equal(learnPageCsp("/learning", 200, "text/html", html), null);
  assert.equal(learnPageCsp("/learn", 404, "text/html", html), null);
  assert.equal(learnPageCsp("/learn", 200, "text/markdown; charset=utf-8", html), null);
  assert.equal(learnPageCsp("/learn", 200, "text/html", html + html), null);

  const files: Record<string, [string, string, string]> = {
    "/learn": ["text/html; charset=utf-8", html, "old-policy"],
    "/docs": ["text/html; charset=utf-8", html, "docs-policy"],
  };
  const assets = {
    async fetch(req: Request) {
      const path = new URL(req.url).pathname;
      const hit = files[path];
      if (!hit) return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
      return new Response(hit[1], { status: 200, headers: { "content-type": hit[0], "content-security-policy": hit[2], "cache-control": "public, max-age=3600" } });
    },
  };
  const learnRes = await serveSite(new Request("https://site.example/learn"), assets);
  assert.equal(learnRes.headers.get("content-security-policy"), csp);
  assert.equal(learnRes.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(await learnRes.text(), html);
  const docs = await serveSite(new Request("https://site.example/docs"), assets);
  assert.equal(docs.headers.get("content-security-policy"), "docs-policy");
  assert.equal(await docs.text(), html);
});

test("batch checker accepts the two seeds from a built tree", async () => {
  const dir = build(tmp(), SITE, () => {});
  const seen: { method: string; ua: string | undefined }[] = [];
  const types: Record<string, string> = { html: "text/html; charset=utf-8", md: "text/markdown; charset=utf-8", css: "text/css", txt: "text/plain; charset=utf-8", xml: "application/xml", svg: "image/svg+xml", png: "image/png", ico: "image/x-icon", woff2: "font/woff2", js: "text/javascript" };
  const server: Server = createServer((req, res) => {
    seen.push({ method: req.method ?? "", ua: req.headers["user-agent"] });
    let path = (req.url ?? "/").split("?")[0];
    if (path.endsWith("/") && path.length > 1) path = path.slice(0, -1);
    let rel = path === "/" ? "index.html" : decodeURIComponent(path.slice(1));
    if (!rel.includes(".")) {
      rel = existsSync(dir + rel + "/index.html") ? rel + "/index.html" : rel + ".html";
    }
    if (rel.includes("..") || !existsSync(dir + rel)) { res.writeHead(404).end("missing"); return; }
    const ext = rel.split(".").pop()!;
    res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" }).end(readFileSync(dir + rel));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const r = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = spawn(process.execPath, [ROOT + "scripts/check-learn-batch.mjs", "--base", base, "--batch", ROOT + "website/learn", "--paths", "/learn,/learn/concepts/what-is-a-write-surface"]);
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (b) => { stdout += b; });
      child.stderr.on("data", (b) => { stderr += b; });
      child.on("exit", (status) => resolve({ status, stdout, stderr }));
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(seen.length > 0);
    assert.ok(seen.every((s) => s.method === "GET"), seen.map((s) => s.method).join(","));
    assert.ok(seen.every((s) => s.ua === "attackfee-learn-check/1.0"));
  } finally {
    server.close();
  }
});
