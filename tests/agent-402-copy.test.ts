// Round 10 (Nov 18, 2026): discovery copy, manifest prices, health rate and the agent 402 copy.
//   (a) the manifest description names both ways to pay;
//   (b) the homepage line about a refused write matches what the site worker does: no header is a
//       403 with a fresh challenge, `Attackfee-Client: agent` is a 402 with a price and a link to the
//       same work (checked against the site worker under wrangler dev --local and a loopback mint);
//   (c) the price-check tool shows the real per-class prices from the gate's own table, the pass-check
//       tool shows no price, and no tool shows a $0 price;
//   (d) /v1/health and /v1/price read one rate, even when they run in different isolates;
//   (e) stale "payments are off" and contributor lines are gone.
// No deploy, no real mint, no real money. wrangler dev listens on 127.0.0.1:8803.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import { MANIFEST_DESCRIPTION, buildManifest } from "../packages/server-node/src/manifest.ts";
import { startKeysetMint } from "../packages/settlement-ln/src/index.ts";
import { phpDocs } from "./discovery-docs.ts";
// @ts-ignore plain JS build script
import { HOME } from "../website/build.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OLD_DESC = "A small cost on each write, paid in background work. Reads stay free. Does not identify the caller.";
const NEW_DESC = "A small cost on each write, paid in background work or per action over HTTP 402. Reads stay free. Does not identify the caller.";
const OLD_REFUSED = "The server answers 403 and includes a fresh challenge.";
const NEW_REFUSED = "A browser gets a 403 with a fresh challenge. A client that sends the Attackfee-Client: agent header gets a 402 with a price and a link to the same work.";
const PORT = 8803;
const MINT = "https://mint.minibits.cash/Bitcoin";

type Tool = { name: string; price: any };
const toolOf = (doc: any, name: string): Tool => doc.tools.find((t: Tool) => t.name === name);

/** No price anywhere in a manifest is a zero amount or a $0 display. */
function assertNoZeroPrice(doc: any, label: string) {
  const text = JSON.stringify(doc);
  assert.equal(text.includes("0.0000"), false, label + ": no $0.0000");
  assert.equal(/"amount_msat":0[,}]/.test(text), false, label + ": no amount_msat 0");
}

// (a)
test("(a) the manifest description names background work and HTTP 402, on Node, the edge and WordPress", () => {
  assert.equal(MANIFEST_DESCRIPTION, NEW_DESC);
  const php = readFileSync(ROOT + "packages/wp-attackfee/includes/discovery.php", "utf8");
  assert.ok(php.includes(`'${NEW_DESC}'`), "WordPress manifest description");
  assert.equal(php.includes(OLD_DESC), false);
  assert.ok(readFileSync(ROOT + "docs/copy.md", "utf8").includes(NEW_DESC), "docs/copy.md carries the exact description");
  const wp = JSON.parse(phpDocs(ROOT.replace(/\/$/, "")).docs["wp paid attackfee.json"]);
  assert.equal(wp.description, NEW_DESC);
});

// (c)
test("(c) price-check shows the gate's per-class prices from the same table; pass-check shows no price; never $0", () => {
  const prices = { write: { amount_msat: 12000, usd: "0.0077" }, search: { amount_msat: 3000, usd: "0.0020" }, account: { amount_msat: 26000, usd: "0.0166" }, admin: { amount_msat: 101000, usd: "0.0644" } };
  const paid = buildManifest({ api: "https://x.test/v1", docs: null, status: "cashu", prices, methods: ["cashu"] });
  const check = toolOf(paid, "price_write_action");
  const gate = toolOf(paid, "gate_form_write");
  assert.equal(check.price.amount_msat, 12000, "the write price comes from the table, not a constant");
  assert.equal(check.price.display, "$0.0077 (cashu)");
  assert.deepEqual(check.price.by_action, gate.price.by_action, "the same per-class prices as the gate");
  assert.equal(check.price.by_action.admin.amount_msat, 101000);
  assert.equal(toolOf(paid, "verify_write_pass").price, null, "checking a pass is not priced");
  assertNoZeroPrice(paid, "node paid");
  const work = buildManifest({ api: "https://x.test/v1", docs: null, status: "stub", prices: null });
  assert.equal(toolOf(work, "price_write_action").price.amount_msat, null);
  assert.equal(toolOf(work, "verify_write_pass").price, null);
  assertNoZeroPrice(work, "node work only");
  const { docs } = phpDocs(ROOT.replace(/\/$/, ""));
  for (const variant of ["paid", "work"]) {
    const doc = JSON.parse(docs[`wp ${variant} attackfee.json`]);
    assertNoZeroPrice(doc, "wp " + variant);
    assert.equal(toolOf(doc, "verify_write_pass").price, null, "wp " + variant + " pass-check");
    assert.deepEqual(toolOf(doc, "price_write_action").price.by_action, toolOf(doc, "gate_form_write").price.by_action, "wp " + variant + " price-check");
  }
});

// (d)
test("(d) /v1/health reads the same rate as /v1/price, even from another isolate", async () => {
  const dir = mkdtempSync(join(tmpdir(), "attackfee-r10-iso-"));
  const entry = join(dir, "entry.ts");
  writeFileSync(entry, `export { createEdgeHandler } from ${JSON.stringify(ROOT + "packages/edge-cf/src/handler.ts")};\nexport { MemoryStore } from ${JSON.stringify(ROOT + "packages/server-node/src/stores.ts")};\n`);
  const out = join(dir, "handler.mjs");
  await esbuild({
    entryPoints: [entry], outfile: out, bundle: true, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
    banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
    plugins: [{ name: "widget-text", setup(b) { b.onLoad({ filter: /widget[\\/]dist[\\/].*\.js$/ }, async (a) => ({ contents: readFileSync(a.path, "utf8"), loader: "text" })); } }],
  });
  const cache = new Map<string, { body: string; headers: [string, string][] }>();
  const g = globalThis as any;
  const realFetch = g.fetch;
  const realCaches = g.caches;
  const realLog = console.log;
  let mempool: "up" | "down" = "up";
  g.caches = {
    default: {
      async match(key: Request | string) {
        const hit = cache.get(typeof key === "string" ? key : key.url);
        return hit ? new Response(hit.body, { headers: hit.headers }) : undefined;
      },
      async put(key: Request | string, res: Response) {
        cache.set(typeof key === "string" ? key : key.url, { body: await res.text(), headers: [...res.headers.entries()] });
      },
    },
  };
  g.fetch = async (input: any) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://mempool.space/")) {
      return mempool === "up" ? new Response(JSON.stringify({ time: 1, USD: 63000 }), { status: 200, headers: { "content-type": "application/json" } }) : new Response("slow down", { status: 429 });
    }
    return new Response("no mint in this test", { status: 503 });
  };
  console.log = () => {};
  try {
    const env = { SITE_ID: "site_iso", SITE_SECRET: "iso-test-secret-do-not-use-0001", CASHU_MINTS: JSON.stringify([MINT]), ATTACKFEE_TEST_HOOKS: "1" };
    const isolate = async (tag: string) => {
      const mod = await import(pathToFileURL(out).href + "?isolate=" + tag);
      return mod.createEdgeHandler({ store: () => new mod.MemoryStore(), proofStore: () => ({}) as any, preserveFields: false, forward: async () => new Response("origin") });
    };
    const a = await isolate("a");
    const b = await isolate("b");
    const getJson = async (h: any, path: string) => (await h.fetch(new Request("https://site.test" + path), env)).json();

    const priceA = await getJson(a, "/v1/price?action=write");
    assert.equal(typeof priceA.usd, "string", "isolate A has a rate: " + JSON.stringify(priceA));
    mempool = "down"; // isolate B's own rate fetch fails
    const healthB = await getJson(b, "/v1/health");
    assert.equal(healthB.settlement, "cashu");
    assert.equal(healthB.usd_rate, "ok", "health in isolate B must see the rate /v1/price showed: " + JSON.stringify(healthB));
    const priceB = await getJson(b, "/v1/price?action=write");
    assert.equal(priceB.usd, priceA.usd, "one rate across isolates");
  } finally {
    g.fetch = realFetch;
    if (realCaches === undefined) delete g.caches; else g.caches = realCaches;
    console.log = realLog;
    rmSync(dir, { recursive: true, force: true });
  }
});

// (e)
test("(e) stale payments-off and contributor lines are gone", () => {
  const head = readFileSync(ROOT + "tests/docs.test.ts", "utf8").split("\n").slice(0, 5).join("\n");
  assert.equal(head.includes("payments are off"), false, "tests/docs.test.ts header");
  const contributing = readFileSync(ROOT + "CONTRIBUTING.md", "utf8");
  assert.equal(contributing.includes("Settlement is test-only"), false, "production takes Cashu now");
  assert.equal(contributing.includes("GitHub private vulnerability reporting"), false, "not available on a private repo; SECURITY.md says report privately to the maintainers");
});

// (b): the site worker under wrangler dev, payments on as in wrangler.toml (L402 on), mint on loopback.
let wr: ChildProcess | undefined;
let base = "";
let mint: Awaited<ReturnType<typeof startKeysetMint>> | undefined;

before(async () => {
  execFileSync(process.execPath, [ROOT + "packages/edge-cf/build.mjs"], { cwd: ROOT });
  mint = await startKeysetMint({ quotes: true });
  writeFileSync(ROOT + ".dev.vars", `SITE_SECRET="r10-agent-402-secret-0001"\nATTACKFEE_TEST_HOOKS=1\nL402_ENABLED=1\nCASHU_MINTS=["${MINT}"]\nCASHU_FETCH_PROXY="${mint.url}"\n`, { mode: 0o600 });
  const persist = mkdtempSync(join(tmpdir(), "attackfee-r10-wr-"));
  wr = spawn(ROOT + "node_modules/.bin/wrangler", ["dev", "--local", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", persist, "--show-interactive-dev-session=false"], {
    cwd: ROOT, env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" }, stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("wrangler dev did not start:\n" + log)), 90_000);
    const on = (c: Buffer) => { log += c.toString(); if (/Ready on http/.test(log)) { clearTimeout(t); resolve(); } };
    wr!.stdout!.on("data", on);
    wr!.stderr!.on("data", on);
    wr!.on("exit", (code) => { clearTimeout(t); reject(new Error("wrangler dev exited " + code + "\n" + log)); });
  });
  wr.removeAllListeners("exit");
  base = `http://127.0.0.1:${PORT}`;
});

after(async () => {
  wr?.kill("SIGTERM");
  rmSync(ROOT + ".dev.vars", { force: true });
  await mint?.close();
});

/** The work asked for: algorithm, cost and key length. Salt, nonce, ids and signatures are per challenge. */
const workShape = (w: any) => ({ algorithm: w.parameters?.algorithm, cost: w.parameters?.cost, keyLength: w.parameters?.keyLength });

test("(b) no header: 403 with a fresh challenge; Attackfee-Client: agent: 402 with a price and a link to the same work; homepage says so", async () => {
  const post = (headers: Record<string, string>) => fetch(base + "/demo/contact", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", ...headers }, body: "{}" });
  const r1 = await post({});
  const b1 = await r1.json() as any;
  assert.equal(r1.status, 403, "no header is a 403");
  assert.equal(b1.error, "attackfee_required");
  assert.ok(b1.challenge?.id && b1.challenge?.work, "the 403 carries a challenge: " + JSON.stringify(b1));
  const b1b = await (await post({})).json() as any;
  assert.notEqual(b1b.challenge.id, b1.challenge.id, "each 403 carries a fresh challenge");

  const r2 = await post({ "Attackfee-Client": "agent" });
  const b2 = await r2.json() as any;
  assert.equal(r2.status, 402, "the agent header is a 402");
  assert.equal(b2.error, "payment_required");
  assert.ok(Array.isArray(b2.offers) && b2.offers.length > 0, "the 402 carries offers");
  for (const o of b2.offers) assert.ok(Number.isInteger(o.amount_msat) && o.amount_msat > 0, "each offer has a price: " + JSON.stringify(o));
  assert.equal(typeof b2.challenge_url, "string", "the 402 links to the work");
  const link = new URL(b2.challenge_url, base);
  assert.equal(link.pathname, "/v1/challenge");
  assert.equal(link.searchParams.get("action"), b1.challenge.action ?? "write");
  assert.equal(link.searchParams.get("path"), "/demo/contact");
  const linked = await (await fetch(link)).json() as any;
  assert.ok(linked.challenge?.work, "the link returns a work challenge: " + JSON.stringify(linked));
  assert.deepEqual(linked.offers, [], "the link is the work only");
  assert.equal(linked.challenge.action, b1.challenge.action, "same action class");
  assert.ok(workShape(b1.challenge.work).algorithm && workShape(b1.challenge.work).cost, "the 403 work names its algorithm and cost");
  assert.deepEqual(workShape(linked.challenge.work), workShape(b1.challenge.work), "same work as the 403 challenge");

  // The price-check tool on the same worker shows the price the 402 charges.
  const manifest = await (await fetch(base + "/.well-known/attackfee.json")).json() as any;
  assert.equal(manifest.description, NEW_DESC);
  assert.equal(toolOf(manifest, "price_write_action").price.amount_msat, b2.offers[0].amount_msat);
  assert.equal(toolOf(manifest, "verify_write_pass").price, null);
  assertNoZeroPrice(manifest, "site worker");

  const how = (HOME.sections.find((s) => s.id === "how")!.body[0] as { ol: string[] }).ol;
  const line = how.find((l) => l.startsWith("**A write without a valid pass is refused.**"))!;
  assert.equal(line, "**A write without a valid pass is refused.** " + NEW_REFUSED);
  assert.equal(how.some((l) => l.includes(OLD_REFUSED)), false);
});
