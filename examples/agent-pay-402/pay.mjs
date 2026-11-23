#!/usr/bin/env node
// Reference agent client for an Attackfee 402. Node 22, no build step.
//
//   ATTACKFEE_CASHU_SOURCE=./wallet.json node examples/agent-pay-402/pay.mjs --base https://site.example
//
// POSTs the write as an agent (`Attackfee-Client: agent`), reads the 402 and pays one offer:
//   --mode cashu (default): pays the cashu offer from the wallet file named by ATTACKFEE_CASHU_SOURCE
//     (mode 0600; fund.mjs makes one). An exact amount is sent as is; a larger one is swapped at
//     the mint first and the change is written back to the same file. Then POST /v1/redeem for a
//     one-use pass and re-send the write with `Authorization: Attackfee <pass>`.
//   --mode invoice: prints the invoice offer's amount and invoice, waits for Enter once it is paid
//     from any wallet, then presents `Authorization: L402 <macaroon>` for the pass and re-sends the
//     write. An offer that expires first is replaced by a fresh 402, never retried.
// --max-amount <msat> (default 10000) refuses any offer above it before anything is paid.
// --test adds `attackfee-test: 1` so the write lands in the site's test counters.
// Prints status lines only: never a token, proof, secret, preimage or macaroon. The invoice is
// printed in --mode invoice, because paying it is the point.
import { createInterface } from "node:readline";
import { cashuPayer } from "../../packages/agent/src/cashu-payer.ts";
import { decodeToken } from "../../packages/settlement-ln/src/cashu.ts";
import { decodeBolt11 } from "../../packages/settlement-ln/src/bolt11.ts";
import { toHex } from "../../packages/protocol/src/bytes.ts";
import { Fail, mintProxy, proxiedFetch, readWallet, report, total, writeWallet } from "./proof-file.mjs";

const DEFAULT_MAX_MSAT = 10_000;
const FRESH_OFFERS = 3;

function args(argv) {
  const o = { base: "", path: "/demo/contact", mode: "cashu", max: DEFAULT_MAX_MSAT, test: false, body: JSON.stringify({ message: "agent-pay-402 example" }) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Fail(a + " needs a value"); return argv[++i]; };
    if (a === "--base") o.base = next();
    else if (a === "--path") o.path = next();
    else if (a === "--mode") o.mode = next();
    else if (a === "--max-amount") o.max = Number(next());
    else if (a === "--test") o.test = true;
    else if (a === "--body") o.body = next();
    else if (a === "--help" || a === "-h") { process.stderr.write("usage: pay.mjs --base <origin> [--path /demo/contact] [--mode cashu|invoice] [--max-amount <msat>] [--test] [--body <json>]\n"); process.exit(0); }
    else throw new Fail("unknown argument " + a);
  }
  let u;
  try { u = new URL(o.base); } catch { throw new Fail("--base must be an origin such as https://site.example"); }
  if (!/^https?:$/.test(u.protocol)) throw new Fail("--base must be http or https");
  o.base = u.origin;
  if (!o.path.startsWith("/")) throw new Fail("--path must start with /");
  if (o.mode !== "cashu" && o.mode !== "invoice") throw new Fail("--mode is cashu or invoice");
  if (!Number.isSafeInteger(o.max) || o.max < 0) throw new Fail("--max-amount is a whole number of msat");
  return o;
}

const say = (line) => process.stdout.write(line + "\n");
const note = (line) => process.stderr.write(line + "\n");

function headers(o, extra = {}) {
  const h = { "attackfee-client": "agent", accept: "application/json", "content-type": "application/json", ...extra };
  if (o.test) h["attackfee-test"] = "1";
  return h;
}

async function post(o, path, body, extra) {
  const r = await fetch(o.base + path, { method: "POST", headers: headers(o, extra), body, redirect: "manual" });
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  return { status: r.status, body: j };
}

/** POST the write; return the offer for this mode from the 402, or finish if no payment was asked. */
async function offerFor(o) {
  const first = await post(o, o.path, o.body);
  if (first.status !== 402) {
    say("write: " + first.status + " (no payment asked)");
    process.exit(first.status >= 200 && first.status < 300 ? 0 : 1);
  }
  const offers = Array.isArray(first.body?.offers) ? first.body.offers : [];
  const kinds = o.mode === "cashu" ? ["cashu"] : ["l402", "ln402"];
  const offer = offers.find((x) => kinds.includes(x?.kind));
  if (!offer) throw new Fail("the 402 has no " + o.mode + " offer");
  if (!Number.isSafeInteger(offer.amount_msat) || offer.amount_msat <= 0) throw new Fail("the offer has no amount");
  if (offer.amount_msat > o.max) throw new Fail("offer over max-amount (" + offer.amount_msat + " msat > " + o.max + " msat); nothing paid", 2);
  const left = Math.round(offer.exp - Date.now() / 1000);
  say("offer: " + offer.kind + " " + offer.amount_msat + " msat, expires in " + left + " s");
  return offer;
}

/** Trade the proof of payment for a pass, then re-send the write with it. */
async function writeWithPass(o, pass) {
  const w = await post(o, o.path, o.body, { authorization: "Attackfee " + pass });
  say("write: " + w.status);
  return w.status >= 200 && w.status < 300 ? 0 : 1;
}

const hexProofs = (token) => decodeToken(token).proofs.map((p) => ({ amount: p.amount, id: toHex(p.id), secret: p.secret, C: toHex(p.C) }));

/** A subset of `proofs` whose amounts add up to `target` exactly, or null. */
function exactSubset(proofs, target) {
  if (!Number.isSafeInteger(target) || target <= 0 || target > 100_000) return null;
  const from = new Array(target + 1).fill(undefined);
  from[0] = null;
  proofs.forEach((p, i) => {
    for (let s = target; s >= p.amount; s--) {
      if (from[s] === undefined && from[s - p.amount] !== undefined) from[s] = { i, prev: s - p.amount };
    }
  });
  if (from[target] === undefined) return null;
  const out = [];
  for (let s = target; s > 0; s = from[s].prev) out.push(proofs[from[s].i]);
  return out;
}

async function payCashu(o) {
  const file = process.env.ATTACKFEE_CASHU_SOURCE ?? "";
  if (!file) throw new Fail("set ATTACKFEE_CASHU_SOURCE to the wallet file (fund.mjs makes one)");
  const wallet = await readWallet(file); // refuses a file group or others can read, before any request
  if (!wallet) throw new Fail("the wallet file does not exist");
  const proxy = mintProxy();
  const offer = await offerFor(o);
  if (offer.exp * 1000 <= Date.now()) throw new Fail("the offer has expired; run again");
  // Proofs that add up to the offer exactly are sent as they are (no swap by this client); the rest
  // stay in the file untouched. Otherwise every held proof goes into one swap and the change comes back.
  const exact = exactSubset(wallet.proofs, offer.amount);
  const inputs = exact ?? wallet.proofs;
  let change = null;
  const pay = cashuPayer({ proofs: inputs, mint: wallet.mint }, {
    fetch: proxiedFetch(proxy),
    lookup: proxy ? async () => ["1.1.1.1"] : undefined,
    onChange: (t) => { change = t; },
  });
  let token;
  try {
    token = await pay(offer);
  } catch (e) {
    const m = e && typeof e.message === "string" ? e.message.replace(/^pay: /, "") : "failed";
    throw new Fail("payment not made: " + m);
  }
  // The inputs are spent at the mint once a swap happened (or are about to be sent as they are).
  // Save the change and the sent proofs before redeeming, so nothing is lost if this run stops.
  const sent = { offer_id: offer.id, proofs: hexProofs(token) };
  const used = new Set(inputs.map((p) => p.secret));
  wallet.proofs = [...wallet.proofs.filter((p) => !used.has(p.secret)), ...(change ? hexProofs(change) : [])];
  wallet.unconfirmed = [...(wallet.unconfirmed ?? []), sent];
  await writeWallet(file, wallet);
  say("paid: " + total(sent.proofs) + " sat; " + total(wallet.proofs) + " sat left in the wallet file (mode 0600)");

  const r = await post(o, "/v1/redeem", JSON.stringify({ offer_id: offer.id, kind: "cashu", token, credential: offer.credential }));
  if (r.status !== 200 || typeof r.body?.pass !== "string") {
    throw new Fail("redeem refused (" + r.status + (typeof r.body?.error === "string" ? " " + r.body.error : "") + "); the sent proofs stay under \"unconfirmed\" in the wallet file");
  }
  wallet.unconfirmed = wallet.unconfirmed.filter((x) => x !== sent);
  await writeWallet(file, wallet);
  say("redeemed: one-use pass, " + (r.body.cls ?? "write") + ", valid until " + new Date(r.body.exp * 1000).toISOString());
  return writeWithPass(o, r.body.pass);
}

/** Resolve on the next line from stdin, or when the offer expires (false), whichever is first. */
function enterOrExpiry(rl, exp) {
  return new Promise((resolve) => {
    const tick = () => {
      const left = Math.round(exp - Date.now() / 1000);
      if (left <= 0) { cleanup(); resolve(false); return; }
      note("  " + left + " s left");
    };
    const iv = setInterval(tick, 15_000);
    const to = setTimeout(() => { cleanup(); resolve(false); }, Math.max(0, exp * 1000 - Date.now()));
    const onLine = () => { cleanup(); resolve(true); };
    const onClose = () => { cleanup(); resolve(null); };
    function cleanup() { clearInterval(iv); clearTimeout(to); rl.off("line", onLine); rl.off("close", onClose); }
    rl.on("line", onLine);
    rl.on("close", onClose);
  });
}

async function payInvoice(o) {
  const rl = createInterface({ input: process.stdin });
  try {
    for (let n = 0; n < FRESH_OFFERS; n++) {
      const offer = await offerFor(o);
      if (typeof offer.invoice !== "string" || typeof offer.macaroon !== "string") throw new Fail("the invoice offer is incomplete");
      let msat;
      try { msat = decodeBolt11(offer.invoice).amountMsat; } catch { throw new Fail("the offer's invoice does not decode"); }
      if (msat === null || msat > o.max) throw new Fail("offer over max-amount (invoice " + msat + " msat > " + o.max + " msat); nothing paid", 2);
      say("amount: " + Math.ceil(msat / 1000) + " sat");
      say("invoice: " + offer.invoice);
      note("pay the invoice from any wallet, then press Enter (expires in " + Math.round(offer.exp - Date.now() / 1000) + " s)");
      for (;;) {
        const got = await enterOrExpiry(rl, offer.exp);
        if (got === null) throw new Fail("stdin closed before the invoice was confirmed");
        if (got === false) { note("the offer expired; fetching a fresh one. Do not pay the old invoice."); break; }
        const r = await post(o, o.path, o.body, { authorization: "L402 " + offer.macaroon });
        if (r.status === 200 && typeof r.body?.pass === "string") {
          say("redeemed: one-use pass, " + (r.body.cls ?? "write"));
          return await writeWithPass(o, r.body.pass);
        }
        note("not settled yet (" + r.status + (typeof r.body?.error === "string" ? " " + r.body.error : "") + "); press Enter to check again");
      }
    }
    throw new Fail("no invoice was paid in " + FRESH_OFFERS + " offers");
  } finally {
    rl.close();
  }
}

async function main() {
  const o = args(process.argv.slice(2));
  return o.mode === "cashu" ? payCashu(o) : payInvoice(o);
}

main().then((code) => process.exit(code ?? 0), (e) => process.exit(report(e)));
