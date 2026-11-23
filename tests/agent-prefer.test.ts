// createAgent({ prefer }) pays the offer of the preferred kind instead of always offers[0].
// All fetches are mocked; dummy offer data only, no mint and no money.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgent, type AgentOffer } from "../packages/agent/src/index.ts";
import { encodePaymentRequest } from "../packages/settlement-ln/src/cashu.ts";

const cashuOffer = { id: "o-cashu", kind: "cashu", amount_msat: 10000, amount: 10, unit: "sat", mint: "https://mint.example/Bitcoin", request: encodePaymentRequest({ a: 10, u: "sat", m: ["https://mint.example/Bitcoin"] }), credential: "cred-dummy", exp: 2_000_000_000 };
const l402Offer = { id: "o-l402", kind: "l402", amount_msat: 10000, invoice: "lnbc-dummy", macaroon: "mac-dummy", exp: 2_000_000_000 };

function mockSite(offers: unknown[]) {
  const redeemed: any[] = [];
  let writes = 0;
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = String(input);
    if (u.endsWith("/v1/redeem")) {
      redeemed.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ pass: "pass-dummy", rail: "settle", cls: "write", exp: 60 }), { status: 200 });
    }
    writes++;
    const auth = new Headers(init?.headers).get("authorization");
    if (auth === "Attackfee pass-dummy") return new Response("{}", { status: 200 });
    return new Response(JSON.stringify({ error: "payment_required", offers }), { status: 402 });
  }) as typeof fetch;
  return { f, redeemed, writes: () => writes };
}

const l402Only = async (offer: AgentOffer) => {
  if (offer.kind === "cashu") throw new Error("this payer cannot pay cashu");
  return "ab".repeat(32);
};

test("prefer l402 pays the l402 offer when the 402 lists cashu first", async () => {
  const site = mockSite([cashuOffer, l402Offer]);
  const agent = createAgent({ base: "http://site.test", pay: l402Only, prefer: "l402", work: false, fetch: site.f });
  const r = await agent.fetch("/demo/contact", { method: "POST", body: "{}" });
  await r.response.text();
  assert.equal(r.via, "paid");
  assert.equal(r.response.status, 200);
  assert.equal(r.offer?.id, "o-l402");
  assert.equal(site.redeemed.length, 1);
  assert.equal(site.redeemed[0].kind, "l402");
  assert.equal(site.redeemed[0].offer_id, "o-l402");
});

test("prefer cashu pays the cashu offer when the 402 lists l402 first", async () => {
  const site = mockSite([l402Offer, cashuOffer]);
  const seen: string[] = [];
  const agent = createAgent({ base: "http://site.test", pay: async (o) => { seen.push(o.id); return "cashuBdummy"; }, prefer: "cashu", work: false, fetch: site.f });
  const r = await agent.fetch("/demo/contact", { method: "POST", body: "{}" });
  await r.response.text();
  assert.equal(r.via, "paid");
  assert.deepEqual(seen, ["o-cashu"]);
  assert.equal(site.redeemed[0].kind, "cashu");
});

test("prefer l402 also matches the ln402 kind", async () => {
  const ln = { ...l402Offer, id: "o-ln", kind: "ln402" };
  const site = mockSite([cashuOffer, ln]);
  const agent = createAgent({ base: "http://site.test", pay: l402Only, prefer: "l402", work: false, fetch: site.f });
  const r = await agent.fetch("/demo/contact", { method: "POST", body: "{}" });
  await r.response.text();
  assert.equal(r.offer?.id, "o-ln");
});

test("without prefer the first offer is used (unchanged default)", async () => {
  const site = mockSite([cashuOffer, l402Offer]);
  const seen: string[] = [];
  const agent = createAgent({ base: "http://site.test", pay: async (o) => { seen.push(o.id); return "cashuBdummy"; }, work: false, fetch: site.f });
  await (await agent.fetch("/demo/contact", { method: "POST", body: "{}" })).response.text();
  assert.deepEqual(seen, ["o-cashu"]);
});

test("prefer with no matching offer falls back to the first offer", async () => {
  const site = mockSite([cashuOffer]);
  const seen: string[] = [];
  const agent = createAgent({ base: "http://site.test", pay: async (o) => { seen.push(o.id); return "cashuBdummy"; }, prefer: "l402", work: false, fetch: site.f });
  await (await agent.fetch("/demo/contact", { method: "POST", body: "{}" })).response.text();
  assert.deepEqual(seen, ["o-cashu"]);
});

test("an unknown prefer value is refused", () => {
  assert.throws(() => createAgent({ base: "http://site.test", prefer: "bitcoin" as any }), /prefer/);
});
