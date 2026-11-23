// R5: the edge-e2e pay step runs the reference client (examples/agent-pay-402/pay.mjs, mode cashu)
// funded by fund.mjs from a test-mint quote, not the SDK directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// @ts-ignore plain JS script
import { STEPS } from "../scripts/edge-e2e.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("edge-e2e: pay_cashu runs fund.mjs then pay.mjs --mode cashu without the test header", () => {
  const src = readFileSync(ROOT + "scripts/edge-e2e.mjs", "utf8");
  assert.match(src, /examples\/agent-pay-402\/fund\.mjs/);
  assert.match(src, /examples\/agent-pay-402\/pay\.mjs/);
  assert.match(src, /"--mode", "cashu"/);
  assert.doesNotMatch(src, /createAgent\(/, "the pay step no longer calls the SDK directly");
  const pay = STEPS.find((s: { id: string }) => s.id === "pay_cashu");
  assert.match(pay.what, /pay\.mjs/);
});
