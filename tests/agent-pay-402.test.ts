// examples/agent-pay-402 end to end on the attackfee-site worker (wrangler dev --local, no deploy).
// The allowlist is the production mint URL. The worker's mint fetches and the example's mint
// fetches both go to the loopback keyset mint (CASHU_FETCH_PROXY / ATTACKFEE_MINT_PROXY), so
// nothing reaches a real mint and nothing is spent. fund.mjs fills the wallet file from a test-mint
// quote, pay.mjs pays a 402 from it, redeems and re-sends the write. Also R6: the 402 body and the
// manifest say how to pay.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { startKeysetMint, type KeysetMint } from "../packages/settlement-ln/src/keyset-mint.ts";
import { decodeTokenV4, encodeTokenV4 } from "../packages/settlement-ln/src/cashu.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EX = ROOT + "examples/agent-pay-402/";
const MINT = "https://mint.minibits.cash/Bitcoin";
const SECRET = "agent-pay-402-test-secret-0001";
const STEPS_N = 4;

let wr: ChildProcess;
let base = "";
let wrLog = "";
let mint: KeysetMint;
let dir = "";

/** A free port in 8800-8809 (team rule for local servers). */
async function freePort(): Promise<number> {
  for (let p = 8800; p <= 8809; p++) {
    const ok = await new Promise<boolean>((r) => { const s = createServer(); s.once("error", () => r(false)); s.listen(p, "127.0.0.1", () => s.close(() => r(true))); });
    if (ok) return p;
  }
  throw new Error("no free port in 8800-8809");
}

before(async () => {
  execFileSync(process.execPath, [ROOT + "website/build.mjs"], { cwd: ROOT });
  execFileSync(process.execPath, [ROOT + "packages/edge-cf/build.mjs"], { cwd: ROOT });
  mint = await startKeysetMint({ quotes: true });
  dir = mkdtempSync(join(tmpdir(), "attackfee-agent-pay-"));
  writeFileSync(ROOT + ".dev.vars", `SITE_SECRET="${SECRET}"\nATTACKFEE_TEST_HOOKS=1\nL402_ENABLED=1\nCASHU_MINTS=["${MINT}"]\nCASHU_FETCH_PROXY="${mint.url}"\n`, { mode: 0o600 });
  const port = await freePort();
  const persist = mkdtempSync(join(tmpdir(), "attackfee-agent-pay-do-"));
  wr = spawn(ROOT + "node_modules/.bin/wrangler", ["dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", persist, "--show-interactive-dev-session=false"], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("wrangler dev did not start:\n" + wrLog)), 90_000);
    const on = (c: Buffer) => { wrLog += c.toString(); if (/Ready on http/.test(wrLog)) { clearTimeout(t); resolve(); } };
    wr.stdout!.on("data", on);
    wr.stderr!.on("data", on);
    wr.on("exit", (code) => { clearTimeout(t); reject(new Error("wrangler dev exited " + code + "\n" + wrLog)); });
  });
  wr.removeAllListeners("exit");
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  wr?.kill("SIGTERM");
  rmSync(ROOT + ".dev.vars", { force: true });
  await mint?.close();
});

interface Run { code: number | null; stdout: string; stderr: string }

function run(script: string, args: string[], o: { env?: Record<string, string>; onStdout?: (all: string, child: ChildProcess) => void } = {}): Promise<Run> {
  return new Promise((resolve, reject) => {
    const cmd = script.endsWith(".sh") ? "bash" : process.execPath;
    const child = spawn(cmd, [EX + script, ...args], { env: { ...process.env, ATTACKFEE_CASHU_SOURCE: "", ATTACKFEE_MINT_PROXY: mint.url, ...o.env }, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(script + " hung\n" + stdout + stderr)); }, 60_000);
    child.stdout!.on("data", (c: Buffer) => { stdout += c.toString(); o.onStdout?.(stdout, child); });
    child.stderr!.on("data", (c: Buffer) => { stderr += c.toString(); });
    child.on("exit", (code) => { clearTimeout(t); resolve({ code, stdout, stderr }); });
  });
}

async function payAtMint(invoice: string) {
  const r = await fetch(mint.url + "/test/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: invoice }) });
  await r.text();
  assert.equal(r.status, 200);
}

/** fund.mjs against the production mint URL, proxied to the keyset mint. */
async function funded(name: string, amount: number, extra: string[] = []): Promise<string> {
  const path = join(dir, name);
  let paid = false;
  const r = await run("fund.mjs", ["--amount", String(amount), "--mint", MINT, "--out", path, ...extra], {
    onStdout: (all) => {
      const m = /^invoice: (\S+)$/m.exec(all);
      if (m && !paid) { paid = true; void payAtMint(m[1]); }
    },
  });
  assert.equal(r.code, 0, r.stderr);
  return path;
}

function wallet(path: string): { mint: string; proofs: { amount: number; secret: string; C: string }[]; unconfirmed?: unknown[] } {
  return JSON.parse(readFileSync(path, "utf8"));
}
const sum = (path: string) => wallet(path).proofs.reduce((n, p) => n + p.amount, 0);

async function lastDay(): Promise<Record<string, number>> {
  const r = await fetch(base + "/demo/stats/daily?days=1");
  assert.equal(r.status, 200);
  const j: any = await r.json();
  return j.days[j.days.length - 1];
}

function assertQuiet(r: Run, secrets: string[]) {
  const out = r.stdout + r.stderr;
  assert.doesNotMatch(out, /cashu[AB][A-Za-z0-9_-]{8}/, "no token printed");
  assert.doesNotMatch(out, /creqA/, "no payment request printed");
  for (const s of secrets) assert.ok(!out.includes(s), "a proof secret or signature was printed");
}

/** The origin the worker sees. wrangler dev rewrites the host to the route's zone, so read it from the manifest's api. */
async function siteOrigin(): Promise<string> {
  const doc: any = await (await fetch(base + "/.well-known/attackfee.json")).json();
  return new URL(doc.api).origin;
}

function assertHowToPay(p: any, origin: string) {
  assert.deepEqual(p.mints, [MINT]);
  assert.equal(p.pay_header, "X-Cashu");
  assert.equal(p.redeem, origin + "/v1/redeem");
  assert.equal(p.pass_header, "Authorization: Attackfee <pass>");
  assert.ok(Array.isArray(p.steps) && p.steps.length === STEPS_N && p.steps.every((s: unknown) => typeof s === "string" && s.length > 0 && s.length <= 200));
  assert.equal("client" in p, false, "no client link while the repo is private");
}

test("R6: an agent 402 on a write and on the pay path carries the how-to-pay object", async () => {
  const origin = await siteOrigin();
  for (const path of ["/demo/contact", "/v1/demo/agent"]) {
    const r = await fetch(base + path, { method: "POST", headers: { "attackfee-client": "agent", accept: "application/json", "content-type": "application/json", "attackfee-test": "1" }, body: "{}" });
    assert.equal(r.status, 402, path);
    const j: any = await r.json();
    assert.equal(j.error, "payment_required");
    assert.ok(Array.isArray(j.offers) && j.offers.length === 2);
    assertHowToPay(j.payment, origin);
  }
});

test("R6: the manifest's payment objects carry mints, pay_header, redeem, pass_header and steps", async () => {
  const r = await fetch(base + "/.well-known/attackfee.json");
  assert.equal(r.status, 200);
  const doc: any = await r.json();
  for (const t of doc.tools) {
    assert.deepEqual(t.payment.methods.map((m: { kind: string }) => m.kind), ["cashu", "l402"]);
    assertHowToPay(t.payment, new URL(doc.api).origin);
  }
});

test("R4 / check 6: --max-amount below the offer exits non-zero with 'offer over max-amount' and spends nothing", async () => {
  const path = await funded("cap.json", 20);
  const before = readFileSync(path, "utf8");
  const swaps = mint.swaps();
  const r = await run("pay.mjs", ["--base", base, "--test", "--max-amount", "1"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /offer over max-amount/);
  assert.equal(mint.swaps(), swaps, "no swap at the mint");
  assert.equal(readFileSync(path, "utf8"), before, "wallet unchanged");
});

test("R4 mode cashu: fund 50, pay two writes of 10 with no test header, change kept 0600, real counters move", async () => {
  const path = await funded("live.json", 50);
  const secrets = wallet(path).proofs.flatMap((p) => [p.secret, p.C]);
  const d0 = await lastDay();
  for (let i = 1; i <= 2; i++) {
    const r = await run("pay.mjs", ["--base", base, "--mode", "cashu", "--max-amount", "10000"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
    assert.equal(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /write: 200/);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(sum(path), 50 - 10 * i);
    assert.equal((wallet(path).unconfirmed ?? []).length, 0);
    secrets.push(...wallet(path).proofs.flatMap((p) => [p.secret, p.C]));
    assertQuiet(r, secrets);
  }
  const d1 = await lastDay();
  assert.equal(d1.paid_writes - d0.paid_writes, 2);
  assert.equal(d1.sats_settled - d0.sats_settled, 20);
  assert.equal(d1.test_paid_writes - d0.test_paid_writes, 0);
});

test("R4 --test: the test header sends the paid write to the test columns", async () => {
  const path = await funded("test.json", 10);
  const d0 = await lastDay();
  const r = await run("pay.mjs", ["--base", base, "--test"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /write: 200/);
  assert.equal(sum(path), 0, "an exact amount is sent without a swap");
  const d1 = await lastDay();
  assert.equal(d1.test_paid_writes - d0.test_paid_writes, 1);
  assert.equal(d1.test_sats_settled - d0.test_sats_settled, 10);
  assert.equal(d1.paid_writes - d0.paid_writes, 0);
});

test("R4: a wallet file that holds a bare cashuB token is accepted and rewritten as a 0600 wallet", async () => {
  const t = decodeTokenV4(mint.token(16));
  const path = join(dir, "token.txt");
  writeFileSync(path, encodeTokenV4({ mint: MINT, unit: t.unit, proofs: t.proofs }) + "\n", { mode: 0o600 });
  const r = await run("pay.mjs", ["--base", base, "--test"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(sum(path), 6);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assertQuiet(r, t.proofs.map((p) => p.secret));
});

test("R4: not enough in the wallet exits non-zero and leaves the file unchanged", async () => {
  const path = await funded("short.json", 5);
  const before = readFileSync(path, "utf8");
  const swaps = mint.swaps();
  const r = await run("pay.mjs", ["--base", base, "--test"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /not enough/);
  assert.equal(readFileSync(path, "utf8"), before);
  assert.equal(mint.swaps(), swaps);
});

test("R4: a wallet file readable by others is refused before any request", async () => {
  const path = await funded("open.json", 10);
  chmodSync(path, 0o640);
  const r = await run("pay.mjs", ["--base", base, "--test"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /0600/);
  assert.equal(sum(path), 10);
});

test("R4 mode invoice: prints the invoice and amount, waits for the payer, then redeems with the macaroon", async () => {
  const d0 = await lastDay();
  let paid = false;
  const r = await run("pay.mjs", ["--base", base, "--test", "--mode", "invoice"], {
    onStdout: (all, child) => {
      const m = /^invoice: (\S+)$/m.exec(all);
      if (m && !paid) {
        paid = true;
        assert.match(all, /^amount: 10 sat$/m);
        void payAtMint(m[1]).then(() => child.stdin!.write("\n"));
      }
    },
  });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /write: 200/);
  assert.doesNotMatch(r.stdout + r.stderr, /macaroon|AgEL/i);
  const d1 = await lastDay();
  assert.equal(d1.test_paid_writes - d0.test_paid_writes, 1);
});

test("R4 pay.sh / check 6: --max-amount below the offer exits non-zero with 'offer over max-amount'", async () => {
  const r = await run("pay.sh", ["--base", base, "--test", "--max-amount", "1"]);
  assert.notEqual(r.code, 0);
  assert.match(r.stdout + r.stderr, /offer over max-amount/);
  assert.doesNotMatch(r.stdout, /^invoice: /m, "no invoice shown for an offer over the cap");
});

test("R4 pay.sh invoice mode: prints amount and invoice, waits for the payer, then the write is 200", async () => {
  const d0 = await lastDay();
  let paid = false;
  const r = await run("pay.sh", ["--base", base, "--test"], {
    onStdout: (all, child) => {
      const m = /^invoice: (\S+)$/m.exec(all);
      if (m && !paid) {
        paid = true;
        assert.match(all, /^amount: 10 sat$/m);
        void payAtMint(m[1]).then(() => child.stdin!.write("\n"));
      }
    },
  });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /write: 200/);
  assert.doesNotMatch(r.stdout + r.stderr, /macaroon|Attackfee [A-Za-z0-9]/);
  const d1 = await lastDay();
  assert.equal(d1.test_paid_writes - d0.test_paid_writes, 1);
});

test("R4 mode cashu: when held proofs add up to the offer exactly, pay.mjs sends just those and the client makes no swap", async () => {
  const path = await funded("split.json", 50, ["--split", "10"]);
  const before = wallet(path).proofs.map((p) => p.secret);
  const swaps = mint.swaps();
  const r = await run("pay.mjs", ["--base", base, "--test"], { env: { ATTACKFEE_CASHU_SOURCE: path } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /write: 200/);
  assert.equal(mint.swaps() - swaps, 1, "only the site's own swap; the client sent exact proofs");
  const left = wallet(path).proofs;
  assert.equal(left.reduce((n, p) => n + p.amount, 0), 40);
  assert.ok(left.every((p) => before.includes(p.secret)), "the rest are the original proofs, untouched");
  assertQuiet(r, before);
});
