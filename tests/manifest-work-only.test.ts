// When payments are off, /.well-known manifests must not advertise a pay URL,
// paid-redeem inputs, or a choice between paying and doing the work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildManifest, INPUT_SCHEMAS, TOOLS, TOOLS_OFF } from "../packages/server-node/src/manifest.ts";
import { startDemo } from "./helpers.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const COPY = readFileSync(ROOT + "docs/copy.md", "utf8");
const WP_DISCOVERY = readFileSync(ROOT + "packages/wp-attackfee/includes/discovery.php", "utf8");

const PAY_VS_WORK = "choose between paying and doing the work";

function servedText(doc: unknown): string {
  return JSON.stringify(doc);
}

test("buildManifest: payments off drops a pay URL, paid-redeem inputs, and pay-vs-work wording", () => {
  const doc = buildManifest({
    api: "https://x.test/v1",
    docs: null,
    status: "stub",
    prices: null,
    pay: "https://x.test/v1/demo/agent",
  });
  assert.equal("pay" in doc, false, "pay URL must not appear while payments are off, even if the caller passed one");
  const gate = doc.tools.find((t) => t.name === "gate_form_write")!;
  const schema = gate.input_schema as { properties?: Record<string, unknown> };
  assert.equal(schema.properties?.payment, undefined, "paid-redeem input must be absent while payments are off");
  const text = servedText(doc);
  assert.equal(text.toLowerCase().includes(PAY_VS_WORK), false, text);
  const priceTool = doc.tools.find((t) => t.name === "price_write_action")!;
  assert.equal(priceTool.description.includes(PAY_VS_WORK), false);
  // Paid wording stays available for when payments are on.
  assert.ok(TOOLS.find((t) => t.name === "price_write_action")!.description.includes(PAY_VS_WORK));
  assert.ok((INPUT_SCHEMAS.gate_form_write as { properties: { payment: unknown } }).properties.payment);
  for (const tool of TOOLS_OFF) {
    assert.ok(COPY.includes('"' + tool.description + '"'), tool.name + " work-only copy");
    assert.ok(WP_DISCOVERY.includes(tool.description.replace(/'/g, "'")), tool.name + " WordPress work-only copy");
  }
});

test("buildManifest: payments on keeps the pay URL, paid-redeem inputs, and pay-vs-work wording", () => {
  const prices = {
    write: { amount_msat: 10000, usd: "0.0100" },
    search: { amount_msat: 2000, usd: "0.0020" },
    account: { amount_msat: 25000, usd: "0.0250" },
    admin: { amount_msat: 100000, usd: "0.1000" },
  };
  const doc = buildManifest({
    api: "https://x.test/v1",
    docs: null,
    status: "cashu",
    prices,
    methods: ["cashu"],
    pay: "https://x.test/v1/demo/agent",
  });
  assert.equal((doc as { pay?: string }).pay, "https://x.test/v1/demo/agent");
  const gate = doc.tools.find((t) => t.name === "gate_form_write")!;
  const schema = gate.input_schema as { properties?: Record<string, unknown> };
  assert.ok(schema.properties?.payment, "paid-redeem input is present when payments are on");
  assert.ok(servedText(doc).includes(PAY_VS_WORK));
});

test("Node demo with settlement off serves a work-only manifest", async () => {
  const s = await startDemo({ work: { standard: { cost: 500 } } });
  try {
    const res = await fetch(s.url + "/.well-known/attackfee.json");
    assert.equal(res.status, 200);
    const doc: any = await res.json();
    assert.equal(doc.pay, undefined);
    const gate = doc.tools.find((t: any) => t.name === "gate_form_write");
    assert.equal(gate.input_schema.properties.payment, undefined);
    assert.equal(JSON.stringify(doc).includes(PAY_VS_WORK), false);
  } finally {
    await s.close();
  }
});
