// R6: machine-readable "how to pay" in the manifest payment objects, lint-clean, plus the PM
// sentence on /docs/agent (exact).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildManifest, howToPay } from "../packages/server-node/src/manifest.ts";
// @ts-ignore plain JS helper
import { lintRegexes, lintText } from "../scripts/copy-lib.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SENTENCE = "An automated client can pay the offer in the 402 instead of doing the work. The payment details are in the 402 body and in /.well-known/attackfee.json; a runnable client is in the repo's examples.";
const prices = { write: { amount_msat: 10000, usd: "0.0064" }, search: { amount_msat: 2000, usd: "0.0013" }, account: { amount_msat: 25000, usd: "0.0160" }, admin: { amount_msat: 100000, usd: "0.0640" } };

test("howToPay: the fields R6 names, four steps, no client link", () => {
  const h = howToPay("https://site.example", ["https://mint.example/Bitcoin"]);
  assert.deepEqual(Object.keys(h), ["mints", "pay_header", "redeem", "pass_header", "steps"]);
  assert.deepEqual(h.mints, ["https://mint.example/Bitcoin"]);
  assert.equal(h.pay_header, "X-Cashu");
  assert.equal(h.redeem, "https://site.example/v1/redeem");
  assert.equal(h.pass_header, "Authorization: Attackfee <pass>");
  assert.equal(h.steps.length, 4);
});

test("manifest: every payment object gets the how-to-pay fields when cashu is offered", () => {
  const doc: any = buildManifest({ api: "https://site.example/v1", docs: null, status: "cashu", prices, methods: ["cashu", "l402"], pay: "https://site.example/v1/demo/agent", how: howToPay("https://site.example", ["https://mint.example/Bitcoin"]) });
  for (const t of doc.tools) {
    assert.deepEqual(t.payment.mints, ["https://mint.example/Bitcoin"]);
    assert.equal(t.payment.pay_header, "X-Cashu");
    assert.equal(t.payment.redeem, "https://site.example/v1/redeem");
    assert.equal(t.payment.steps.length, 4);
  }
});

test("manifest: no how-to-pay fields when payments are off or the mint is down", () => {
  const how = howToPay("https://site.example", ["https://mint.example/Bitcoin"]);
  const off: any = buildManifest({ api: "https://site.example/v1", docs: null, status: "stub", prices: null, how });
  const down: any = buildManifest({ api: "https://site.example/v1", docs: null, status: "cashu", prices, methods: [], how });
  for (const doc of [off, down]) for (const t of doc.tools) assert.equal("mints" in t.payment, false);
});

test("manifest: every description and every step passes the copy lint", () => {
  const doc: any = buildManifest({ api: "https://site.example/v1", docs: null, status: "cashu", prices, methods: ["cashu", "l402"], how: howToPay("https://site.example", ["https://mint.example/Bitcoin"]) });
  const re = lintRegexes();
  const texts = [doc.description, ...doc.tools.map((t: any) => t.description), ...doc.tools[0].payment.steps];
  for (const s of texts) assert.deepEqual(lintText("website/x.md", s, re), [], s);
});

test("/docs/agent has the R6 sentence exactly", () => {
  const md = readFileSync(ROOT + "website/docs/agent.md", "utf8");
  assert.ok(md.includes(SENTENCE));
});

test("copy lint: the example payment client code is exempt like packages/settlement-ln; its README and other examples are not", async () => {
  // @ts-ignore plain JS helper
  const { isExempt } = await import("../scripts/copy-lib.mjs");
  for (const f of ["examples/agent-pay-402/pay.mjs", "examples/agent-pay-402/fund.mjs", "examples/agent-pay-402/proof-file.mjs", "examples/agent-pay-402/pay.sh"]) assert.equal(isExempt(f), true, f);
  for (const f of ["examples/agent-pay-402/README.md", "examples/express-contact/server.js", "examples/agent-pay-402/sub/x.mjs", "website/docs/agent.md"]) assert.equal(isExempt(f), false, f);
  const copy = readFileSync(ROOT + "docs/copy.md", "utf8");
  assert.match(copy, /`examples\/agent-pay-402\/`/, "docs/copy.md names the exemption");
});
