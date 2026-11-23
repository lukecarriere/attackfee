// The phone-width check has to list every page the build emits.
// tests/fixtures/history/demo-without-viewport has the demo page and no viewport test.
// tests/fixtures/history/viewport-paths.test.ts.txt listed docs and left the legal pages out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
// @ts-ignore plain JS build script
import { PAGES, DOC_PAGES, LEGAL_PAGES, pagePath } from "../website/build.mjs";
import { learnSourceFiles } from "../website/learn.mjs";

const required = [
  "/",
  "/demo",
  ...PAGES.map((p: { file: string }) => pagePath(p.file)),
  ...DOC_PAGES.map((p: { file: string }) => pagePath(p.file)),
  ...LEGAL_PAGES.map((p: { file: string }) => pagePath(p.file)),
  ...learnSourceFiles().map((f: string) => pagePath(f)),
];

function uncovered(src: string) {
  const covered = new Set<string>();
  if (src.includes('"/demo"')) covered.add("/demo");
  if (src.includes('"/"')) covered.add("/");
  if (/(?<![A-Za-z_])PAGES\.map/.test(src)) for (const p of PAGES) covered.add(pagePath(p.file));
  if (/(?<![A-Za-z_])DOC_PAGES\.map/.test(src)) for (const p of DOC_PAGES) covered.add(pagePath(p.file));
  if (/(?<![A-Za-z_])LEGAL_PAGES\.map/.test(src)) for (const p of LEGAL_PAGES) covered.add(pagePath(p.file));
  if (/learnSourceFiles\(\)\.map/.test(src)) for (const f of learnSourceFiles()) covered.add(pagePath(f));
  for (const m of src.matchAll(/"(\/[^"]*)"/g)) covered.add(m[1]);
  return required.filter((p) => !covered.has(p));
}

test("current viewport test covers every built public page", () => {
  const src = readFileSync("tests/viewport.test.ts", "utf8");
  assert.deepEqual(uncovered(src), []);
});

test("before the viewport test, the demo page existed and an empty list left it uncovered", () => {
  const dir = new URL("./fixtures/history/demo-without-viewport/", import.meta.url);
  assert.equal(existsSync(new URL("viewport.test.ts", dir)), false);
  assert.equal(existsSync(new URL("demo.html", dir)), true);
  assert.ok(uncovered("").includes("/demo"));
});

test("an older viewport PATHS list omitted the legal pages that the build emitted", () => {
  const src = readFileSync(new URL("./fixtures/history/viewport-paths.test.ts.txt", import.meta.url), "utf8");
  const build = readFileSync(new URL("./fixtures/history/legal-pages-build.mjs.txt", import.meta.url), "utf8");
  assert.match(build, /file: "mission"/);
  assert.match(build, /file: "privacy"/);
  const gaps = uncovered(src);
  assert.ok(gaps.includes("/privacy"), gaps.join(","));
  assert.ok(gaps.includes("/terms") && gaps.includes("/support"));
});
