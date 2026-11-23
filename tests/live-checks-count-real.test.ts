// R7: live-checks --count-real drops the test header for exactly one paid write, and the withdraw
// step runs only with --withdraw-invoice-file. Mock site only; dummy invoice and key, no money.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { encodeBolt11 } from "../packages/settlement-ln/src/bolt11.ts";
// @ts-ignore plain JS script
import { testHeaderPlan, withdrawStep } from "../scripts/live-checks.mjs";

const ROOT = join(import.meta.dirname, "..");
const KINDS = ["offer", "pay", "use", "offer", "pay", "use", "other", "pay"];

test("default plan: every spend-mode request carries attackfee-test: 1", () => {
  const plan = testHeaderPlan();
  const sent = KINDS.map((k) => plan.headers(k));
  assert.ok(sent.every((h: Record<string, string>) => h["attackfee-test"] === "1"));
  assert.equal(plan.realSent(), 0);
});

test("--count-real plan: exactly one request (the first paid write) goes without the header", () => {
  const plan = testHeaderPlan({ countReal: true });
  const sent = KINDS.map((k) => plan.headers(k));
  const bare = sent.map((h: Record<string, string>, i: number) => [i, h["attackfee-test"]]).filter(([, v]) => v !== "1");
  assert.deepEqual(bare.map(([i]) => i), [1], "only the first pay request drops the header");
  assert.equal(plan.realSent(), 1);
});

test("--count-real never drops the header on offers, uses or other requests", () => {
  const plan = testHeaderPlan({ countReal: true });
  for (const k of ["offer", "use", "other", "offer"]) assert.equal(plan.headers(k)["attackfee-test"], "1");
  assert.equal(plan.headers("pay")["attackfee-test"], undefined);
  assert.equal(plan.headers("pay")["attackfee-test"], "1");
});

function listen(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((ok) => { server.closeAllConnections?.(); server.close(() => ok()); }) });
    });
  });
}

async function body(req: IncomingMessage): Promise<string> {
  let s = "";
  for await (const c of req) s += c;
  return s;
}

// The free run ends with agentRead (every sitemap page as an AI agent reads it), so the fake site
// serves one page, its Markdown twin and a sitemap, and the CLI gets that page's HTML hash.
const PAGE_HTML = '<!doctype html><html><head><title>Docs</title><link rel="alternate" type="text/markdown" href="/page.md"></head><body><main><h1>Docs</h1><p>Reads stay free.</p></main></body></html>';
const PAGE_MD = "# Docs\n\nReads stay free.\n";
const BASELINE = join(mkdtempSync(join(tmpdir(), "lc-html-")), "baseline.json");
writeFileSync(BASELINE, JSON.stringify({ "/page": createHash("sha256").update(PAGE_HTML.replace('<link rel="alternate" type="text/markdown" href="/page.md">', "")).digest("hex") }));

function agentPage(req: IncomingMessage, res: ServerResponse, path: string): boolean {
  const md = /GPTBot/.test(String(req.headers["user-agent"] || "")) || /text\/markdown/.test(String(req.headers.accept || ""));
  if (path === "/sitemap.xml") { res.setHeader("content-type", "application/xml"); res.end("<urlset><url><loc>https://site.example/page</loc></url></urlset>"); return true; }
  if (path === "/page.md" || (path === "/page" && md)) {
    res.setHeader("content-type", "text/markdown; charset=utf-8");
    if (path === "/page") res.setHeader("vary", "Accept, User-Agent");
    res.end(PAGE_MD);
    return true;
  }
  if (path === "/page") { res.setHeader("content-type", "text/html"); res.setHeader("vary", "Accept, User-Agent"); res.end(PAGE_HTML); return true; }
  return false;
}

const INVOICE = encodeBolt11({ amountMsat: 5000, paymentHash: "44".repeat(32) });
const KEY = "k".repeat(48);

function fakeSite(seen: { path: string; method: string; headers: IncomingMessage["headers"]; body: string }[]) {
  const mint = "https://mint.example.test/Bitcoin";
  const l402 = encodeBolt11({ amountMsat: 10000, paymentHash: "33".repeat(32) });
  let withdrawn = 0;
  return listen(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    seen.push({ path: url.pathname, method: req.method || "", headers: req.headers, body: await body(req) });
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/v1/health") return void res.end(JSON.stringify({ ok: true, v: "1.0.0", settlement: "cashu", edge: true }));
    if (url.pathname === "/v1/price") return void res.end(JSON.stringify({ action: "write", amount_msat: 10000, usd: "0.0100", status: "cashu" }));
    if (url.pathname === "/demo/contact" && req.method === "POST") {
      if ((req.headers["attackfee-client"] || "") !== "agent") {
        res.statusCode = 403;
        return void res.end(JSON.stringify({ error: "attackfee_required", challenge: { alg: "pbkdf2" } }));
      }
      res.statusCode = 402;
      res.setHeader("x-cashu", "creqA" + "A".repeat(16));
      res.setHeader("www-authenticate", `L402 macaroon="mac-live", invoice="${l402}"`);
      return void res.end(JSON.stringify({ error: "payment_required", offers: [{ kind: "cashu", amount: 10, mint }, { kind: "l402", amount_msat: 10000, invoice: l402 }] }));
    }
    if (url.pathname === "/demo/stats") return void res.end(JSON.stringify({ accepted: 0, rejected: 0, reversals: 0, reversed_sats: 0 }));
    if (agentPage(req, res, url.pathname)) return;
    if (url.pathname.startsWith("/v1/owner/")) {
      if (req.headers.authorization !== "Bearer " + KEY) { res.statusCode = 401; return void res.end(JSON.stringify({ error: "unauthorized" })); }
      if (url.pathname === "/v1/owner/balance") return void res.end(JSON.stringify({ available_msat: 10000 - withdrawn, withdrawn_msat: withdrawn }));
      if (url.pathname === "/v1/owner/withdraw" && req.method === "POST") {
        withdrawn += 6000;
        return void res.end(JSON.stringify({ state: "paid", amount_msat: 5000, fee_msat: 1000 }));
      }
    }
    res.statusCode = 404;
    res.end("{}");
  });
}

function run(args: string[], env: Record<string, string> = {}): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, "scripts/live-checks.mjs"), ...args, "--html-baseline", BASELINE], { cwd: ROOT, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("timed out\n" + stdout + stderr)); }, 15000);
    child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });
}

function allOutput(dir: string): string {
  return readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
}

test("without --withdraw-invoice-file no owner route is called", async () => {
  const seen: any[] = [];
  const srv = await fakeSite(seen);
  const out = mkdtempSync(join(tmpdir(), "lc-nowd-"));
  try {
    const r = await run(["--base", srv.url, "--out", out]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /OVERALL: PASS/);
    assert.equal(seen.filter((s) => s.path.startsWith("/v1/owner/")).length, 0);
    assert.doesNotMatch(r.stdout, /withdraw/);
  } finally {
    rmSync(out, { recursive: true, force: true });
    await srv.close();
  }
});

test("--withdraw-invoice-file withdraws once, reads the invoice and key from files, prints neither", async () => {
  const seen: any[] = [];
  const srv = await fakeSite(seen);
  const out = mkdtempSync(join(tmpdir(), "lc-wd-"));
  const secrets = mkdtempSync(join(tmpdir(), "lc-wd-in-"));
  const invFile = join(secrets, "invoice.txt");
  const keyFile = join(secrets, "owner.key");
  writeFileSync(invFile, INVOICE + "\n", { mode: 0o600 });
  writeFileSync(keyFile, KEY + "\n", { mode: 0o600 });
  try {
    const r = await run(["--base", srv.url, "--out", out, "--withdraw-invoice-file", invFile, "--owner-key-file", keyFile]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /check withdraw: PASS/);
    const posts = seen.filter((s) => s.path === "/v1/owner/withdraw");
    assert.equal(posts.length, 1);
    assert.equal(JSON.parse(posts[0].body).invoice, INVOICE);
    assert.equal(posts[0].headers["attackfee-test"], "1", "the withdraw POST still carries the test header");
    const printed = r.stdout + r.stderr + allOutput(out);
    assert.ok(!printed.includes(INVOICE), "invoice never printed");
    assert.ok(!printed.includes(KEY), "owner key never printed");
  } finally {
    rmSync(out, { recursive: true, force: true });
    rmSync(secrets, { recursive: true, force: true });
    await srv.close();
  }
});

test("withdraw refuses an invoice passed in argv instead of a file", async () => {
  const notes: Record<string, string> = {};
  await assert.rejects(() => withdrawStep({ base: "http://127.0.0.1:1", invoiceFile: INVOICE, keyFile: "/nonexistent", note: (c: string, s: string) => { notes[c] = s; } }), /file/);
});
