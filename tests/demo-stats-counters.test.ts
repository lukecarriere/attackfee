// GET /demo/stats/daily counters: paid_writes, free_writes, sats_settled, offers_402.
// Acceptance checks from the CoS-approved PM spec (Attackfee only). No real mint and no real money.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import { doStorage } from "./do-harness.ts";
import type { SiteEnv } from "../packages/edge-cf/src/site.ts";
import type { AttackfeeDoStub, AttackfeeStoreDO } from "../packages/edge-cf/src/do-store.ts";
import { solveWork } from "../packages/work-adapter/src/index.ts";
import { decodeTokenV4, encodeTokenV4 } from "../packages/settlement-ln/src/cashu.ts";
import { startKeysetMint } from "../packages/settlement-ln/src/keyset-mint.ts";

registerHooks({
  load(url, context, next) {
    if (/\/widget\/dist\/attackfee(?:\.worker)?\.js$/.test(url)) {
      return { format: "module", shortCircuit: true, source: "export default " + JSON.stringify(readFileSync(new URL(url), "utf8")) };
    }
    return next(url, context);
  },
});

const { default: site } = await import("../packages/edge-cf/src/site.ts");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MINT = "https://mint.minibits.cash/Bitcoin";
const OLD_DAILY_KEYS = ["accepted", "date", "rejected", "test_accepted", "test_rejected"] as const;
const NEW_DAILY_KEYS = ["paid_writes", "free_writes", "sats_settled", "offers_402", "test_paid_writes", "test_free_writes", "test_sats_settled", "test_offers_402"] as const;
const STATS_KEYS = ["accepted", "rejected", "reversals", "reversed_sats"];
const WRITE = 10; // whole sats for a write, matching the gate's 10000 msat price

let mint: Awaited<ReturnType<typeof startKeysetMint>>;

function utcDay(offset = 0, from = new Date().toISOString().slice(0, 10)): string {
  return new Date(Date.parse(from + "T00:00:00Z") + offset * 86400000).toISOString().slice(0, 10);
}

function asStub(store: AttackfeeStoreDO): AttackfeeDoStub {
  return new Proxy(store, {
    get(target, prop, recv) {
      const val = Reflect.get(target, prop, recv);
      if (typeof val === "function") {
        return (...args: unknown[]) => Promise.resolve((val as (...a: unknown[]) => unknown).apply(target, args));
      }
      return val;
    },
  }) as unknown as AttackfeeDoStub;
}

function siteEnv(storage = doStorage(), extra: Record<string, string> = {}) {
  const store = storage.open(extra);
  const env = {
    ASSETS: { fetch: async () => new Response("asset", { status: 200, headers: { "content-type": "text/plain" } }) },
    ATTACKFEE_STORE: { idFromName: () => "attackfee", get: () => asStub(store) },
    SITE_SECRET: "a".repeat(32),
    SITE_ID: "site_demo",
    WRITE_PATHS: JSON.stringify(["/demo/contact"]),
    ATTACKFEE_SITE_URL: "https://example.invalid",
    ATTACKFEE_TEST_HOOKS: "1",
    CASHU_MINTS: JSON.stringify([MINT]),
    CASHU_FETCH_PROXY: mint.url,
    ...extra,
  } as unknown as SiteEnv;
  return { storage, store, env };
}

function call(env: SiteEnv, path: string, init: RequestInit = {}) {
  return site.fetch(new Request("https://example.invalid" + path, init), env);
}

async function jsonOf(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

async function today(env: SiteEnv): Promise<Record<string, unknown>> {
  const res = await call(env, "/demo/stats/daily?days=1");
  assert.equal(res.status, 200, await res.clone().text());
  const days = (await jsonOf(res)).days as Record<string, unknown>[];
  assert.equal(days.length, 1);
  return days[0];
}

function retarget(token: string, mintUrl: string): string {
  const decoded = decodeTokenV4(token);
  return encodeTokenV4({ mint: mintUrl, unit: decoded.unit, proofs: decoded.proofs });
}

function agentHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { accept: "application/json", "content-type": "application/json", "attackfee-client": "agent", ...extra };
}

function postContact(env: SiteEnv, headers: Record<string, string>) {
  return call(env, "/demo/contact", { method: "POST", headers, body: "{}" });
}

async function workPass(env: SiteEnv, test = false): Promise<string> {
  const issued = await call(env, "/v1/challenge?action=write&path=" + encodeURIComponent("/demo/contact") + "&offers=0", {
    headers: test ? { "attackfee-test": "1" } : {},
  });
  const body = await jsonOf(issued);
  const challenge = body.challenge as { id: string; work: unknown };
  assert.ok(challenge?.id, "challenge issued: " + JSON.stringify(body));
  const s = await solveWork(challenge.work as Parameters<typeof solveWork>[0]);
  assert.ok(s, "work solved");
  const redeem = await call(env, "/v1/redeem", {
    method: "POST",
    headers: { "content-type": "application/json", ...(test ? { "attackfee-test": "1" } : {}) },
    body: JSON.stringify({
      challenge_id: challenge.id,
      challenge,
      solution: { work: { counter: s.counter, derivedKey: s.derivedKey }, took_ms: 1 },
    }),
  });
  const out = await jsonOf(redeem);
  assert.equal(redeem.status, 200, JSON.stringify(out));
  assert.equal(out.rail, "work");
  assert.equal(typeof out.pass, "string");
  return out.pass as string;
}

function oldShape(day: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of OLD_DAILY_KEYS) out[k] = day[k];
  return out;
}

before(async () => {
  mint = await startKeysetMint();
});

after(async () => {
  await mint?.close();
});

test("check 1: one verified paid write of N sats increases paid_writes by 1 and sats_settled by N; a free write increases only free_writes", async () => {
  const { env } = siteEnv();
  const offer = await postContact(env, agentHeaders());
  assert.equal(offer.status, 402, await offer.clone().text());
  const token = retarget(mint.token(WRITE), MINT);
  const paid = await postContact(env, agentHeaders({ "x-cashu": token }));
  const paidBody = await jsonOf(paid);
  assert.equal(paid.status, 200, JSON.stringify(paidBody));
  assert.equal(paidBody.rail, "settle");
  const used = await postContact(env, agentHeaders({ authorization: "Attackfee " + paidBody.pass }));
  assert.equal(used.status, 200, await used.clone().text());

  const afterPaid = await today(env);
  assert.equal(afterPaid.paid_writes, 1);
  assert.equal(afterPaid.sats_settled, WRITE);
  assert.equal(afterPaid.free_writes, 0);
  assert.equal(afterPaid.accepted, 1, "using the paid pass still increments accepted");

  const pass = await workPass(env);
  const free = await postContact(env, { accept: "application/json", "content-type": "application/json", authorization: "Attackfee " + pass });
  assert.equal(free.status, 200, await free.clone().text());
  const afterFree = await today(env);
  assert.equal(afterFree.paid_writes, 1, "a free write does not change paid_writes");
  assert.equal(afterFree.sats_settled, WRITE, "a free write does not change sats_settled");
  assert.equal(afterFree.free_writes, 1);
  assert.equal(afterFree.accepted, 2);
});

test("check 2: a 402 offer increases offers_402; a failed or replayed token increases neither paid_writes nor sats_settled", async () => {
  const { env } = siteEnv();
  const offer = await postContact(env, agentHeaders());
  assert.equal(offer.status, 402);
  const afterOffer = await today(env);
  assert.equal(afterOffer.offers_402, 1);
  assert.equal(afterOffer.paid_writes, 0);
  assert.equal(afterOffer.sats_settled, 0);

  const bad = await postContact(env, agentHeaders({ "x-cashu": "cashuAnot-a-token" }));
  assert.ok(bad.status >= 400, "a bad token is refused: " + bad.status);
  const afterBad = await today(env);
  assert.equal(afterBad.paid_writes, 0);
  assert.equal(afterBad.sats_settled, 0);
  assert.equal(afterBad.offers_402, 1, "a failed token does not mint another 402 in this path");

  const token = retarget(mint.token(WRITE), MINT);
  const paid = await postContact(env, agentHeaders({ "x-cashu": token }));
  assert.equal(paid.status, 200, await paid.clone().text());
  const afterPay = await today(env);
  assert.equal(afterPay.paid_writes, 1);
  assert.equal(afterPay.sats_settled, WRITE);

  const replay = await postContact(env, agentHeaders({ "x-cashu": token }));
  assert.ok(replay.status >= 400, "replay is refused: " + replay.status + " " + await replay.clone().text());
  const afterReplay = await today(env);
  assert.equal(afterReplay.paid_writes, 1, "a replayed token increments nothing");
  assert.equal(afterReplay.sats_settled, WRITE);
});

test("check 3: attackfee-test: 1 is counted separately from real traffic", async () => {
  const { env } = siteEnv();
  const realOffer = await postContact(env, agentHeaders());
  assert.equal(realOffer.status, 402);
  const testOffer = await postContact(env, agentHeaders({ "attackfee-test": "1" }));
  assert.equal(testOffer.status, 402);

  const realTok = retarget(mint.token(WRITE), MINT);
  const testTok = retarget(mint.token(WRITE), MINT);
  const realPay = await postContact(env, agentHeaders({ "x-cashu": realTok }));
  const testPay = await postContact(env, agentHeaders({ "x-cashu": testTok, "attackfee-test": "1" }));
  assert.equal(realPay.status, 200, await realPay.clone().text());
  assert.equal(testPay.status, 200, await testPay.clone().text());

  const realPass = await workPass(env, false);
  const testPass = await workPass(env, true);
  assert.equal((await postContact(env, { accept: "application/json", "content-type": "application/json", authorization: "Attackfee " + realPass })).status, 200);
  assert.equal((await postContact(env, { accept: "application/json", "content-type": "application/json", authorization: "Attackfee " + testPass, "attackfee-test": "1" })).status, 200);

  const day = await today(env);
  assert.equal(day.offers_402, 1);
  assert.equal(day.test_offers_402, 1);
  assert.equal(day.paid_writes, 1);
  assert.equal(day.test_paid_writes, 1);
  assert.equal(day.sats_settled, WRITE);
  assert.equal(day.test_sats_settled, WRITE);
  assert.equal(day.free_writes, 1);
  assert.equal(day.test_free_writes, 1);
  assert.equal(day.accepted, 1);
  assert.equal(day.test_accepted, 1);
});

test("check 4: the last daily row exposes paid_writes, sats_settled and offers_402 as numbers", async () => {
  const { env } = siteEnv();
  const res = await call(env, "/demo/stats/daily");
  const body = await jsonOf(res);
  // The live command in the spec used .[-1]; the envelope is {days:[...]}.
  // A verifier should run: jq '.days[-1] | (.paid_writes, .sats_settled, .offers_402)'
  assert.ok(Array.isArray(body.days), "envelope stays {days: [...]}: " + JSON.stringify(body));
  const days = body.days as Record<string, unknown>[];
  const last = days[days.length - 1];
  assert.equal(last.date, utcDay(0));
  for (const key of ["paid_writes", "sats_settled", "offers_402"] as const) {
    assert.equal(typeof last[key], "number", key + " must be a number, not null");
    assert.equal(Number.isSafeInteger(last[key]), true, key);
    assert.ok((last[key] as number) >= 0, key);
  }
});

test("check 5: old daily keys stay byte-identical in shape and /demo/stats keys are unchanged", async () => {
  const { env } = siteEnv();
  assert.equal((await postContact(env, { accept: "application/json", "content-type": "application/json" })).status, 403);
  const dayRes = await call(env, "/demo/stats/daily?days=1");
  const day = ((await jsonOf(dayRes)).days as Record<string, unknown>[])[0];
  for (const k of OLD_DAILY_KEYS) assert.ok(k in day, "old key present: " + k);
  const projected = JSON.stringify(oldShape(day));
  assert.equal(projected, JSON.stringify({ accepted: 0, date: utcDay(0), rejected: 1, test_accepted: 0, test_rejected: 0 }));
  for (const k of NEW_DAILY_KEYS) {
    assert.equal(typeof day[k], "number", "additive key " + k);
  }
  const ident = ["ip", "ua", "user_agent", "token", "pass", "hash", "payer", "authorization", "cookie"];
  for (const k of ident) assert.equal(k in day, false, "no personal data key: " + k);

  const stats = await jsonOf(await call(env, "/demo/stats"));
  assert.deepEqual(Object.keys(stats).sort(), [...STATS_KEYS].sort());
});

test("check 6: /privacy has one plain sentence describing the new counts", () => {
  const src = readFileSync(join(ROOT, "website/privacy.md"), "utf8");
  assert.match(src, /paid writes/i);
  assert.match(src, /free writes/i);
  assert.match(src, /402/);
  assert.match(src, /settled/i);
  assert.match(src, /no personal data/i);
});

test("check 7: live-checks default path makes no paid or real-sat calls", () => {
  const live = readFileSync(join(ROOT, "scripts/live-checks.mjs"), "utf8");
  assert.match(live, /const spend = arg\("--spend"/);
  assert.match(live, /if \(spend !== ""\) \{[\s\S]*?await spendChecks\(/);
  assert.match(live, /spend mode needs --proofs/);
  // Default (non-spend) gate posts mark test traffic and do not send a payment proof.
  const free = live.slice(live.indexOf("export async function freeChecks"), live.indexOf("async function spendChecks"));
  assert.match(free, /"attackfee-test":\s*"1"/);
  // freeChecks may read a 402's x-cashu response header; it must not send a token or preimage.
  assert.equal(/["']x-cashu["']\s*:/i.test(free), false, "default checks do not send a cashu token");
  assert.equal(/["']preimage["']\s*:/i.test(free), false, "default checks do not send a preimage");
  // Spend stays behind an explicit --spend flag; a failed free run never starts it.
  assert.match(live, /free checks failed; spend was not started/);
});

test("daily counters: existing rows read 0 for the new columns after migration", () => {
  const s = doStorage();
  s.db.exec("CREATE TABLE day (d TEXT PRIMARY KEY, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL)");
  s.db.exec("INSERT INTO day (d, accepted, rejected) VALUES ('2026-11-01', 2, 3)");
  s.open();
  for (const col of ["test_accepted", "test_rejected", ...NEW_DAILY_KEYS]) {
    assert.ok(s.columns("day").includes(col), "migrated column " + col);
  }
  assert.doesNotThrow(() => s.open(), "a second start adds nothing");
  const row = s.db.prepare("SELECT * FROM day WHERE d = '2026-11-01'").get() as Record<string, number>;
  assert.equal(row.accepted, 2);
  assert.equal(row.rejected, 3);
  for (const col of NEW_DAILY_KEYS) assert.equal(row[col], 0, col);
});
