// Attackfee brand assets (Nov 17, 2026). The fonts are IBM's own unmodified IBM Plex Latin1 woff2 subsets
// (@ibm/plex-sans and @ibm/plex-mono 1.1.0) with their SIL OFL 1.1 text; Plex is a Reserved Font Name, so the
// files must stay byte-for-byte as IBM ships them. The icons, the hero and the social card come from
// scripts/brand/render-art.mjs and are pinned here so a change to any of them is deliberate.
// The release build sets ATTACKFEE_SITE_URL from docs/copy.md "## Naming" at run time, so this file never names the
// domain (tests/no-hardcoded-domains.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
// @ts-ignore plain JS build script
import { build, DOC_PAGES, LEGAL_PAGES, HOME_ASSETS, ICON_FILES, pluginRelease, discoveryFiles } from "../website/build.mjs";
import { learnSourceFiles } from "../website/learn.mjs";
import { twinPath } from "../website/agent-text.mjs";
import { siteCssKeepsHidden } from "../scripts/hidden-attr.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** The brand files as approved (Attackfee brand, Nov 17, 2026). */
const BRAND: Record<string, string> = {
  "apple-touch-icon.png": "a296acfa6802aedd559b422b5660607d53c815c8cabb61c4f2ac1d3071c96119",
  "favicon.ico": "37168e91e1a42c6a2e738bc2ba73a1c57aa58dff8c92e32018b05f2656c05b12",
  "favicon.svg": "a9cb360ef9d99154f345a9c925efeb344aa20abecd669a2d9fb632a0f0272b81",
  "fonts/plex/IBMPlexMono-Regular-Latin1.woff2": "e8993d946649b9d01abb1ed06d574b19d8ea3e66b5c3948602db335c44c18e56",
  "fonts/plex/IBMPlexSans-Bold-Latin1.woff2": "914f1400f363e636b6f9cc7965aa807ff01e93586e1437617525cba0a62aa78d",
  "fonts/plex/IBMPlexSans-Regular-Latin1.woff2": "b5ad7bd39f996144915f0ad9849a90183b27d8c28ad97ed98af5b1bebc51f6b1",
  "fonts/plex/IBMPlexSans-SemiBold-Latin1.woff2": "fff0ab3a88b0b4aa0b693e4f0201359a15183b08e3fa5696d1918d8f0ade8ad5",
  "fonts/plex/LICENSE.txt": "7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da",
  "img/hail-grid.svg": "10295b44ad7ddd201ddfe0f082798d9f117000dcbbb5fde304806d89c2607a82",
  "img/social-card.png": "e4cc55d75a85109ebf5a5d0a0aaedffccc1ac90eb0c3b0406f254b063b07b98b",
};
const REL = pluginRelease();

/** The working domain from docs/copy.md "## Naming", `Domain: \`...\`` (the one place it is recorded). */
function workingDomain() {
  const md = readFileSync(ROOT + "docs/copy.md", "utf8");
  const naming = md.slice(md.indexOf("\n## Naming"), md.indexOf("\n## ", md.indexOf("\n## Naming") + 1));
  const m = /Domain: `([^`]+)`/.exec(naming);
  assert.ok(m, 'docs/copy.md "## Naming" records the domain');
  return m[1];
}

function walk(dir: string, at = dir): string[] {
  return readdirSync(at).flatMap((f) => statSync(join(at, f)).isDirectory() ? walk(dir, join(at, f)) : [relative(dir, join(at, f))]).sort();
}

/** A release build, as QA builds it: ATTACKFEE_SITE_URL is https:// plus the working domain. */
const OUT = build(mkdtempSync(join(tmpdir(), "attackfee-inner-style-")) + "/", "https://" + workingDomain());

test("brand pin: the sources and the release build carry the approved brand files byte for byte", () => {
  for (const [f, want] of Object.entries(BRAND)) {
    assert.equal(sha256(readFileSync(ROOT + "website/" + f)), want, "website/" + f);
    assert.equal(sha256(readFileSync(OUT + f)), want, "dist " + f);
  }
  assert.match(readFileSync(OUT + "fonts/plex/LICENSE.txt", "utf8"), /SIL OPEN FONT LICENSE Version 1\.1/);
});

test("release build: exactly the brand files, the pages, the guides and the demo; nothing from the previous design", () => {
  const files = walk(OUT);
  const pages = ["404.html", "index.html", "demo.html", "demo.css", "demo.js", "home.css", "site.css", "docs.css", "learn.css", "_headers", "robots.txt", "llms.txt", "sitemap.xml", ".well-known/security.txt", ...DOC_PAGES.map((p: { file: string }) => p.file + ".html"), ...LEGAL_PAGES.map((p: { file: string }) => p.file + ".html"), ...learnSourceFiles().map((f: string) => f + ".html")];
  // The pages' Markdown twins and llms-full.txt (website/agent-text.mjs).
  pages.push(...discoveryFiles().map((f: string) => twinPath(f).slice(1)), "llms-full.txt", "llms-learn.txt");
  if (existsSync(OUT + "download/" + REL.zip)) pages.push("download/" + REL.zip, "download/" + REL.shaName);
  assert.deepEqual(files, [...new Set([...Object.keys(BRAND), ...pages])].sort());
  for (const f of [...HOME_ASSETS, ...ICON_FILES]) assert.ok(files.includes(f), f);
  assert.ok(!files.some((f) => /arvo|public-sans|forest|mission|vision|values|ecosystem/i.test(f)), "no file from the previous design ships");
  const headers = readFileSync(OUT + "_headers", "utf8");
  assert.match(headers, /default-src 'none'; script-src 'sha256-[A-Za-z0-9+/]+=*'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'/, "the site CSP stays strict and allows the JSON-LD by hash");
  assert.doesNotMatch(headers, /unsafe-inline/);
});

test("site.css: self-contained, Plex only, keeps the hidden rule, on the brand palette", () => {
  const src = readFileSync(ROOT + "website/site.css");
  assert.deepEqual(readFileSync(OUT + "site.css"), src, "the build copies it unchanged");
  const css = src.toString("utf8");
  assert.doesNotMatch(css, /@import|https?:|\/\/[a-z0-9]/i);
  const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(urls, ["/fonts/plex/IBMPlexSans-Regular-Latin1.woff2", "/fonts/plex/IBMPlexSans-SemiBold-Latin1.woff2", "/fonts/plex/IBMPlexSans-Bold-Latin1.woff2", "/fonts/plex/IBMPlexMono-Regular-Latin1.woff2"]);
  for (const u of urls) assert.ok(existsSync(ROOT + "website" + u), u + " is in website/fonts/plex/");
  assert.ok(siteCssKeepsHidden(css), "[hidden] wins over author display rules");
  for (const t of ["--af-ink:#0F1216", "--af-signal:#FF4F1F", "--af-paper:#F5F6F4"]) assert.ok(css.replace(/\s/g, "").includes(t), t);
  assert.match(css, /\bh1\{font:700 48px\/1\.05 "Attackfee Sans"/);
  assert.match(css, /\bh1:before\{content:"";[^}]*background:var\(--af-signal\)/);
});
