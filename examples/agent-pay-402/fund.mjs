#!/usr/bin/env node
// Fill a wallet file with ecash from a Lightning invoice (NUT-04 mint quote). Node 22, no build step.
//
//   node examples/agent-pay-402/fund.mjs --amount 50 --out ./wallet.json
//
// Asks the mint (default https://mint.minibits.cash/Bitcoin, --mint to change) for a quote of N sat,
// N at most 50 (`--split n` mints it in groups of n, so pay.mjs can send an exact n without a swap). Prints the amount and the invoice on stdout and nothing else. Pay the invoice from
// any Lightning wallet. The script polls the quote until it is paid (--timeout seconds, default
// 600), mints the proofs and adds them to the wallet file (--out, or ATTACKFEE_CASHU_SOURCE), which
// is created with mode 0600. pay.mjs reads the same file. Proofs, tokens and secrets are never
// printed, including in errors.
//
// The quote and its blinded outputs are saved in <out>.pending (mode 0600) before the invoice is
// printed. If the invoice is not paid in time (exit 3), or the mint fails after it is paid (exit 4),
// `--resume --out <file>` waits for the same quote and mints it with the same outputs, so a paid
// quote is not lost and is not minted twice. Delete <out>.pending to drop an unpaid quote.
import { unlink } from "node:fs/promises";
import { blindMessage, deriveKeysetIdV2, splitAmount, unblind } from "../../packages/settlement-ln/src/cashu-crypto.ts";
import { decodeBolt11 } from "../../packages/settlement-ln/src/bolt11.ts";
import { toHex, randomBytes } from "../../packages/protocol/src/bytes.ts";
import { DEFAULT_MINT, Fail, checkMintUrl, mintCall, mintProxy, readSecretJson, readWallet, report, total, writeSecretFile, writeWallet } from "./proof-file.mjs";

/** Hard cap for one run, in sat. The whole live proof is capped at 50. */
export const MAX_FUND_SAT = 50;
const MINT_TRIES = 3;

function args(argv) {
  const o = { amount: null, split: null, mint: DEFAULT_MINT, out: process.env.ATTACKFEE_CASHU_SOURCE || "", timeout: 600, poll: 2000, resume: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Fail(a + " needs a value"); return argv[++i]; };
    if (a === "--amount") o.amount = next();
    else if (a === "--split") o.split = next();
    else if (a === "--mint") o.mint = next();
    else if (a === "--out") o.out = next();
    else if (a === "--timeout") o.timeout = Number(next());
    else if (a === "--poll-ms") o.poll = Number(next());
    else if (a === "--resume") o.resume = true;
    else if (a === "--help" || a === "-h") { process.stderr.write("usage: fund.mjs --amount <1-50> [--split <n>] [--out <file>] [--mint <url>] [--timeout <s>] | --resume --out <file>\n"); process.exit(0); }
    else throw new Fail("unknown argument " + a);
  }
  if (!o.out) throw new Fail("set --out <file> or ATTACKFEE_CASHU_SOURCE");
  if (!Number.isFinite(o.timeout) || o.timeout <= 0) throw new Fail("--timeout must be a positive number of seconds");
  if (!Number.isFinite(o.poll) || o.poll < 100) throw new Fail("--poll-ms must be at least 100");
  return o;
}

function amountOf(raw) {
  if (raw === null) throw new Fail("--amount is required: a whole number of sat from 1 to " + MAX_FUND_SAT + " (at most " + MAX_FUND_SAT + ")");
  if (!/^[0-9]+$/.test(raw)) throw new Fail("--amount must be a whole number of sat from 1 to " + MAX_FUND_SAT);
  const n = Number(raw);
  if (n > MAX_FUND_SAT) throw new Fail("--amount is at most " + MAX_FUND_SAT + " sat");
  if (n < 1) throw new Fail("--amount must be at least 1 sat");
  return n;
}

/** --split n: mint in groups that each add up to n, so a payment of n can be sent without a swap. */
function splitOf(raw, amount) {
  if (raw === null) return null;
  if (!/^[0-9]+$/.test(raw) || Number(raw) < 1 || Number(raw) > amount) throw new Fail("--split must be a whole number from 1 to the amount");
  return Number(raw);
}

function denominations(amount, split, denoms) {
  const groups = split ? [...Array(Math.floor(amount / split)).fill(split), ...(amount % split ? [amount % split] : [])] : [amount];
  const out = [];
  for (const g of groups) {
    const parts = splitAmount(g, denoms);
    if (!parts) throw new Fail("the mint's denominations cannot make " + g);
    out.push(...parts);
  }
  if (out.length > 64) throw new Fail("too many outputs; use a larger --split");
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The mint's active sat keyset (version 01), with its keys checked against the id. */
async function activeKeyset(mint, wantId) {
  const ks = await mintCall(mint, "/v1/keysets");
  if (ks.status !== 200 || !Array.isArray(ks.body?.keysets)) throw new Fail("mint keysets unavailable (status " + ks.status + ")");
  const rows = ks.body.keysets.map((k) => ({ id: String(k.id ?? "").toLowerCase(), unit: k.unit, active: k.active === true, fee: Number.isSafeInteger(k.input_fee_ppk) ? k.input_fee_ppk : 0, exp: Number.isSafeInteger(k.final_expiry) ? k.final_expiry : null }));
  const row = wantId ? rows.find((k) => k.id === wantId) : rows.find((k) => k.active && k.unit === "sat" && /^01[0-9a-f]{64}$/.test(k.id));
  if (!row) throw new Fail("mint has no active sat keyset this script can use");
  const kr = await mintCall(mint, "/v1/keys/" + row.id);
  const raw = kr.body?.keysets?.[0]?.keys;
  if (kr.status !== 200 || !raw || typeof raw !== "object") throw new Fail("mint keys unavailable (status " + kr.status + ")");
  const keys = {};
  for (const [a, pk] of Object.entries(raw)) if (typeof pk === "string") keys[a] = pk.toLowerCase();
  if (deriveKeysetIdV2(keys, "sat", row.fee, row.exp) !== row.id) throw new Fail("mint keys do not match the keyset id");
  return { id: row.id, keys };
}

function quoteState(body) {
  if (typeof body?.state === "string") return body.state.toUpperCase();
  if (body?.paid === true) return "PAID";
  return "UNPAID";
}

/** POST /v1/mint/bolt11 with the saved outputs, a few times. Returns proofs or null. */
async function mintWith(pending, keys) {
  const body = JSON.stringify({ quote: pending.quote, outputs: pending.outputs.map((o) => ({ amount: o.amount, id: pending.keyset, B_: o.B_ })) });
  for (let i = 0; i < MINT_TRIES; i++) {
    if (i > 0) await sleep(1000 * i);
    const r = await mintCall(pending.mint, "/v1/mint/bolt11", { method: "POST", headers: { "content-type": "application/json" }, body }, { timeoutMs: 20_000 });
    const sigs = r.body?.signatures;
    if (r.status !== 200 || !Array.isArray(sigs) || sigs.length !== pending.outputs.length) continue;
    const proofs = [];
    for (let k = 0; k < sigs.length; k++) {
      const o = pending.outputs[k];
      const s = sigs[k];
      if (!s || s.amount !== o.amount || typeof s.C_ !== "string" || !keys[String(o.amount)]) throw new Fail("mint answered with signatures that do not match");
      const C = unblind(s.C_, BigInt("0x" + o.r), keys[String(o.amount)]);
      proofs.push({ amount: o.amount, id: pending.keyset, secret: o.secret, C });
    }
    return proofs;
  }
  return null;
}

async function store(out, mint, proofs) {
  const w = (await readWallet(out)) ?? { mint, proofs: [], unconfirmed: [] };
  if (w.mint !== mint) throw new Fail("the wallet file is for another mint");
  w.proofs = [...w.proofs, ...proofs];
  await writeWallet(out, w);
  await unlink(out + ".pending").catch(() => {});
  process.stderr.write("minted " + total(proofs) + " sat into " + out + " (mode 0600, " + total(w.proofs) + " sat in the file)\n");
}

/** Poll the quote until it is paid. Exit 3 (pending kept) when the time runs out. */
async function waitPaid(mint, quote, o) {
  const deadline = Date.now() + o.timeout * 1000;
  for (;;) {
    const s = await mintCall(mint, "/v1/mint/quote/bolt11/" + quote);
    const state = s.status === 200 ? quoteState(s.body) : "UNKNOWN";
    if (state === "PAID" || state === "ISSUED") return state;
    if (Date.now() >= deadline) throw new Fail("the invoice was not paid within " + o.timeout + " s; nothing was minted. If it is paid later, run --resume --out " + o.out + " (delete " + o.out + ".pending to drop it)", 3);
    await sleep(Math.min(o.poll, Math.max(0, deadline - Date.now())));
  }
}

async function resume(o) {
  const pending = await readSecretJson(o.out + ".pending");
  if (!pending) throw new Fail("nothing pending for " + o.out);
  const mint = checkMintUrl(pending.mint);
  const { keys } = await activeKeyset(mint, pending.keyset);
  // ISSUED is fine here: a mint that already signed these outputs returns the same signatures.
  await waitPaid(mint, pending.quote, o);
  const proofs = await mintWith({ ...pending, mint }, keys);
  if (!proofs) throw new Fail("the mint still refuses; the outputs stay in " + o.out + ".pending. Try --resume again later");
  await store(o.out, mint, proofs);
}

async function main() {
  const o = args(process.argv.slice(2));
  mintProxy(); // refuse a bad proxy setting before anything else
  if (o.resume) return resume(o);
  const amount = amountOf(o.amount);
  const split = splitOf(o.split, amount);
  const mint = checkMintUrl(o.mint);
  if (await readSecretJson(o.out + ".pending")) throw new Fail("a quote is pending for " + o.out + "; run again with --resume --out " + o.out);
  const existing = await readWallet(o.out);
  if (existing && existing.mint !== mint) throw new Fail("the wallet file is for another mint");

  const { id, keys } = await activeKeyset(mint);
  const amounts = denominations(amount, split, Object.keys(keys).map(Number));

  const q = await mintCall(mint, "/v1/mint/quote/bolt11", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount, unit: "sat" }) });
  const quote = q.body?.quote;
  const invoice = q.body?.request;
  if (q.status !== 200 || typeof quote !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(quote) || typeof invoice !== "string") throw new Fail("mint quote refused (status " + q.status + ")");
  let msat;
  try { msat = decodeBolt11(invoice).amountMsat; } catch { throw new Fail("the mint's invoice does not decode"); }
  if (msat !== amount * 1000) throw new Fail("the invoice amount does not match the requested " + amount + " sat; nothing to pay");

  const outputs = amounts.map((a) => {
    const secret = toHex(randomBytes(32));
    const b = blindMessage(secret);
    return { amount: a, secret, r: b.r.toString(16).padStart(64, "0"), B_: b.B_ };
  });
  const pending = { mint, quote, amount, keyset: id, outputs };
  // Saved before the invoice is shown, so a late payment or a failed mint can be finished with --resume.
  await writeSecretFile(o.out + ".pending", pending);

  process.stdout.write("amount: " + amount + " sat\ninvoice: " + invoice + "\n");
  process.stderr.write("waiting up to " + o.timeout + " s for the invoice to be paid\n");
  const state = await waitPaid(mint, quote, o);
  if (state === "ISSUED") throw new Fail("the quote was already minted elsewhere");
  const proofs = await mintWith(pending, keys);
  if (!proofs) throw new Fail("the invoice is paid but minting failed; the outputs are kept in " + o.out + ".pending (mode 0600). Run again with --resume --out " + o.out, 4);
  await store(o.out, mint, proofs);
}

main().then(() => process.exit(0), (e) => process.exit(report(e)));
