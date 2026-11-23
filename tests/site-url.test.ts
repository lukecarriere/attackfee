// ATTACKFEE_SITE_URL (packages/protocol/src/site-url.ts; WordPress: the ATTACKFEE_SITE_URL constant,
// attackfee_wp_site_url()). It fills only the manifest's `docs` field.
//   - unset (or empty): attackfee.json and agents.json from the Node issuer, the edge Worker and the
//     WordPress plugin are byte-identical to the discovery golden file (tests/fixtures/discovery-golden.json,
//     originally captured from 23108ec and later updated in place; see its `how` field);
//   - set to a placeholder: `docs` is exactly that value in all three, and every other byte is the same;
//   - invalid (http:, no host, garbage, ...): treated as unset in all three, and logged once (Node:
//     per process, edge: per isolate, WordPress: at most once an hour, through a transient).
// The WordPress side runs under PHP-CLI (tests/php/run-discovery.php), no WordPress install needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseSiteUrl, siteUrl, SITE_URL_PATTERN, SITE_URL_ENV } from "../packages/protocol/src/index.ts";
import { siteUrl as siteUrlSubpath } from "../packages/protocol/src/site-url.ts";
import { loadConfig } from "../packages/server-node/src/config.ts";
import { nodeDocs, edgeDocs, phpDocs, allDocsUnset } from "./discovery-docs.ts";
import { MANIFEST_DESCRIPTION } from "../packages/server-node/src/manifest.ts";

/** Historic manifest sentence from the 23108ec capture. Later top-level description changes are rewritten back so this file still locks every other byte. Tool copy and paid-redeem schema in the golden file follow the current discovery wording. */
const HISTORIC_DESCRIPTION = "A small check for writes. Heavy clients do work on each write, or pay in test mode. Page views stay free. Does not identify the caller.";
const as23108 = (body: string) => body.split(MANIFEST_DESCRIPTION).join(HISTORIC_DESCRIPTION);

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const GOLDEN = JSON.parse(readFileSync(ROOT + "/tests/fixtures/discovery-golden.json", "utf8"));
const SITE = "https://site.example";
const PHP = ROOT + "/tests/php/run-discovery.php";
const PLUGIN = ROOT + "/packages/wp-attackfee";

/** Valid inputs and what they become; every other entry must be refused. */
const ACCEPT: [unknown, string | null][] = [
  [undefined, null], [null, null], ["", null], ["  \t\n", null],
  [SITE, SITE], [SITE + "/", SITE], [SITE + "///", SITE], [" " + SITE + "/\n", SITE],
  [SITE + "/docs/", SITE + "/docs"], [SITE + ":8443", SITE + ":8443"], ["https://a.b-c.site.example/x_y~z/%20", "https://a.b-c.site.example/x_y~z/%20"],
  ["https://localhost", "https://localhost"], ["https://Site.Example", "https://Site.Example"], ["https://site.example:65535/", "https://site.example:65535"],
];
const REFUSE: unknown[] = [
  "http://site.example", "HTTPS://site.example", "https://", "https:///docs", "https:site.example", "//site.example", "site.example", "garbage", "ftp://site.example",
  "https://user@site.example", "https://user:pw@site.example", "https://site.example?x=1", "https://site.example/#top", "https://site.example/a b",
  "https://127.0.0.1", "https://[::1]", "https://1.2.3.4/x", "https://site.example:0", "https://site.example:65536", "https://site.example:", "https://-site.example",
  "https://site-.example", "https://site..example", "https://.site.example", "https://site." + "123", "https://site.example\\docs", "https://sité.example", "javascript:alert(1)", 5, true,
];

function phpParse(values: unknown[]): [string | null, string | null][] {
  const r = spawnSync("php", [PHP, "parse", PLUGIN], { input: JSON.stringify(values), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test("protocol siteUrl: accepts only an absolute https URL with a host name, strips trailing slashes, null when unset", () => {
  assert.equal(SITE_URL_ENV, "ATTACKFEE_SITE_URL");
  for (const [raw, want] of ACCEPT) assert.deepEqual(parseSiteUrl(raw), { url: want, error: null }, JSON.stringify(raw));
  for (const raw of REFUSE) {
    const r = parseSiteUrl(raw);
    assert.equal(r.url, null, JSON.stringify(raw));
    assert.equal(typeof r.error, "string", JSON.stringify(raw) + " is refused");
  }
  assert.equal(siteUrlSubpath, siteUrl, "the ./site-url subpath export is the same function");
});

test("protocol siteUrl: an invalid value is logged once (without the value) and treated as unset", () => {
  const seen: string[] = [];
  const warn = (m: string) => seen.push(m);
  const bad = "http://" + "once-only.site.example";
  assert.equal(siteUrl(bad, warn), null);
  assert.equal(siteUrl(bad, warn), null);
  assert.equal(siteUrl(SITE + "/", warn), SITE);
  assert.equal(siteUrl(undefined, warn), null);
  assert.equal(siteUrl("", warn), null);
  assert.equal(seen.length, 1, "one line for the invalid value, none for valid, unset or empty");
  assert.match(seen[0], /^\[attackfee\] ATTACKFEE_SITE_URL must be an absolute https:\/\/ URL/);
  assert.ok(!seen[0].includes("once-only"), "the value itself is not logged");
});

test("PHP attackfee_wp_parse_site_url: same pattern and same answers as the protocol helper", () => {
  const r = spawnSync("php", [PHP, "pattern", PLUGIN], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "#" + SITE_URL_PATTERN + "#D");
  const inputs = [...ACCEPT.map(([raw]) => raw).filter((v) => v !== undefined), ...REFUSE];
  const php = phpParse(inputs);
  inputs.forEach((raw, i) => {
    const js = parseSiteUrl(raw);
    assert.deepEqual(php[i], [js.url, js.error], JSON.stringify(raw));
  });
});

test("unset: attackfee.json and agents.json from Node, edge and WordPress are byte-identical to the discovery golden file", async () => {
  assert.equal(GOLDEN.base_commit, "23108ec24caed790332740013b4178a52b1acdcb");
  assert.deepEqual(Object.keys(GOLDEN.docs).sort(), ["edge work agents.json", "edge work attackfee.json", "node paid agents.json", "node paid attackfee.json", "node work agents.json", "node work attackfee.json", "wp paid agents.json", "wp paid attackfee.json", "wp work agents.json", "wp work attackfee.json"]);
  const now = await allDocsUnset(ROOT);
  assert.deepEqual(Object.keys(now).sort(), Object.keys(GOLDEN.docs).sort());
  for (const k of Object.keys(GOLDEN.docs)) assert.equal(as23108(now[k]), GOLDEN.docs[k], `${k} differs from the discovery golden file:\n${as23108(now[k])}\n${GOLDEN.docs[k]}`);
  // An empty value is the same as unset, everywhere.
  const empty = { ...(await nodeDocs(ROOT, { ATTACKFEE_SITE_URL: "" })), ...(await edgeDocs(ROOT, { ATTACKFEE_SITE_URL: "" })), ...phpDocs(ROOT, "").docs };
  for (const k of Object.keys(GOLDEN.docs)) assert.equal(as23108(empty[k]), GOLDEN.docs[k], k + " with ATTACKFEE_SITE_URL=''");
});

/** The golden document with `docs` set to `url`: the only change ATTACKFEE_SITE_URL may make. */
const withDocs = (golden: string, url: string) => {
  assert.ok(golden.includes('"docs":null,'));
  return golden.replace('"docs":null,', `"docs":${JSON.stringify(url)},`);
};

test("set: docs is exactly ATTACKFEE_SITE_URL in Node, edge and WordPress; nothing else changes", async () => {
  for (const raw of [SITE, SITE + "/"]) {
    const got = { ...(await nodeDocs(ROOT, { ATTACKFEE_SITE_URL: raw })), ...(await edgeDocs(ROOT, { ATTACKFEE_SITE_URL: raw })), ...phpDocs(ROOT, raw).docs };
    for (const k of Object.keys(GOLDEN.docs)) {
      const want = k.endsWith("attackfee.json") ? withDocs(GOLDEN.docs[k], SITE) : GOLDEN.docs[k];
      assert.equal(as23108(got[k]), want, `${k} with ATTACKFEE_SITE_URL=${raw}`);
      if (k.endsWith("attackfee.json")) assert.equal(JSON.parse(got[k]).docs, SITE);
    }
    // The protected site's own URLs still come from the request / home URL, not from ATTACKFEE_SITE_URL.
    assert.equal(JSON.parse(got["node paid attackfee.json"]).api, "http://site.test/v1");
    assert.equal(JSON.parse(got["edge work attackfee.json"]).api, "https://edge-site.test/v1");
    assert.equal(JSON.parse(got["wp work attackfee.json"]).api, "https://wp.test/wp-json/attackfee/v1");
    assert.deepEqual(JSON.parse(got["wp work agents.json"]), { manifest: "https://wp.test/.well-known/attackfee.json" });
  }
});

test("Node: an explicit discovery.docs_url in the config still wins over ATTACKFEE_SITE_URL", async () => {
  const docsUrl = "https://docs.site.example/attackfee";
  const got = await nodeDocs(ROOT, { ATTACKFEE_SITE_URL: SITE }, { discovery: { docs_url: docsUrl } });
  assert.equal(as23108(got["node work attackfee.json"]), withDocs(GOLDEN.docs["node work attackfee.json"], docsUrl));
  assert.equal(as23108(got["node paid attackfee.json"]), withDocs(GOLDEN.docs["node paid attackfee.json"], docsUrl));
});

test("demo: demo/attackfee.yaml through loadConfig takes ATTACKFEE_SITE_URL from the environment", () => {
  const env = { ATTACKFEE_SECRET: "x".repeat(32), ATTACKFEE_OWNER_KEY: "y".repeat(32) };
  assert.equal(loadConfig(ROOT + "/demo/attackfee.yaml", env).discovery.docs_url, null);
  assert.equal(loadConfig(ROOT + "/demo/attackfee.yaml", { ...env, ATTACKFEE_SITE_URL: SITE + "/" }).discovery.docs_url, SITE);
});

test("edge: wrangler.toml sets no ATTACKFEE_SITE_URL (unset by default)", () => {
  assert.ok(!/ATTACKFEE_SITE_URL/.test(readFileSync(ROOT + "/packages/edge-cf/wrangler.toml", "utf8")));
});

test("invalid: logged once and treated as unset in Node, edge and WordPress (output identical to the discovery golden file)", async () => {
  const invalid = ["http://" + "site.example", "https://", "garbage", "https://site.example?x=1", "https://127.0.0.1"];
  for (const raw of invalid) {
    const nodeWarn: string[] = [];
    const cw = console.warn;
    console.warn = (m: string) => nodeWarn.push(String(m));
    let node;
    try { node = await nodeDocs(ROOT, { ATTACKFEE_SITE_URL: raw }); } finally { console.warn = cw; }
    const edgeWarn: string[] = [];
    const edge = await edgeDocs(ROOT, { ATTACKFEE_SITE_URL: raw }, (m) => edgeWarn.push(String(m)));
    const wp = phpDocs(ROOT, raw);
    const got = { ...node, ...edge, ...wp.docs };
    for (const k of Object.keys(GOLDEN.docs)) assert.equal(as23108(got[k]), GOLDEN.docs[k], `${k} with invalid ATTACKFEE_SITE_URL ${JSON.stringify(raw)}`);
    // Once per process per value on Node (two configs were built: paid and work), once per isolate at
    // the edge (both documents fetched), once per harness run on WordPress (only the manifest reads it;
    // each run has its own in-memory transients, so the hourly throttle is checked in the next test).
    assert.equal(nodeWarn.length, 1, "node: " + nodeWarn.join(" | "));
    assert.equal(edgeWarn.length, 1, "edge: " + edgeWarn.join(" | "));
    for (const m of [...nodeWarn, ...edgeWarn]) assert.match(m, /^\[attackfee\] ATTACKFEE_SITE_URL must be an absolute https:\/\/ URL/);
    for (const [k, err] of Object.entries(wp.stderr)) {
      const lines = err.split("\n").filter((l) => l.includes("Attackfee: ATTACKFEE_SITE_URL must be"));
      assert.equal(lines.length, k.endsWith("attackfee.json") ? 1 : 0, `${k} stderr: ${err}`);
    }
    for (const m of [...nodeWarn, ...edgeWarn, ...Object.values(wp.stderr)]) assert.ok(!m.includes("site.example?x") && !m.includes("garbage"), "the value itself is not logged");
  }
  // A non-string constant in wp-config.php is refused too.
  const wp = phpDocs(ROOT, true);
  assert.equal(as23108(wp.docs["wp work attackfee.json"]), GOLDEN.docs["wp work attackfee.json"]);
  assert.match(wp.stderr["wp work attackfee.json"], /ATTACKFEE_SITE_URL must be a string/);
});

/** One manifest request to the WordPress plugin with transients kept in `store` between requests. Returns the log lines. */
function wpManifestLog(store: string, constant: unknown, skew = 0): string[] {
  const args = [PHP, "serve", PLUGIN, ROOT + "/packages/server-php/vendor/autoload.php", "work", "attackfee.json"];
  if (constant !== undefined) args.push(JSON.stringify(constant));
  const r = spawnSync("php", args, { encoding: "utf8", env: { ...process.env, ATTACKFEE_TEST_TRANSIENTS: store, ATTACKFEE_TEST_CLOCK_SKEW: String(skew) } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(as23108(r.stdout), GOLDEN.docs["wp work attackfee.json"], "the manifest is as if ATTACKFEE_SITE_URL were unset");
  return r.stderr.split("\n").filter((l) => l.includes("Attackfee: ATTACKFEE_SITE_URL"));
}

test("WordPress: an invalid ATTACKFEE_SITE_URL is logged at most once an hour across requests (attackfee_wp_site_url_warned transient)", () => {
  const dir = mkdtempSync(tmpdir() + "/attackfee-site-url-");
  const store = dir + "/transients.json";
  const bad = "garbage-once-an-hour";
  try {
    const first = wpManifestLog(store, bad);
    assert.equal(first.length, 1, "the first request logs");
    assert.ok(!first[0].includes(bad), "the value itself is not logged");
    let later = 0;
    for (let i = 0; i < 5; i++) later += wpManifestLog(store, bad).length;
    assert.equal(later, 0, "five more requests within the hour log nothing");
    const saved = JSON.parse(readFileSync(store, "utf8"));
    assert.deepEqual(Object.keys(saved), ["attackfee_wp_site_url_warned"]);
    const ttl = saved.attackfee_wp_site_url_warned[1] - Math.floor(Date.now() / 1000);
    assert.ok(ttl > 3500 && ttl <= 3600, `set for HOUR_IN_SECONDS (${ttl}s left)`);
    assert.equal(wpManifestLog(store, bad, 3540).length, 0, "still nothing a minute before the hour is up");
    assert.equal(wpManifestLog(store, bad, 3601).length, 1, "the transient has expired: logged again");
    assert.equal(wpManifestLog(store, bad, 3601).length, 0, "and throttled again from there");
    writeFileSync(store, "{}");
    assert.equal(wpManifestLog(store, bad).length, 1, "transient deleted: logged again");
    writeFileSync(store, "{}");
    for (const ok of [undefined, "", SITE]) {
      for (let i = 0; i < 3; i++) {
        const args = [PHP, "serve", PLUGIN, ROOT + "/packages/server-php/vendor/autoload.php", "work", "attackfee.json"];
        if (ok !== undefined) args.push(JSON.stringify(ok));
        const r = spawnSync("php", args, { encoding: "utf8", env: { ...process.env, ATTACKFEE_TEST_TRANSIENTS: store } });
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.stderr, "", `${JSON.stringify(ok)}: nothing logged`);
      }
    }
    assert.equal(readFileSync(store, "utf8"), "{}", "a valid or unset value stores no transient");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
