// no active workflow can deploy or publish. wrangler.toml names the attackfee-site Worker and attackfee.dev apex.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIR = join(ROOT, ".github", "workflows");

test("active workflows are CI only: no deploy, publish, registry token or secrets", () => {
  const files = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));
  assert.deepEqual(files, ["ci.yml"]);
  for (const f of files) {
    const y = readFileSync(join(DIR, f), "utf8");
    assert.doesNotMatch(y, /wrangler\s+(deploy|publish|versions\s+upload)/);
    assert.doesNotMatch(y, /npm publish|publish-missing\.mjs|deploy\.sh|registry-url/);
    assert.doesNotMatch(y, /secrets\./);
  }
});

test("wrangler.toml attaches only the attackfee.dev apex", () => {
  const toml = readFileSync(join(ROOT, "wrangler.toml"), "utf8");
  assert.match(toml, /^name = "attackfee-site"$/m);
  assert.deepEqual([...toml.matchAll(/^name = "(.*site.*)"/gm)].map((m) => m[1]), ["attackfee-site"]);
  const patterns = [...toml.matchAll(/pattern = "([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(patterns, ["attackfee.dev"]);
  assert.match(toml, /^ATTACKFEE_SITE_URL = "https:\/\/attackfee\.dev"$/m);
  assert.doesNotMatch(toml, /example\.invalid/);
  const edge = readFileSync(join(ROOT, "packages", "edge-cf", "wrangler.toml"), "utf8");
  assert.match(edge, /id = "REPLACE_KV_ID"/);
});
