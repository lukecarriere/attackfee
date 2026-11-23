// examples/agent-pay-402/fund.mjs against the loopback keyset mint (NUT-04 quotes on). No real mint.
// The script asks for a mint quote of at most 50, prints only the amount and the invoice, waits for
// the quote to be paid, mints the proofs and writes them to a mode-0600 file. It never prints a
// proof, a token or a secret.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startKeysetMint, type KeysetMint } from "../packages/settlement-ln/src/keyset-mint.ts";
import { decodeBolt11 } from "../packages/settlement-ln/src/bolt11.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FUND = ROOT + "examples/agent-pay-402/fund.mjs";
let mint: KeysetMint;
let dir = "";

before(async () => {
  mint = await startKeysetMint({ quotes: true });
  dir = mkdtempSync(join(tmpdir(), "attackfee-fund-"));
});
after(async () => { await mint?.close(); });

interface Run { code: number | null; stdout: string; stderr: string }

/** Run fund.mjs. When `pay` is set, pay the printed invoice at the test mint (the stand-in for a Lightning payer). */
function fund(args: string[], o: { pay?: boolean; env?: Record<string, string>; shell?: string } = {}): Promise<Run> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ATTACKFEE_CASHU_SOURCE: "", ATTACKFEE_MINT_PROXY: "", ...o.env };
    const child = o.shell
      ? spawn("/bin/sh", ["-c", `${o.shell} && exec "${process.execPath}" "${FUND}" ${args.map((a) => `'${a}'`).join(" ")}`], { env, stdio: ["ignore", "pipe", "pipe"] })
      : spawn(process.execPath, [FUND, ...args], { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let paid = false;
    const t = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("fund.mjs hung\n" + stdout + stderr)); }, 30_000);
    child.stdout.on("data", async (c: Buffer) => {
      stdout += c.toString();
      const m = /^invoice: (\S+)$/m.exec(stdout);
      if (o.pay && m && !paid) {
        paid = true;
        const r = await fetch(mint.url + "/test/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: m[1] }) });
        await r.text();
        assert.equal(r.status, 200);
      }
    });
    child.stderr.on("data", (c: Buffer) => { stderr += c.toString(); });
    child.on("exit", (code) => { clearTimeout(t); resolve({ code, stdout, stderr }); });
  });
}

function wallet(path: string): { mint: string; unit: string; proofs: { amount: number; secret: string; id: string; C: string }[] } {
  return JSON.parse(readFileSync(path, "utf8"));
}

function noSecrets(run: Run, path: string) {
  const out = run.stdout + run.stderr;
  assert.doesNotMatch(out, /cashu[AB]/, "no token in output");
  const w = wallet(path);
  for (const p of w.proofs) {
    assert.ok(!out.includes(p.secret), "a proof secret was printed");
    assert.ok(!out.includes(p.C), "a proof signature was printed");
  }
}

test("fund: refuses more than 50 before any mint call", async () => {
  const out = join(dir, "over.json");
  const before = mint.requests();
  for (const amount of ["51", "1000"]) {
    const r = await fund(["--amount", amount, "--mint", mint.url, "--out", out]);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /at most 50/);
    assert.equal(r.stdout, "");
  }
  assert.equal(mint.requests(), before, "no mint call");
  assert.equal(mint.quotePosts(), 0);
  assert.equal(existsSync(out), false);
});

test("fund: refuses a missing, zero, negative or fractional amount", async () => {
  const out = join(dir, "bad.json");
  const before = mint.requests();
  for (const args of [[], ["--amount", "0"], ["--amount", "-1"], ["--amount", "1.5"], ["--amount", "ten"]]) {
    const r = await fund([...args, "--mint", mint.url, "--out", out]);
    assert.notEqual(r.code, 0, args.join(" "));
    assert.equal(r.stdout, "");
  }
  assert.equal(mint.requests(), before);
  assert.equal(existsSync(out), false);
});

test("fund: refuses a mint that is not https, except a loopback test mint", async () => {
  const out = join(dir, "http.json");
  const r = await fund(["--amount", "5", "--mint", "http://mint.example.com/Bitcoin", "--out", out]);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /https/);
  assert.equal(existsSync(out), false);
});

test("fund: prints only the amount and the invoice, mints 50 and writes a 0600 file with no secret printed", async () => {
  const out = join(dir, "wallet.json");
  const r = await fund(["--amount", "50", "--mint", mint.url, "--out", out], { pay: true });
  assert.equal(r.code, 0, r.stderr);
  const lines = r.stdout.trim().split("\n");
  assert.equal(lines.length, 2, "stdout is two lines");
  assert.equal(lines[0], "amount: 50 sat");
  const inv = /^invoice: (ln\S+)$/.exec(lines[1]);
  assert.ok(inv, "second line is the invoice");
  assert.equal(decodeBolt11(inv[1]).amountMsat, 50_000);
  assert.equal(statSync(out).mode & 0o777, 0o600);
  const w = wallet(out);
  assert.equal(w.mint, mint.url);
  assert.equal(w.unit, "sat");
  assert.equal(w.proofs.reduce((n, p) => n + p.amount, 0), 50);
  for (const p of w.proofs) {
    assert.match(p.secret, /^[0-9a-f]{64}$/);
    assert.match(p.C, /^0[23][0-9a-f]{64}$/);
    assert.equal(p.id, mint.keysetId);
  }
  noSecrets(r, out);
  assert.equal(existsSync(out + ".pending"), false, "pending file removed after mint");
});

test("fund: a second run adds to the same file and keeps it 0600, even under umask 000", async () => {
  const out = join(dir, "merge.json");
  const a = await fund(["--amount", "5", "--mint", mint.url, "--out", out], { pay: true, shell: "umask 000" });
  assert.equal(a.code, 0, a.stderr);
  assert.equal(statSync(out).mode & 0o777, 0o600);
  const b = await fund(["--amount", "7", "--mint", mint.url], { pay: true, shell: "umask 000", env: { ATTACKFEE_CASHU_SOURCE: out } });
  assert.equal(b.code, 0, b.stderr);
  assert.equal(statSync(out).mode & 0o777, 0o600);
  assert.equal(wallet(out).proofs.reduce((n, p) => n + p.amount, 0), 12);
  noSecrets(a, out);
  noSecrets(b, out);
});

test("fund: refuses a wallet file readable by others and leaves it untouched", async () => {
  const out = join(dir, "open.json");
  writeFileSync(out, JSON.stringify({ mint: mint.url, unit: "sat", proofs: [] }));
  chmodSync(out, 0o644);
  const before = readFileSync(out, "utf8");
  const posts = mint.quotePosts();
  const r = await fund(["--amount", "5", "--mint", mint.url, "--out", out]);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /0600/);
  assert.equal(readFileSync(out, "utf8"), before);
  assert.equal(mint.quotePosts(), posts);
});

test("fund: an invoice for a different amount is refused and never printed", async () => {
  const out = join(dir, "mismatch.json");
  mint.setInvoiceSats(500);
  try {
    const r = await fund(["--amount", "5", "--mint", mint.url, "--out", out]);
    assert.notEqual(r.code, 0);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /does not match/);
    assert.equal(existsSync(out), false);
  } finally { mint.setInvoiceSats(null); }
});

test("fund: an unpaid quote times out with exit 3, keeps a 0600 pending quote, and --resume mints it once it is paid", async () => {
  const out = join(dir, "unpaid.json");
  const r = await fund(["--amount", "5", "--mint", mint.url, "--out", out, "--timeout", "2"]);
  assert.equal(r.code, 3);
  assert.match(r.stderr, /not paid/);
  assert.match(r.stderr, /--resume/);
  const inv = /^invoice: (\S+)$/m.exec(r.stdout);
  assert.ok(inv);
  assert.equal(existsSync(out), false, "no proof file until something is minted");
  assert.equal(statSync(out + ".pending").mode & 0o777, 0o600);
  const blocked = await fund(["--amount", "5", "--mint", mint.url, "--out", out]);
  assert.notEqual(blocked.code, 0, "a new quote is refused while one is pending");
  assert.equal(blocked.stdout, "");
  // Paid late: --resume mints the same quote.
  const pr = await fetch(mint.url + "/test/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: inv[1] }) });
  await pr.text();
  assert.equal(pr.status, 200);
  const done = await fund(["--resume", "--out", out]);
  assert.equal(done.code, 0, done.stderr);
  assert.equal(done.stdout, "");
  assert.equal(wallet(out).proofs.reduce((n, p) => n + p.amount, 0), 5);
  assert.equal(existsSync(out + ".pending"), false);
  noSecrets(r, out);
  noSecrets(done, out);
});

test("fund: --resume on a quote that is still unpaid waits, then exits 3 and keeps the pending file", async () => {
  const out = join(dir, "still-unpaid.json");
  const r = await fund(["--amount", "3", "--mint", mint.url, "--out", out, "--timeout", "1"]);
  assert.equal(r.code, 3);
  const again = await fund(["--resume", "--out", out, "--timeout", "1"]);
  assert.equal(again.code, 3);
  assert.equal(existsSync(out + ".pending"), true);
  assert.equal(existsSync(out), false);
});

test("fund: a mint error after payment is retried with the same outputs and still lands once", async () => {
  const out = join(dir, "retry.json");
  mint.failNextMints(2);
  const r = await fund(["--amount", "9", "--mint", mint.url, "--out", out], { pay: true });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(wallet(out).proofs.reduce((n, p) => n + p.amount, 0), 9);
  assert.equal(statSync(out).mode & 0o777, 0o600);
  noSecrets(r, out);
});

test("fund: when minting keeps failing, a 0600 pending file is kept and --resume finishes it", async () => {
  const out = join(dir, "resume.json");
  mint.failNextMints(10);
  const r = await fund(["--amount", "4", "--mint", mint.url, "--out", out], { pay: true });
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /--resume/);
  assert.equal(existsSync(out + ".pending"), true);
  assert.equal(statSync(out + ".pending").mode & 0o777, 0o600);
  assert.ok(!(r.stdout + r.stderr).includes(JSON.parse(readFileSync(out + ".pending", "utf8")).outputs[0].secret));
  const blocked = await fund(["--amount", "4", "--mint", mint.url, "--out", out]);
  assert.notEqual(blocked.code, 0, "a new quote is refused while one is pending");
  assert.match(blocked.stderr, /--resume/);
  mint.failNextMints(0);
  const done = await fund(["--resume", "--out", out]);
  assert.equal(done.code, 0, done.stderr);
  assert.equal(done.stdout, "");
  assert.equal(wallet(out).proofs.reduce((n, p) => n + p.amount, 0), 4);
  assert.equal(existsSync(out + ".pending"), false);
  noSecrets(done, out);
});

test("fund: --split 10 mints 50 as five groups that each add up to 10, so a 10 offer needs no swap", async () => {
  const out = join(dir, "split.json");
  const r = await fund(["--amount", "50", "--split", "10", "--mint", mint.url, "--out", out], { pay: true });
  assert.equal(r.code, 0, r.stderr);
  const amounts = wallet(out).proofs.map((p) => p.amount).sort((a, b) => a - b);
  assert.deepEqual(amounts, [2, 2, 2, 2, 2, 8, 8, 8, 8, 8]);
  const bad = await fund(["--amount", "5", "--split", "0", "--mint", mint.url, "--out", join(dir, "split-bad.json")]);
  assert.notEqual(bad.code, 0);
});
