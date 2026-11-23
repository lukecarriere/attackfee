// Held-balance ceiling (custody): over_hold on the owner balance and one cashu_hold_alert line per UTC day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { captureLogs, doStorage } from "./do-harness.ts";
import { HOLD_ALERT_DEFAULT_MSAT, holdAlert, holdThreshold } from "../packages/edge-cf/src/hold.ts";
import { ownerRoute } from "../packages/edge-cf/src/owner.ts";
import type { AttackfeeDoStub } from "../packages/edge-cf/src/do-store.ts";

const KEY = "owner-key-for-tests-only-0123456789abcdef";
const MINT = "https://mint.minibits.cash/Bitcoin";

test("hold threshold: default 5,000 sats; an unusable value is the default", () => {
  assert.equal(HOLD_ALERT_DEFAULT_MSAT, 5_000_000);
  assert.equal(holdThreshold(undefined), 5_000_000);
  assert.equal(holdThreshold(""), 5_000_000);
  assert.equal(holdThreshold("abc"), 5_000_000);
  assert.equal(holdThreshold("-1"), 5_000_000);
  assert.equal(holdThreshold("0"), 5_000_000);
  assert.equal(holdThreshold("20000"), 20_000);
});

test("hold alert edge: below is not over, at and above are over; one alert per day", () => {
  const T = 5_000_000;
  assert.deepEqual(holdAlert(T - 1, T, 0, 20261119), { over: false, alert: false }, "below");
  assert.deepEqual(holdAlert(T, T, 0, 20261119), { over: true, alert: true }, "at");
  assert.deepEqual(holdAlert(T + 1, T, 0, 20261119), { over: true, alert: true }, "above");
  assert.deepEqual(holdAlert(T + 1, T, 20261119, 20261119), { over: true, alert: false }, "already alerted today");
  assert.deepEqual(holdAlert(T + 1, T, 20261118, 20261119), { over: true, alert: true }, "a new day alerts again");
});

function seed(s: ReturnType<typeof doStorage>, sat: number, tag: string) {
  s.db.prepare("INSERT INTO cashu_proof (secret, mint, unit, amount, keyset, c) VALUES (?, ?, 'sat', ?, ?, ?)").run("hold-" + tag, MINT, sat, "00ad268c4d1f5826", "02" + "ab".repeat(32));
}

test("the store logs the hold alert once per UTC day and the balance says over_hold", async () => {
  const s = doStorage();
  const env: Record<string, string> = { OWNER_KEY: KEY, CASHU_MINTS: JSON.stringify([MINT]), ATTACKFEE_TEST_HOOKS: "1", CASHU_HOLD_ALERT_MSAT: "20000" };
  const d = s.open(env);
  const balance = async () => {
    const res = await ownerRoute(new Request("https://site.example/v1/owner/balance", { headers: { authorization: "Bearer " + KEY } }), env as never, d as unknown as AttackfeeDoStub, "203.0.113.9");
    return JSON.parse(await res!.text());
  };
  const logs = captureLogs();
  try {
    seed(s, 19, "a");
    assert.equal((await balance()).over_hold, false, "19 sats is below 20");
    seed(s, 1, "b");
    const at = await balance();
    assert.equal(at.available_msat, 20_000);
    assert.equal(at.over_hold, true, "at the ceiling");
    seed(s, 5, "c");
    assert.equal((await balance()).over_hold, true, "above");
    assert.deepEqual(d.holdCheck(20_000), { available_msat: 25_000, over: true, alert: false }, "the cron sees it, no second alert today");
  } finally { logs.restore(); }
  assert.deepEqual(logs.parsed().filter((l) => l.event === "cashu_hold_alert"), [{ event: "cashu_hold_alert", available_msat: 20_000 }], "one line today");
  // A new UTC day alerts again.
  s.db.prepare("UPDATE cashu_meta SET n = 20000101 WHERE k = 'hold_alert_day'").run();
  assert.equal(d.holdCheck(20_000).alert, true);
  assert.equal(d.holdCheck(20_000).alert, false);
});

test("the default ceiling: a small store is not over_hold", () => {
  const s = doStorage();
  const d = s.open({});
  seed(s, 4999, "x");
  assert.deepEqual(d.holdCheck(holdThreshold(undefined)), { available_msat: 4_999_000, over: false, alert: false });
  seed(s, 1, "y");
  assert.deepEqual(d.holdCheck(holdThreshold(undefined)), { available_msat: 5_000_000, over: true, alert: true });
});
