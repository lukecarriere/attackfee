// A real way to report a vulnerability: SECURITY.md, the support page and /.well-known/security.txt (RFC 9116).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../website/build.mjs";
import { isSiteAsset } from "../packages/edge-cf/src/host-redirect.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const ADVISORY = "https://github.com/lukecarriere/attackfee/security/advisories/new";

function built(): { dir: string; txt: string; sitemap: string } {
  const dir = mkdtempSync(join(tmpdir(), "security-txt-")) + "/";
  build(dir, "https://attackfee.dev", () => {});
  const txt = existsSync(dir + ".well-known/security.txt") ? readFileSync(dir + ".well-known/security.txt", "utf8") : "";
  const sitemap = existsSync(dir + "sitemap.xml") ? readFileSync(dir + "sitemap.xml", "utf8") : "";
  return { dir, txt, sitemap };
}

test("security.txt is served with Contact, Expires and Canonical", () => {
  const { dir, txt, sitemap } = built();
  try {
    const keys = txt.trim().split("\n").map((l) => l.split(":")[0]);
    assert.deepEqual(keys, ["Contact", "Expires", "Preferred-Languages", "Canonical", "Policy"]);
    assert.match(txt, new RegExp("^Contact: " + ADVISORY.replace(/[.\/]/g, "\\$&") + "$", "m"));
    assert.match(txt, /^Preferred-Languages: en$/m);
    assert.match(txt, /^Canonical: https:\/\/attackfee\.dev\/\.well-known\/security\.txt$/m);
    assert.match(txt, /^Policy: https:\/\/github\.com\/lukecarriere\/attackfee\/blob\/main\/SECURITY\.md$/m);
    assert.equal(sitemap.includes("security.txt"), false, "not in the sitemap");
    assert.equal(isSiteAsset("/.well-known/security.txt"), true, "served by the asset binding, not the gate");
    assert.equal(isSiteAsset("/.well-known/attackfee.json"), false, "the manifest stays on the worker");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("security.txt Expires is at least 30 days away", () => {
  const { dir, txt } = built();
  try {
    const m = txt.match(/^Expires: (\S+)$/m);
    assert.ok(m, "Expires line");
    const left = Date.parse(m[1]) - Date.now();
    assert.ok(left >= 30 * 86400e3, "Expires is under 30 days away: renew the date in website/build.mjs");
    assert.ok(left < 365 * 86400e3, "RFC 9116: Expires must be less than a year away");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SECURITY.md and the support page name the private reporting channel", () => {
  const s = readFileSync(ROOT + "SECURITY.md", "utf8");
  assert.ok(s.includes("Report it privately through GitHub: " + ADVISORY));
  assert.ok(s.includes("## Scope") && s.includes("## Supported versions"));
  const support = readFileSync(ROOT + "website/support.md", "utf8");
  // Site pages carry no absolute URLs (tests/website.test.ts), so the address is shown as code, like the issues line above it.
  assert.ok(support.includes("Report it privately on GitHub: `github.com/lukecarriere/attackfee/security/advisories/new`. The policy is in SECURITY.md."));
});
