// Repository metadata and public wording for an open-source release.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url).pathname;
const read = (p: string) => readFileSync(ROOT + p, "utf8");

test("the README credits the MIT work engine, and the copy lint allows its name", async () => {
  const readme = read("README.md");
  assert.match(readme, /\[ALTCHA\]\(https:\/\/github\.com\/altcha-org\)/);
  assert.match(readme, /ALTCHA[^\n]*MIT/);
  // @ts-ignore plain JS helper
  const { vendorList } = await import("../scripts/copy-lib.mjs");
  const { any } = vendorList();
  assert.equal(any.includes("ALTCHA"), false);
  assert.equal(any.includes("altcha-lib"), false);
  assert.ok(any.includes("ALTCHA Sentinel") && any.includes("ALTCHA Cloud"), "hosted products stay off public pages");
});

test("the WordPress README and the per-visit line are accurate", () => {
  const wp = read("packages/wp-attackfee/README.md");
  assert.equal(wp.includes("not published anywhere"), false);
  assert.match(wp, /https:\/\/attackfee\.dev\/download/);
  for (const f of ["README.md", "website/build.mjs"]) assert.doesNotMatch(read(f), /pays (about )?once per visit/, f);
});
