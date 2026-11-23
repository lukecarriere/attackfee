// Edge end-to-end payment check (CI job `edge-e2e`). Runs the built Worker under
// `wrangler dev --local` against the loopback keyset mint and walks one paid write through:
// 402 offers -> Cashu payment (examples/agent-pay-402/fund.mjs funds a wallet file from a test-mint
// quote, examples/agent-pay-402/pay.mjs pays from it) -> write 200 -> daily counters -> owner balance
// -> owner withdraw -> replay refused. Every step is a hard assert. Steps for routes that are not built yet can be
// marked expected-fail with --xfail R1,R2 (owner balance, owner withdraw); an expected-fail step
// that passes fails the run so the flag is removed when those routes land.
//
// Test mint only: no real mint, no real sats. SITE_SECRET and OWNER_KEY are random per run,
// written to a mode-0600 .dev.vars, never printed, and the file is deleted at the end.
//
//   npm run build && node scripts/edge-e2e.mjs [--xfail R1,R2] [--port 8800] [--log file]
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
/** The allow-listed mint in wrangler.toml. CASHU_FETCH_PROXY sends its calls to the loopback mint. */
const LISTED_MINT = "https://mint.minibits.cash/Bitcoin";
const WRITE_SATS = 10;
const WRITE_PATH = "/demo/contact";
const WITHDRAW_SATS = 5;

/** R5 steps in spec order. `req` names the requirement whose code makes the step pass. */
export const STEPS = [
  { id: "offer_both", req: "R5", what: "agent write gets a 402 with a cashu and an l402 offer" },
  { id: "pay_cashu", req: "R4", what: "fund.mjs mints 10 from a test-mint quote into a 0600 wallet file; pay.mjs --mode cashu pays the 10 sat offer and redeems a pass" },
  { id: "write_200", req: "R5", what: "pay.mjs re-sends the write with Authorization: Attackfee <pass> and gets 200" },
  { id: "daily_counts", req: "R5", what: "/demo/stats/daily last row paid_writes 1, sats_settled 10 (no test header)" },
  { id: "owner_balance", req: "R1", what: "/v1/owner/balance: 401 without the key, available_msat 10000 minus swap fee with it" },
  { id: "owner_withdraw", req: "R2", what: "POST /v1/owner/withdraw with a test-mint invoice: balance down, withdrawn_msat up" },
  { id: "replay_refused", req: "R5", what: "the same token again is refused 401 and the counters do not move" },
];

const XFAIL_OK = new Set(["R1", "R2"]);

/** "R1,R2" -> the step ids allowed to fail. Only R1/R2 steps may be expected-fail. */
export function parseXfail(value) {
  const out = new Set();
  for (const raw of String(value || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!XFAIL_OK.has(raw)) throw new Error(`expected-fail is only allowed for R1 and R2, not ${raw}`);
    for (const step of STEPS) if (step.req === raw) out.add(step.id);
  }
  return out;
}

/** A fresh .dev.vars body. Values are random per call and are returned only to this process. */
export function devVars(mintUrl) {
  const siteSecret = randomBytes(32).toString("hex");
  const ownerKey = randomBytes(32).toString("hex");
  const text = [`SITE_SECRET="${siteSecret}"`, `OWNER_KEY="${ownerKey}"`, "ATTACKFEE_TEST_HOOKS=1", `CASHU_FETCH_PROXY="${mintUrl}"`, ""].join("\n");
  return { text, siteSecret, ownerKey };
}

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  return fallback;
}

async function main() {
  const port = Number(arg("--port", process.env.EDGE_E2E_PORT || "8800"));
  const logFile = arg("--log", "");
  const xfail = parseXfail(arg("--xfail", process.env.EDGE_E2E_XFAIL || ""));
  const base = `http://127.0.0.1:${port}`;
  const devVarsPath = path.join(ROOT, ".dev.vars");
  const log = (line) => {
    console.log(line);
    if (logFile) appendFileSync(logFile, line + "\n");
  };
  if (existsSync(devVarsPath)) {
    console.error(".dev.vars already exists; move it away first (this script writes and deletes its own)");
    process.exit(64);
  }
  const { startKeysetMint } = await import(pathToFileURL(path.join(ROOT, "packages/settlement-ln/src/keyset-mint.ts")).href);
  const { decodeTokenV4, encodeTokenV4 } = await import(pathToFileURL(path.join(ROOT, "packages/settlement-ln/src/cashu.ts")).href);
  const { encodeBolt11 } = await import(pathToFileURL(path.join(ROOT, "packages/settlement-ln/src/bolt11.ts")).href);
  const { fromHex } = await import(pathToFileURL(path.join(ROOT, "packages/protocol/src/bytes.ts")).href);
  const EXAMPLE = path.join(ROOT, "examples/agent-pay-402");

  /** Run an example script. The proxy env sends its mint calls to the loopback mint. `onOut` sees stdout so far. */
  const runExample = (script, args, env, onOut) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(EXAMPLE, script), ...args], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(script + " timed out")); }, 120_000);
    child.stdout.on("data", (c) => { stdout += c.toString(); onOut?.(stdout); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("exit", (code) => { clearTimeout(t); resolve({ code, stdout, stderr }); });
  });

  const results = [];
  let current = 0;
  let hardFail = false;
  /** Run one step. A thrown Error or a false return is a failure. */
  async function step(id, fn) {
    const def = STEPS.find((s) => s.id === id);
    if (STEPS.indexOf(def) !== current) throw new Error("step order: " + id);
    current++;
    if (hardFail) {
      results.push({ id, status: "NOT_RUN" });
      log(`NOT_RUN  ${id} [${def.req}]  an earlier hard assert failed`);
      return;
    }
    let ok = false;
    let detail = "";
    try {
      const r = await fn();
      ok = r.ok;
      detail = r.detail ?? "";
    } catch (e) {
      detail = "error: " + (e instanceof Error ? e.message : String(e));
    }
    const expected = xfail.has(id);
    const status = ok ? (expected ? "XPASS" : "PASS") : expected ? "XFAIL" : "FAIL";
    if (status === "FAIL") hardFail = true;
    results.push({ id, status });
    const label = status === "XFAIL" ? "XFAIL (expected-fail until " + def.req + " lands)" : status === "XPASS" ? "XPASS (passed but marked expected-fail: drop " + def.req + " from --xfail)" : status;
    log(`${label}  ${id} [${def.req}] ${def.what}${detail ? "  | " + detail : ""}`);
  }

  const agentHeaders = { accept: "application/json", "content-type": "application/json", "attackfee-client": "agent" };
  const jsonOf = async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { rawLength: text.length }; }
  };
  const lastDay = async () => {
    const res = await fetch(base + "/demo/stats/daily?days=1");
    const body = await jsonOf(res);
    if (res.status !== 200 || !Array.isArray(body.days) || body.days.length < 1) throw new Error("daily status " + res.status);
    return body.days[body.days.length - 1];
  };

  const persist = mkdtempSync(path.join(tmpdir(), "edge-e2e-"));
  let mint;
  let wr;
  try {
    mint = await startKeysetMint({ quotes: true });
    const vars = devVars(mint.url);
    writeFileSync(devVarsPath, vars.text, { mode: 0o600 });
    const ownerAuth = { authorization: "Bearer " + vars.ownerKey };
    log(`edge-e2e: wrote .dev.vars (mode 0600, SITE_SECRET and OWNER_KEY random, not printed); loopback mint; port ${port}`);
    if (xfail.size) log(`edge-e2e: expected-fail steps: ${[...xfail].join(", ")}`);

    wr = spawn(path.join(ROOT, "node_modules/.bin/wrangler"), ["dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", persist, "--show-interactive-dev-session=false"], {
      cwd: ROOT,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let boot = "";
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("wrangler dev did not start")), 120_000);
      const on = (c) => {
        boot += c.toString();
        if (/Ready on http/.test(boot)) { clearTimeout(t); resolve(); }
      };
      wr.stdout.on("data", on);
      wr.stderr.on("data", on);
      wr.on("exit", (code) => { clearTimeout(t); reject(new Error("wrangler dev exited " + code)); });
    });
    wr.removeAllListeners("exit");
    log("edge-e2e: wrangler dev ready on " + base);

    await step("offer_both", async () => {
      const res = await fetch(base + WRITE_PATH, { method: "POST", headers: agentHeaders, body: "{}" });
      const body = await jsonOf(res);
      const kinds = Array.isArray(body.offers) ? body.offers.map((o) => o.kind) : [];
      const cashu = body.offers?.find((o) => o.kind === "cashu");
      const ok = res.status === 402 && body.error === "payment_required" && kinds.includes("cashu") && kinds.includes("l402") && cashu?.amount === WRITE_SATS && cashu?.mint === LISTED_MINT;
      return { ok, detail: `http ${res.status} offers [${kinds.join(",")}] cashu amount ${cashu?.amount ?? "-"}` };
    });

    // fund.mjs asks the (proxied) allow-listed mint for a quote, the loopback mint's /test/pay stands in
    // for the Lightning payer, and the proofs land in a 0600 wallet file. pay.mjs pays the 402 from it.
    // No test header: the real counters move. Proof values never reach this log.
    const walletPath = path.join(persist, "wallet.json");
    const exampleEnv = { ATTACKFEE_MINT_PROXY: mint.url, ATTACKFEE_CASHU_SOURCE: walletPath };
    let token = "";
    let payRun = null;
    await step("pay_cashu", async () => {
      let paidInvoice = false;
      const fund = await runExample("fund.mjs", ["--amount", String(WRITE_SATS), "--mint", LISTED_MINT, "--out", walletPath], exampleEnv, (out) => {
        const m = /^invoice: (\S+)$/m.exec(out);
        if (m && !paidInvoice) {
          paidInvoice = true;
          void fetch(mint.url + "/test/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: m[1] }) }).then((r) => r.text());
        }
      });
      if (fund.code !== 0) return { ok: false, detail: `fund.mjs exit ${fund.code}` };
      const mode = statSync(walletPath).mode & 0o777;
      const wallet = JSON.parse(readFileSync(walletPath, "utf8"));
      const held = wallet.proofs.reduce((n, p) => n + p.amount, 0);
      // An exact amount is sent as it is held, so these proofs are the token the replay step re-sends.
      token = encodeTokenV4({ mint: LISTED_MINT, unit: "sat", proofs: wallet.proofs.map((p) => ({ amount: p.amount, secret: p.secret, id: fromHex(p.id), C: fromHex(p.C) })) });
      const secrets = wallet.proofs.flatMap((p) => [p.secret, p.C]);
      payRun = await runExample("pay.mjs", ["--base", base, "--path", WRITE_PATH, "--mode", "cashu", "--max-amount", String(WRITE_SATS * 1000)], exampleEnv);
      const printed = payRun.stdout + payRun.stderr + fund.stdout + fund.stderr;
      const quiet = !/cashu[AB][A-Za-z0-9_-]{8}/.test(printed) && secrets.every((x) => !printed.includes(x));
      const left = JSON.parse(readFileSync(walletPath, "utf8")).proofs.reduce((n, p) => n + p.amount, 0);
      const ok = mode === 0o600 && held === WRITE_SATS && payRun.code === 0 && /^redeemed: /m.test(payRun.stdout) && left === 0 && quiet;
      return { ok, detail: `fund exit ${fund.code} wallet mode ${mode.toString(8)} held ${held}; pay.mjs exit ${payRun.code} left ${left}; secrets printed ${quiet ? "none" : "YES"}` };
    });

    await step("write_200", async () => {
      const m = /^write: (\d+)/m.exec(payRun?.stdout ?? "");
      return { ok: m?.[1] === "200", detail: `http ${m?.[1] ?? "-"}` };
    });

    let afterPay = null;
    await step("daily_counts", async () => {
      afterPay = await lastDay();
      const ok = afterPay.paid_writes === 1 && afterPay.sats_settled === WRITE_SATS;
      return { ok, detail: `paid_writes ${afterPay.paid_writes} sats_settled ${afterPay.sats_settled} test_paid_writes ${afterPay.test_paid_writes}` };
    });

    const R1_FIELDS = ["available_msat", "available_usd", "pending_msat", "losses_msat", "withdrawn_msat", "paid_requests", "mint", "degraded"];
    const balance = async () => {
      const res = await fetch(base + "/v1/owner/balance", { headers: { accept: "application/json", ...ownerAuth } });
      return { status: res.status, body: await jsonOf(res) };
    };
    await step("owner_balance", async () => {
      const none = await fetch(base + "/v1/owner/balance", { headers: { accept: "application/json" } });
      await none.text();
      const wrong = await fetch(base + "/v1/owner/balance", { headers: { accept: "application/json", authorization: "Bearer " + "0".repeat(64) } });
      await wrong.text();
      const b = await balance();
      const swapFeeMsat = 0; // the loopback keyset charges input_fee_ppk 0
      const fields = R1_FIELDS.every((k) => k in b.body);
      const ok = none.status === 401 && wrong.status === 401 && b.status === 200 && fields && b.body.available_msat === WRITE_SATS * 1000 - swapFeeMsat;
      return { ok, detail: `no key ${none.status}, wrong key ${wrong.status}, with key ${b.status}, R1 fields ${fields ? "all" : "missing"}, available_msat ${b.body.available_msat ?? "-"}` };
    });

    await step("owner_withdraw", async () => {
      const before = await balance();
      const invoice = encodeBolt11({ amountMsat: WITHDRAW_SATS * 1000, paymentHash: randomBytes(32).toString("hex") });
      const res = await fetch(base + "/v1/owner/withdraw", { method: "POST", headers: { "content-type": "application/json", accept: "application/json", ...ownerAuth }, body: JSON.stringify({ invoice }) });
      const body = await jsonOf(res);
      const after = await balance();
      const fee = body.fee_msat;
      const ok = res.status === 200
        && before.status === 200 && after.status === 200
        && Number.isSafeInteger(fee) && fee >= 0
        && after.body.available_msat === before.body.available_msat - WITHDRAW_SATS * 1000 - fee
        && after.body.withdrawn_msat > before.body.withdrawn_msat
        && mint.meltsPaid().length === 1 && mint.meltsPaid()[0] === invoice;
      return { ok, detail: `http ${res.status} available ${before.body.available_msat ?? "-"} -> ${after.body.available_msat ?? "-"} withdrawn ${before.body.withdrawn_msat ?? "-"} -> ${after.body.withdrawn_msat ?? "-"} fee_msat ${fee ?? "-"} mint melts ${mint.meltsPaid().length}` };
    });

    await step("replay_refused", async () => {
      const before = await lastDay();
      const res = await fetch(base + WRITE_PATH, { method: "POST", headers: { ...agentHeaders, "x-cashu": token }, body: "{}" });
      const body = await jsonOf(res);
      const after = await lastDay();
      const ok = res.status === 401 && body.pass === undefined && after.paid_writes === before.paid_writes && after.sats_settled === before.sats_settled;
      return { ok, detail: `http ${res.status} error ${body.error ?? "-"} paid_writes ${before.paid_writes} -> ${after.paid_writes} sats_settled ${before.sats_settled} -> ${after.sats_settled}` };
    });
  } catch (e) {
    hardFail = true;
    log("edge-e2e: ERROR " + (e instanceof Error ? e.message : String(e)));
  } finally {
    try { wr?.kill("SIGTERM"); } catch { /* already gone */ }
    try { await mint?.close(); } catch { /* already closed */ }
    try { rmSync(devVarsPath, { force: true }); log("edge-e2e: deleted .dev.vars"); } catch { log("edge-e2e: could not delete .dev.vars"); }
    try { rmSync(persist, { recursive: true, force: true }); } catch { /* temp dir */ }
  }
  const count = (s) => results.filter((r) => r.status === s).length;
  const bad = results.length !== STEPS.length || count("FAIL") + count("XPASS") + count("NOT_RUN") > 0 || hardFail;
  log(`SUMMARY ${count("PASS")} pass, ${count("XFAIL")} expected-fail, ${count("XPASS")} unexpected-pass, ${count("FAIL")} fail, ${count("NOT_RUN")} not run, ${STEPS.length} steps`);
  log(`OVERALL: ${bad ? "FAIL" : "PASS"}`);
  process.exit(bad ? 1 : 0);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "edge-e2e failed");
    process.exit(1);
  });
}
