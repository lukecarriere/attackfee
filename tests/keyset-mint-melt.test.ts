// The loopback keyset mint answers NUT-05 melt (quote, melt, quote state) and keeps NUT-04 mint
// quotes working, so the edge end-to-end job can withdraw and fund against it. Test mint only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toHex } from "../packages/protocol/src/bytes.ts";
import { encodeBolt11 } from "../packages/settlement-ln/src/bolt11.ts";
import { decodeTokenV4 } from "../packages/settlement-ln/src/cashu.ts";
import { blindMessage, secretY } from "../packages/settlement-ln/src/cashu-crypto.ts";
import { startKeysetMint, type KeysetMint } from "../packages/settlement-ln/src/keyset-mint.ts";

const invoice = (sats: number) => encodeBolt11({ amountMsat: sats * 1000, paymentHash: toHex(crypto.getRandomValues(new Uint8Array(32))) });

async function call(mint: KeysetMint, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(mint.url + path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

function inputs(mint: KeysetMint, sats: number) {
  return decodeTokenV4(mint.token(sats)).proofs.map((p) => ({ amount: p.amount, id: mint.keysetId, secret: p.secret, C: toHex(p.C) }));
}

const blanks = (mint: KeysetMint, n: number) => Array.from({ length: n }, () => ({ amount: 1, id: mint.keysetId, B_: blindMessage(toHex(crypto.getRandomValues(new Uint8Array(32)))).B_ }));

test("melt quote prices a bolt11 invoice with a fee reserve", async () => {
  const mint = await startKeysetMint();
  try {
    const q = await call(mint, "POST", "/v1/melt/quote/bolt11", { unit: "sat", request: invoice(5) });
    assert.equal(q.status, 200);
    assert.equal(q.json.amount, 5);
    assert.equal(q.json.fee_reserve, 2);
    assert.equal(q.json.state, "UNPAID");
    assert.match(q.json.quote, /^[0-9a-f]+$/);
    const bad = await call(mint, "POST", "/v1/melt/quote/bolt11", { unit: "sat", request: "lnbc1notaninvoice" });
    assert.equal(bad.status, 400);
  } finally { await mint.close(); }
});

test("melt pays the invoice, spends the inputs and signs change onto blank outputs", async () => {
  const mint = await startKeysetMint();
  try {
    mint.setMeltFees({ reserve: 2, fee: 1 });
    const request = invoice(5);
    const q = await call(mint, "POST", "/v1/melt/quote/bolt11", { unit: "sat", request });
    const ins = inputs(mint, 8);
    const melt = await call(mint, "POST", "/v1/melt/bolt11", { quote: q.json.quote, inputs: ins, outputs: blanks(mint, 2) });
    assert.equal(melt.status, 200);
    assert.equal(melt.json.state, "PAID");
    const change = melt.json.change.reduce((n: number, c: { amount: number }) => n + c.amount, 0);
    assert.equal(change, 8 - 5 - 1, "change is inputs minus amount minus the real fee");
    assert.deepEqual(mint.meltsPaid(), [request]);
    assert.equal(mint.meltPosts(), 1);
    const state = await call(mint, "GET", "/v1/melt/quote/bolt11/" + q.json.quote);
    assert.equal(state.json.state, "PAID");
    const check = await call(mint, "POST", "/v1/checkstate", { Ys: ins.map((i) => secretY(i.secret)) });
    assert.ok(check.json.states.every((s: { state: string }) => s.state === "SPENT"));
    // The same inputs cannot pay a second quote.
    const q2 = await call(mint, "POST", "/v1/melt/quote/bolt11", { unit: "sat", request: invoice(5) });
    const again = await call(mint, "POST", "/v1/melt/bolt11", { quote: q2.json.quote, inputs: ins, outputs: [] });
    assert.equal(again.status, 400);
    assert.equal(again.json.code, 11001);
    assert.deepEqual(mint.meltsPaid(), [request], "a refused melt pays nothing");
  } finally { await mint.close(); }
});

test("melt refuses inputs below amount plus fee reserve", async () => {
  const mint = await startKeysetMint();
  try {
    const q = await call(mint, "POST", "/v1/melt/quote/bolt11", { unit: "sat", request: invoice(5) });
    const short = await call(mint, "POST", "/v1/melt/bolt11", { quote: q.json.quote, inputs: inputs(mint, 6), outputs: [] });
    assert.equal(short.status, 400);
    assert.deepEqual(mint.meltsPaid(), []);
  } finally { await mint.close(); }
});

test("a pending melt holds its inputs PENDING until settled", async () => {
  const mint = await startKeysetMint();
  try {
    mint.setFault("/v1/melt/bolt11", "pending");
    const q = await call(mint, "POST", "/v1/melt/quote/bolt11", { unit: "sat", request: invoice(5) });
    const ins = inputs(mint, 8);
    const melt = await call(mint, "POST", "/v1/melt/bolt11", { quote: q.json.quote, inputs: ins, outputs: blanks(mint, 2) });
    assert.equal(melt.json.state, "PENDING");
    const check = await call(mint, "POST", "/v1/checkstate", { Ys: ins.map((i) => secretY(i.secret)) });
    assert.ok(check.json.states.every((s: { state: string }) => s.state === "PENDING"));
    mint.setFault(null, null);
    mint.settleMelt(q.json.quote, "PAID");
    const state = await call(mint, "GET", "/v1/melt/quote/bolt11/" + q.json.quote);
    assert.equal(state.json.state, "PAID");
    assert.equal(mint.meltsPaid().length, 1);
  } finally { await mint.close(); }
});

test("NUT-04 mint quote flow still works for funding: quote, pay, mint proofs", async () => {
  const mint = await startKeysetMint({ quotes: true });
  try {
    const q = await call(mint, "POST", "/v1/mint/quote/bolt11", { unit: "sat", amount: 16 });
    assert.equal(q.status, 200);
    assert.equal(q.json.state, "UNPAID");
    const paid = await call(mint, "POST", "/test/pay", { request: q.json.request });
    assert.equal(paid.status, 200);
    const state = await call(mint, "GET", "/v1/mint/quote/bolt11/" + q.json.quote);
    assert.equal(state.json.state, "PAID");
    const out = [16].map((amount) => ({ amount, id: mint.keysetId, B_: blindMessage(toHex(crypto.getRandomValues(new Uint8Array(32)))).B_ }));
    const minted = await call(mint, "POST", "/v1/mint/bolt11", { quote: q.json.quote, outputs: out });
    assert.equal(minted.status, 200);
    assert.equal(minted.json.signatures.reduce((n: number, s: { amount: number }) => n + s.amount, 0), 16);
  } finally { await mint.close(); }
});
