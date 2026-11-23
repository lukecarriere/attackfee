// R5: the edge-e2e CI job exists, runs scripts/edge-e2e.mjs against wrangler dev --local and the
// loopback keyset mint, and only the owner balance (R1) and withdraw (R2) steps may be expected-fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-ignore plain JS script
import { STEPS, parseXfail, devVars } from "../scripts/edge-e2e.mjs";

const ROOT = join(import.meta.dirname, "..");
const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
const script = readFileSync(join(ROOT, "scripts/edge-e2e.mjs"), "utf8");

test("ci.yml has an edge-e2e job that builds and runs scripts/edge-e2e.mjs", () => {
  const job = ci.split(/\n  (?=[a-z0-9-]+:\n)/).find((block) => block.startsWith("edge-e2e:"));
  assert.ok(job, "edge-e2e job present");
  assert.match(job!, /npm ci/);
  assert.match(job!, /npm run build/);
  assert.match(job!, /node scripts\/edge-e2e\.mjs/);
  assert.doesNotMatch(job!, /--xfail/, "owner balance and withdraw are built: no step is expected-fail");
  assert.doesNotMatch(job!, /echo[^\n]*(SITE_SECRET|OWNER_KEY)/, "the job never echoes a secret");
});

test("the R5 steps run in the spec order, each a hard assert", () => {
  assert.deepEqual(STEPS.map((s: { id: string }) => s.id), [
    "offer_both",
    "pay_cashu",
    "write_200",
    "daily_counts",
    "owner_balance",
    "owner_withdraw",
    "replay_refused",
  ]);
  assert.deepEqual(STEPS.filter((s: { req: string }) => s.req === "R1" || s.req === "R2").map((s: { id: string }) => s.id), ["owner_balance", "owner_withdraw"]);
});

test("only R1/R2 steps can be marked expected-fail", () => {
  assert.deepEqual([...parseXfail("R1,R2")].sort(), ["owner_balance", "owner_withdraw"]);
  assert.deepEqual([...parseXfail("")], []);
  assert.throws(() => parseXfail("R5"), /expected-fail/);
  assert.throws(() => parseXfail("daily_counts"), /expected-fail/);
});

test(".dev.vars carries random SITE_SECRET and OWNER_KEY, test hooks and the mint proxy", () => {
  const a = devVars("http://127.0.0.1:9");
  const b = devVars("http://127.0.0.1:9");
  assert.match(a.text, /^SITE_SECRET="[0-9a-f]{64}"$/m);
  assert.match(a.text, /^OWNER_KEY="[0-9a-f]{64}"$/m);
  assert.match(a.text, /^ATTACKFEE_TEST_HOOKS=1$/m);
  assert.match(a.text, /^CASHU_FETCH_PROXY="http:\/\/127\.0\.0\.1:9"$/m);
  assert.notEqual(a.ownerKey, b.ownerKey, "a fresh key per run");
  assert.doesNotMatch(a.text, /ATTACKFEE_OWNER_KEY/);
});

test("the script writes .dev.vars mode 0600 and deletes it, and never logs a secret value", () => {
  assert.match(script, /mode: 0o600/);
  assert.match(script, /devVarsPath = path\.join\(ROOT, "\.dev\.vars"\)/);
  assert.match(script, /rmSync\(devVarsPath/);
  assert.doesNotMatch(script, /log\([^)]*ownerKey/);
  assert.doesNotMatch(script, /log\([^)]*siteSecret/);
});
