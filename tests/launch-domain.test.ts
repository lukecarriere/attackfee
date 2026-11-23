// Launch-prep: wrangler config, the site canonical root, and live-check defaults
// use https://attackfee.dev. example.invalid is gone from those places.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

test("wrangler.toml: worker attackfee-site, apex custom domain attackfee.dev only, ATTACKFEE_SITE_URL, no example.invalid, payments-on", () => {
  const toml = read("wrangler.toml");
  assert.equal(/example\.invalid/.test(toml), false, "wrangler.toml still names example.invalid");
  assert.equal(/attackfee-site-changeme/.test(toml), false, "wrangler.toml still uses the placeholder worker name");
  assert.match(toml, /^name = "attackfee-site"$/m);
  const patterns = [...toml.matchAll(/\{ pattern = "([^"]+)", custom_domain = true \}/g)].map((m) => m[1]);
  assert.deepEqual(patterns, ["attackfee.dev"]);
  assert.equal([...toml.matchAll(/pattern\s*=/g)].length, 1);
  assert.ok(!patterns.some((p) => p.startsWith("www.") || p.endsWith(".com")), "www and attackfee.com must not be Worker custom domains");
  assert.match(toml, /^ATTACKFEE_SITE_URL = "https:\/\/attackfee\.dev"$/m);
  assert.match(toml, /^CASHU_MINTS = '\["https:\/\/mint\.minibits\.cash\/Bitcoin"\]'$/m);
  assert.match(toml, /^L402_ENABLED = "1"$/m);
  assert.equal(/^\s*NWC(_URL)?\s*=/m.test(toml), false, "production must not set NWC");
  assert.equal(/SITE_SECRET\s*=/.test(toml), false, "SITE_SECRET must not be committed");
});

test("live-check and deploy script defaults use https://attackfee.dev, not example.invalid", () => {
  const files = [
    "scripts/check-www-redirect.sh",
    "scripts/check-live-pages.sh",
    "scripts/check-open-intelligence.sh",
    "scripts/check-live-state.sh",
    "scripts/live-checks.mjs",
    "scripts/release-check.sh",
    "scripts/deploy.sh",
  ];
  for (const f of files) {
    const src = read(f);
    assert.equal(src.includes("https://attackfee.dev"), true, f + " default origin should be https://attackfee.dev");
    assert.equal(src.includes("example.invalid"), false, f + " still names example.invalid");
  }
  const deploy = read("scripts/deploy.sh");
  assert.deepEqual([...deploy.matchAll(/WORKER="([^"]+)"/g)].map((m) => m[1]), ["attackfee-site"]);
  assert.equal(deploy.includes("attackfee-site-changeme"), false);
  assert.equal(deploy.includes("REFUSED: deploy is disabled in the attackfee copy"), false);
  assert.match(read("scripts/check-www-redirect.sh"), /^DEFAULT_APEX="https:\/\/attackfee\.dev"$/m);
  assert.match(read("scripts/check-live-pages.sh"), /^DEFAULT_BASE="https:\/\/attackfee\.dev"$/m);
});

test("website build and WordPress zip defaults take the canonical root from attackfee.dev, not example.invalid", () => {
  const build = read("website/build.mjs");
  assert.equal(build.includes("ATTACKFEE_SITE_URL"), true);
  const wp = read("scripts/build-wp-zip.mjs");
  assert.equal(wp.includes("https://attackfee.dev/terms"), true, "plugin zip terms URL");
  assert.equal(wp.includes("https://attackfee.dev/privacy"), true, "plugin zip privacy URL");
  assert.equal(wp.includes("example.invalid"), false, "plugin zip still names example.invalid");
  const copy = read("docs/copy.md");
  assert.equal(/Domain: `attackfee\.dev`/.test(copy), true);
});

test("production wrangler is payments-on by default: Minibits mint only, L402_ENABLED=1, no payout target", () => {
  const toml = read("wrangler.toml");
  assert.match(toml, /^CASHU_MINTS = '\["https:\/\/mint\.minibits\.cash\/Bitcoin"\]'$/m);
  assert.match(toml, /^L402_ENABLED = "1"$/m);
  const active = toml.split("\n").filter((line) => !/^\s*#/.test(line)).join("\n");
  assert.equal(/^\s*NWC(_URL)?\s*=/m.test(active), false, "production must not set NWC");
  assert.doesNotMatch(active, /LN_ADDRESS|WITHDRAW_|PAYOUT_/);
  assert.equal((toml.match(/^CASHU_MINTS\s*=/mg) || []).length, 1, "exactly one mint allowlist");
});
