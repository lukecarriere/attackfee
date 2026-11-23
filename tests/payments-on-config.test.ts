// Production wrangler.toml is the payments-on config. Applying those vars
// (mint allowlist + L402) must 402 an agent write with a 10-sat Cashu request
// and an L402 invoice. Tests proxy the allowlisted mint to a loopback test
// mint: no real mint is contacted and no sats are spent.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { decodeBolt11, startKeysetMint } from "../packages/settlement-ln/src/index.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MINIBITS = "https://mint.minibits.cash/Bitcoin";
const TOML = readFileSync(join(ROOT, "wrangler.toml"), "utf8");

function uncommented(toml: string): string[] {
  return toml.split("\n").map((line) => line.trimEnd()).filter((line) => !/^\s*#/.test(line) && line.trim() !== "");
}

/** Top-level [vars] only; later [env.*] tables are ignored. */
function topLevelVars(toml: string): Record<string, string> {
  const out: Record<string, string> = {};
  let section = "";
  for (const raw of uncommented(toml)) {
    const sec = /^\[([^\]]+)\]$/.exec(raw.trim());
    if (sec) {
      section = sec[1];
      continue;
    }
    if (section !== "vars") continue;
    const m = /^([A-Z][A-Z0-9_]*)\s*=\s*(.+)$/.exec(raw.trim());
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function parseMintList(raw: string | undefined): string[] {
  if (!raw) return [];
  const unquoted = raw.replace(/^'/, "").replace(/'$/, "").replace(/^"/, "").replace(/"$/, "");
  const parsed: unknown = JSON.parse(unquoted);
  assert.ok(Array.isArray(parsed) && parsed.every((x) => typeof x === "string"), "CASHU_MINTS must be a JSON array of strings");
  return parsed as string[];
}

const vars = topLevelVars(TOML);
const mints = parseMintList(vars.CASHU_MINTS);
const l402 = vars.L402_ENABLED;

test("production wrangler.toml is payments-on: Minibits mint only, L402 on, no payout target", () => {
  assert.deepEqual(mints, [MINIBITS], "production must allowlist only the Minibits mint");
  assert.equal(l402, '"1"', "production must enable L402");
  const active = uncommented(TOML).join("\n");
  assert.equal(/^\s*NWC(_URL)?\s*=/m.test(active), false, "production must not set NWC");
  assert.doesNotMatch(active, /lightning\s*address|lnaddress|LN_ADDRESS|WITHDRAW_|PAYOUT_|NWC/i);
  assert.equal(/SITE_SECRET\s*=/.test(active), false, "SITE_SECRET must not be committed");
});

let wr: ChildProcess | undefined;
let base = "";
let mint: Awaited<ReturnType<typeof startKeysetMint>> | undefined;

async function read(res: Response): Promise<{ status: number; headers: Headers; body: Record<string, unknown> }> {
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch { body = {}; }
  return { status: res.status, headers: res.headers, body };
}

before(async () => {
  // Boot only after the config is payments-on; otherwise the test already failed above.
  if (l402 !== '"1"' || mints.length !== 1) return;
  execFileSync(process.execPath, [join(ROOT, "packages/edge-cf/build.mjs")], { cwd: ROOT });
  mint = await startKeysetMint({ quotes: true });
  writeFileSync(join(ROOT, ".dev.vars"), `SITE_SECRET="payments-on-config-test-secret-0001"\nATTACKFEE_TEST_HOOKS=1\nCASHU_MINTS=${JSON.stringify(mints)}\nL402_ENABLED=1\nCASHU_FETCH_PROXY="${mint.url}"\n`, { mode: 0o600 });
  const free = await new Promise<number>((r) => {
    const t = createServer().listen(0, "127.0.0.1", () => {
      const p = (t.address() as AddressInfo).port;
      t.close(() => r(p));
    });
  });
  const persist = mkdtempSync(join(tmpdir(), "attackfee-payments-on-"));
  wr = spawn(join(ROOT, "node_modules/.bin/wrangler"), ["dev", "--local", "--ip", "127.0.0.1", "--port", String(free), "--persist-to", persist, "--show-interactive-dev-session=false"], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("wrangler dev did not start:\n" + log)), 90_000);
    const on = (c: Buffer) => {
      log += c.toString();
      if (/Ready on http/.test(log)) {
        clearTimeout(t);
        resolve();
      }
    };
    wr!.stdout!.on("data", on);
    wr!.stderr!.on("data", on);
    wr!.on("exit", (code) => {
      clearTimeout(t);
      reject(new Error("wrangler dev exited " + code + "\n" + log));
    });
  });
  wr.removeAllListeners("exit");
  base = `http://127.0.0.1:${free}`;
});

after(async () => {
  wr?.kill("SIGTERM");
  rmSync(join(ROOT, ".dev.vars"), { force: true });
  await mint?.close();
});

test("that payments-on config 402s an agent write with a 10-sat Cashu request and an L402 invoice", async () => {
  assert.deepEqual(mints, [MINIBITS]);
  assert.equal(l402, '"1"');
  assert.ok(base, "worker should have started under the production payments-on vars");
  const denied = await read(await fetch(base + "/demo/contact", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "attackfee-client": "agent" },
    body: "{}",
  }));
  assert.equal(denied.status, 402, JSON.stringify(denied.body));
  assert.equal(denied.body.error, "payment_required");
  assert.ok(String(denied.headers.get("x-cashu") || "").startsWith("creqA"), "X-Cashu must be a NUT-18 request");
  const offers = denied.body.offers as { kind: string; mint?: string; amount?: number; amount_msat?: number; invoice?: string }[];
  assert.ok(Array.isArray(offers) && offers.length >= 2, JSON.stringify(denied.body));
  assert.equal(offers[0].kind, "cashu");
  assert.equal(offers[0].mint, mints[0]);
  assert.equal(offers[0].amount, 10);
  assert.equal(offers[1].kind, "l402");
  assert.equal(offers[1].amount_msat, 10000);
  const www = denied.headers.get("www-authenticate") ?? "";
  const m = /^L402 macaroon="([^"]+)", invoice="([^"]+)"$/.exec(www);
  assert.ok(m, www);
  const decoded = decodeBolt11(m[2]);
  assert.equal(decoded.amountMsat, 10000);
  assert.equal(decoded.amountMsat, offers[1].amount_msat);
});
