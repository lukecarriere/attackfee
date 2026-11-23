// Free live-checks: --expect off|cashu (default cashu), mint from arg/config, and a
// never-paying L402 header check when payments are on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { encodeBolt11 } from "../packages/settlement-ln/src/bolt11.ts";
// @ts-ignore plain JS script
import { DEFAULT_EXPECT, parseExpect, resolveMint, unlistedMints, parseL402WwwAuthenticate, freeChecks, agentReadCheck, stripInsightsBeacon } from "../scripts/live-checks.mjs";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const ROOT = join(import.meta.dirname, "..");
const MINIBITS = "https://mint.minibits.cash/Bitcoin";

function listen(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r, j) => server.close((err) => (err ? j(err) : r()))),
      });
    });
  });
}

async function runFree(base: string, expect: "off" | "cashu", extra: { mint?: string } = {}) {
  const results: Record<string, string> = {};
  const details: Record<string, unknown> = {};
  const note = (check: string, status: string, detail: unknown) => {
    results[check] = status;
    details[check] = detail;
  };
  await freeChecks({ base, expect, mint: extra.mint ?? "", note });
  return { results, details };
}

// A one-page site for agentRead: HTML with one alternate link, its Markdown twin, a sitemap, and the demo write.
const PAGE_HTML = `<!doctype html><html><head><title>Docs</title><link rel="alternate" type="text/markdown" href="/page.md"></head><body><header><nav aria-label="Pages"><a href="/">Home</a></nav></header><main><h1>Docs</h1><p>Reads stay free. Writes carry a cost.</p><ul><li>Run <code>npm test</code>.</li></ul></main><footer>Footer</footer><script src="/x.js"></script></body></html>`;
const PAGE_MD = "# Docs\n\nReads stay free. Writes carry a cost.\n\n- Run `npm test`.\n";
const PAGE_HASH = createHash("sha256").update(PAGE_HTML.replace('<link rel="alternate" type="text/markdown" href="/page.md">', "")).digest("hex");

/** Serves the agentRead routes; `bad` breaks one thing. Returns false for a path it does not own. */
function agentSite(req: IncomingMessage, res: ServerResponse, bad = ""): boolean {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const ua = (req.headers["user-agent"] || "").toString();
  const md = /GPTBot/.test(ua) || /text\/markdown/.test((req.headers.accept || "").toString());
  if (url.pathname === "/sitemap.xml") {
    res.setHeader("content-type", "application/xml");
    res.end(`<urlset><url><loc>https://site.example/page</loc></url></urlset>`);
    return true;
  }
  if (url.pathname === "/demo/contact" && req.method === "POST" && /GPTBot/.test(ua)) {
    res.setHeader("content-type", "application/json");
    res.statusCode = bad === "write" ? 200 : 402;
    res.end(JSON.stringify(bad === "write" ? { ok: true } : { error: "payment_required" }));
    return true;
  }
  const body = bad === "missing" ? "# Docs\n" : bad === "script" ? PAGE_MD + "<script>x</script>\n" : PAGE_MD;
  if (url.pathname === "/page.md") {
    res.setHeader("content-type", "text/markdown; charset=utf-8");
    res.end(body);
    return true;
  }
  if (url.pathname === "/page") {
    res.setHeader("vary", "Accept, User-Agent");
    if (md && bad !== "html") {
      res.setHeader("content-type", "text/markdown; charset=utf-8");
      res.end(body);
    } else {
      res.setHeader("content-type", "text/html");
      res.end(bad === "changed" ? PAGE_HTML.replace("Docs</h1>", "Docs!</h1>") : PAGE_HTML);
    }
    return true;
  }
  return false;
}

test("agentRead passes a site that serves each sitemap page as Markdown and fails each way it can break", async () => {
  for (const bad of ["", "missing", "script", "html", "changed", "write", "hash"]) {
    const srv = await listen((req, res) => { if (!agentSite(req, res, bad)) { res.statusCode = 404; res.end("{}"); } });
    try {
      const results: Record<string, string> = {};
      const details: Record<string, any> = {};
      await agentReadCheck({ base: srv.url, expected: { "/page": bad === "hash" ? "0".repeat(64) : PAGE_HASH }, note: (c: string, st: string, d: unknown) => { results[c] = st; details[c] = d; } });
      assert.equal(results.agentRead, bad === "" ? "PASS" : "FAIL", "case " + (bad || "ok") + ": " + JSON.stringify(details.agentRead));
      if (bad === "") {
        const page = details.agentRead.detail[0];
        assert.equal(page.gptbot.type, "text/markdown; charset=utf-8");
        assert.equal(page.human.hash, PAGE_HASH);
        assert.deepEqual(details.agentRead.write402, { http: 402, error: "payment_required" });
      }
    } finally {
      await srv.close();
    }
  }
});

test("agentRead strips the Cloudflare insights beacon and still fails when any other script is injected", async () => {
  const beacon = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"fixture"}'></script>`;
  const withBeacon = PAGE_HTML.replace("</body>", beacon + "</body>");
  const other = PAGE_HTML.replace("</body>", `<script src="https://example.test/extra.js"></script></body>`);
  assert.equal(stripInsightsBeacon(withBeacon), PAGE_HTML);
  assert.equal(stripInsightsBeacon(PAGE_HTML), PAGE_HTML);
  assert.equal(stripInsightsBeacon(other), other);

  const serve = (html: string) => listen((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const ua = String(req.headers["user-agent"] || "");
    const accept = String(req.headers.accept || "");
    if (url.pathname === "/page" && !/GPTBot/.test(ua) && !/text\/markdown/.test(accept)) {
      res.setHeader("vary", "Accept, User-Agent");
      res.setHeader("content-type", "text/html");
      res.end(html);
      return;
    }
    if (!agentSite(req, res)) { res.statusCode = 404; res.end("{}"); }
  });

  const ok = await serve(withBeacon);
  try {
    const results: Record<string, string> = {};
    const details: Record<string, any> = {};
    await agentReadCheck({ base: ok.url, expected: { "/page": PAGE_HASH }, note: (c: string, st: string, d: unknown) => { results[c] = st; details[c] = d; } });
    assert.equal(results.agentRead, "PASS", JSON.stringify(details.agentRead));
    assert.equal(details.agentRead.detail[0].human.hash, PAGE_HASH);
  } finally {
    await ok.close();
  }

  const bad = await serve(other);
  try {
    const results: Record<string, string> = {};
    await agentReadCheck({ base: bad.url, expected: { "/page": PAGE_HASH }, note: (c: string, st: string) => { results[c] = st; } });
    assert.equal(results.agentRead, "FAIL");
  } finally {
    await bad.close();
  }
});

test("default expect is cashu, and parseExpect accepts only off or cashu", () => {
  assert.equal(DEFAULT_EXPECT, "cashu");
  assert.equal(parseExpect("off"), "off");
  assert.equal(parseExpect("cashu"), "cashu");
  assert.throws(() => parseExpect("stub"), /off\|cashu/);
  assert.throws(() => parseExpect(""), /off\|cashu/);
  const src = readFileSync(join(ROOT, "scripts/live-checks.mjs"), "utf8");
  assert.match(src, /EXPECT_PAYMENT \|\| DEFAULT_EXPECT/);
  assert.match(src, /--expect off\|cashu/);
  // A payments-on deploy must run live-checks --expect cashu.
  for (const f of ["scripts/deploy.sh", "scripts/release-check.sh"]) {
    const text = readFileSync(join(ROOT, f), "utf8");
    assert.equal(text.includes("--expect cashu"), true, f + " must pass --expect cashu");
  }
});

test("resolveMint prefers the explicit arg, then env, then the offer or manifest, and never a built-in Minibits URL", () => {
  assert.equal(resolveMint({ arg: "https://mint.example.test/Bitcoin", env: "https://ignored.test", offer: "https://from-offer.test" }), "https://mint.example.test/Bitcoin");
  assert.equal(resolveMint({ env: "https://from-env.test/Bitcoin", offer: "https://from-offer.test" }), "https://from-env.test/Bitcoin");
  assert.equal(resolveMint({ offer: "https://from-offer.test/Bitcoin" }), "https://from-offer.test/Bitcoin");
  assert.equal(resolveMint({}), "");
  const src = readFileSync(join(ROOT, "scripts/live-checks.mjs"), "utf8");
  assert.equal(src.includes(MINIBITS), false, "live-checks must not hardcode the Minibits mint URL");
});

test("unlistedMints derives refusals from the allowlisted mint plus the generic test mint", () => {
  const mint = "https://mint.example.test/Bitcoin";
  const list = unlistedMints(mint);
  assert.ok(list.includes("https://testnut.cashu.space"));
  assert.ok(list.includes("https://mint.example.test/Other"));
  assert.ok(list.includes("http://mint.example.test/Bitcoin"));
  assert.equal(list.includes(mint), false);
  assert.equal(list.includes(MINIBITS), false);
});

test("parseL402WwwAuthenticate reads the scheme, macaroon and invoice and never needs a payment", () => {
  const invoice = encodeBolt11({ amountMsat: 10000, paymentHash: "11".repeat(32) });
  const www = `L402 macaroon="mac-abc", invoice="${invoice}"`;
  const parsed = parseL402WwwAuthenticate(www);
  assert.equal(parsed?.scheme, "L402");
  assert.equal(parsed?.macaroon, "mac-abc");
  assert.equal(parsed?.invoice, invoice);
  assert.equal(parseL402WwwAuthenticate("Bearer abc"), null);
});

test("freeChecks --expect off passes against a work-only site and fails the cashu/L402 expectations", async () => {
  const srv = await listen((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/v1/health") {
      res.end(JSON.stringify({ ok: true, v: "1.0.0", settlement: "off", edge: true }));
      return;
    }
    if (url.pathname === "/v1/price") {
      res.end(JSON.stringify({ action: "write", amount_msat: null, usd: null, status: "stub", basis: "current" }));
      return;
    }
    if (url.pathname === "/demo/contact" && req.method === "POST") {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "attackfee_required", challenge: { alg: "pbkdf2", cost: 1 } }));
      return;
    }
    if (url.pathname === "/demo/stats") {
      res.end(JSON.stringify({ accepted: 0, rejected: 0, reversals: 0, reversed_sats: 0 }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  try {
    const off = await runFree(srv.url, "off");
    assert.equal("gate402" in off.results, false);
    assert.equal("l402" in off.results, false);
    assert.deepEqual(off.results, { health: "PASS", price: "PASS", gate403: "PASS", gateAgent: "PASS", stats: "PASS" });
    const cashu = await runFree(srv.url, "cashu");
    assert.equal(cashu.results.health, "FAIL");
    assert.equal(cashu.results.price, "FAIL");
    assert.equal(cashu.results.gateAgent, "FAIL");
    assert.equal(cashu.results.l402, "FAIL");
  } finally {
    await srv.close();
  }
});

test("freeChecks --expect cashu requires a 402, the configured mint, and a free L402 header whose bolt11 matches /v1/price", async () => {
  const mint = "https://mint.example.test/Bitcoin";
  const invoice = encodeBolt11({ amountMsat: 10000, paymentHash: "22".repeat(32) });
  const srv = await listen((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/v1/health") {
      res.end(JSON.stringify({ ok: true, v: "1.0.0", settlement: "cashu", edge: true }));
      return;
    }
    if (url.pathname === "/v1/price") {
      res.end(JSON.stringify({ action: "write", amount_msat: 10000, usd: "0.0100", status: "cashu", basis: "current" }));
      return;
    }
    if (url.pathname === "/demo/contact" && req.method === "POST") {
      const agent = (req.headers["attackfee-client"] || "").toString().toLowerCase() === "agent";
      if (!agent) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "attackfee_required", challenge: { alg: "pbkdf2", cost: 1 } }));
        return;
      }
      res.statusCode = 402;
      res.setHeader("x-cashu", "creqA" + "A".repeat(16));
      res.setHeader("www-authenticate", `L402 macaroon="mac-live", invoice="${invoice}"`);
      res.end(JSON.stringify({
        error: "payment_required",
        offers: [
          { kind: "cashu", amount: 10, mint },
          { kind: "l402", amount_msat: 10000, invoice },
        ],
      }));
      return;
    }
    if (url.pathname === "/demo/stats") {
      res.end(JSON.stringify({ accepted: 0, rejected: 0, reversals: 0, reversed_sats: 0 }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  try {
    const ok = await runFree(srv.url, "cashu", { mint });
    assert.deepEqual(ok.results, { health: "PASS", price: "PASS", gate403: "PASS", gateAgent: "PASS", l402: "PASS", stats: "PASS" });
    const wrongMint = await runFree(srv.url, "cashu", { mint: "https://other.example.test/Bitcoin" });
    assert.equal(wrongMint.results.gateAgent, "FAIL");
    const off = await runFree(srv.url, "off");
    assert.equal(off.results.health, "FAIL");
    assert.equal(off.results.gateAgent, "FAIL");
  } finally {
    await srv.close();
  }
});

test("the live-checks CLI defaults to --expect cashu and exits 0 against a payments-on origin", async () => {
  const mint = "https://mint.example.test/Bitcoin";
  const invoice = encodeBolt11({ amountMsat: 10000, paymentHash: "33".repeat(32) });
  const srv = await listen((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/v1/health") return void res.end(JSON.stringify({ ok: true, v: "1.0.0", settlement: "cashu", edge: true }));
    if (url.pathname === "/v1/price") return void res.end(JSON.stringify({ action: "write", amount_msat: 10000, usd: "0.0100", status: "cashu" }));
    if (url.pathname === "/demo/contact" && req.method === "POST") {
      const agent = (req.headers["attackfee-client"] || "").toString().toLowerCase() === "agent";
      if (!agent) {
        res.statusCode = 403;
        return void res.end(JSON.stringify({ error: "attackfee_required", challenge: { alg: "pbkdf2" } }));
      }
      res.statusCode = 402;
      res.setHeader("x-cashu", "creqA" + "A".repeat(16));
      res.setHeader("www-authenticate", `L402 macaroon="mac-live", invoice="${invoice}"`);
      return void res.end(JSON.stringify({
        error: "payment_required",
        offers: [
          { kind: "cashu", amount: 10, mint },
          { kind: "l402", amount_msat: 10000, invoice },
        ],
      }));
    }
    if (url.pathname === "/demo/stats") return void res.end(JSON.stringify({ accepted: 0, rejected: 0, reversals: 0, reversed_sats: 0 }));
    if (agentSite(req, res)) return;
    res.statusCode = 404;
    res.end("{}");
  });
  const out = mkdtempSync(join(tmpdir(), "live-checks-"));
  const baseline = join(out, "html-baseline.json");
  writeFileSync(baseline, JSON.stringify({ "/page": PAGE_HASH }));
  try {
    const r = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [join(ROOT, "scripts/live-checks.mjs"), "--base", srv.url, "--out", out, "--html-baseline", baseline], { cwd: ROOT });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error("live-checks CLI timed out\n" + stdout + stderr));
      }, 10000);
      child.on("error", (err) => { clearTimeout(timer); reject(err); });
      child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /OVERALL: PASS/);
    assert.match(r.stdout, /check agentRead: PASS/);
  } finally {
    rmSync(out, { recursive: true, force: true });
    await srv.close();
  }
});

test("freeChecks --expect cashu fails when the L402 invoice amount does not match /v1/price", async () => {
  const mint = "https://mint.example.test/Bitcoin";
  const invoice = encodeBolt11({ amountMsat: 20000, paymentHash: "44".repeat(32) });
  const srv = await listen((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/v1/health") {
      res.end(JSON.stringify({ ok: true, v: "1.0.0", settlement: "cashu", edge: true }));
      return;
    }
    if (url.pathname === "/v1/price") {
      res.end(JSON.stringify({ action: "write", amount_msat: 10000, usd: "0.0100", status: "cashu", basis: "current" }));
      return;
    }
    if (url.pathname === "/demo/contact" && req.method === "POST") {
      const agent = (req.headers["attackfee-client"] || "").toString().toLowerCase() === "agent";
      if (!agent) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "attackfee_required", challenge: { alg: "pbkdf2", cost: 1 } }));
        return;
      }
      res.statusCode = 402;
      res.setHeader("x-cashu", "creqA" + "A".repeat(16));
      res.setHeader("www-authenticate", `L402 macaroon="mac-mismatch", invoice="${invoice}"`);
      res.end(JSON.stringify({
        error: "payment_required",
        offers: [
          { kind: "cashu", amount: 10, mint },
          { kind: "l402", amount_msat: 20000, invoice },
        ],
      }));
      return;
    }
    if (url.pathname === "/demo/stats") {
      res.end(JSON.stringify({ accepted: 0, rejected: 0, reversals: 0, reversed_sats: 0 }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  try {
    const mismatch = await runFree(srv.url, "cashu", { mint });
    assert.equal(mismatch.results.l402, "FAIL", JSON.stringify(mismatch.details.l402));
    assert.equal(mismatch.results.health, "PASS");
    assert.equal(mismatch.results.price, "PASS");
  } finally {
    await srv.close();
  }
});
