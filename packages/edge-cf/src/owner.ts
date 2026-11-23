// Owner routes on the site worker: GET /v1/owner/balance (amounts and counts) and
// POST /v1/owner/withdraw, /v1/owner/withdraw/check (melt stored proofs to a bolt11 invoice).
// Off unless the OWNER_KEY Worker secret is set (32+ characters). Off, every /v1/owner/ path is
// the same 404 as any unknown /v1 path. The key is compared as SHA-256 digests in constant time.
// Nothing here logs or returns a proof, a secret, the key, or an invoice.
import { sha256, timingSafeEqual, utf8 } from "../../protocol/src/index.ts";
import { assertProductionMint, mintKey, parseCashuMints } from "../../settlement-ln/src/cashu-net.ts";
import { checkWithdrawal, withdrawToInvoice, type MeltDeps, type WithdrawResult, type WithdrawStore } from "../../settlement-ln/src/cashu-melt.ts";
import type { FxQuote } from "../../settlement-ln/src/fx.ts";
import { fresh } from "../../settlement-ln/src/fx.ts";
import { cashuFetch, type CashuEnv } from "./cashu-edge.ts";
import type { AttackfeeDoStub, OwnerBooks } from "./do-store.ts";
import { holdThreshold } from "./hold.ts";

export interface OwnerEnv extends CashuEnv {
  /** Worker secret. Unset (the default): the owner routes do not exist. */
  OWNER_KEY?: string;
  /** Held-balance ceiling in msat (default 5,000 sats). Over it: `over_hold` and one log line a day. */
  CASHU_HOLD_ALERT_MSAT?: string;
}

/** What the routes need besides the store: the USD rate the site already uses for /v1/price. */
export interface OwnerOptions {
  fx?: () => Promise<FxQuote | null>;
}

/** GET /v1/owner/balance. Amounts in msat. */
export interface OwnerBalance {
  available_msat: number;
  available_usd: string | null;
  pending_msat: number;
  losses_msat: number;
  withdrawn_msat: number;
  paid_requests: number;
  mint: string | null;
  degraded: boolean;
  over_hold: boolean;
}

export const OWNER_KEY_MIN = 32;
/** Failed owner calls per client address per minute before 429. */
const AUTH_FAILS_PER_MIN = 10;
const MAX_BODY = 8192;
/** Pending withdrawals settled from the mint before a new one, and per cron run. */
const RESOLVE_PER_CALL = 3;

export function ownerEnabled(env: OwnerEnv): boolean {
  return typeof env.OWNER_KEY === "string" && env.OWNER_KEY.length >= OWNER_KEY_MIN;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function keyMatches(given: string, key: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(utf8(given)), sha256(utf8(key))]);
  return timingSafeEqual(a, b);
}

/** The store side of a withdrawal, one Durable Object call each. */
export function withdrawStoreOf(stub: AttackfeeDoStub): WithdrawStore {
  return {
    storedAt: (mint) => stub.withdrawStoredAt(mint),
    reserve: (o) => stub.withdrawReserve(o),
    get: (quote) => stub.withdrawGet(quote),
    finish: (o) => stub.withdrawFinish(o),
    release: (quote, minAgeS) => stub.withdrawRelease(quote, minAgeS),
    recheckable: (withinS) => stub.withdrawRecheckable(withinS),
  };
}

/** Configured mints plus every mint that holds stored proofs, so a removed mint can still be emptied. */
export function ownerMints(env: OwnerEnv, held: string[]): string[] {
  const hooks = env.ATTACKFEE_TEST_HOOKS === "1";
  const out = new Set(parseCashuMints(env.CASHU_MINTS, hooks));
  for (const m of held) {
    try { out.add(hooks ? mintKey(m) : assertProductionMint(m)); } catch { /* not fetched */ }
  }
  return [...out];
}

function meltDeps(env: OwnerEnv, stub: AttackfeeDoStub, books: OwnerBooks): MeltDeps {
  const allowlist = ownerMints(env, books.mints.map((m) => m.mint));
  const hooks = env.ATTACKFEE_TEST_HOOKS === "1";
  return {
    store: withdrawStoreOf(stub),
    allowlist,
    guard: { lookup: hooks ? async () => ["1.1.1.1"] : undefined, fetch: cashuFetch(env, allowlist) },
  };
}

/** USD for a balance: 4 places, rounded down (a balance never looks larger than it is). Null without a fresh rate. */
export function balanceUsd(msat: number, fx: FxQuote | null, now: number): string | null {
  if (!fresh(fx, now)) return null;
  const units = Math.floor((msat * fx.usd_per_btc) / 1e7 + 1e-6); // 1 unit = $0.0001
  return Math.floor(units / 10000) + "." + String(units % 10000).padStart(4, "0");
}

/** The mint a withdrawal uses by default: the one holding the most, else the first configured one. */
function defaultMint(env: OwnerEnv, books: OwnerBooks): string | null {
  const held = [...books.mints].filter((m) => m.stored_sat > 0).sort((x, y) => y.stored_sat - x.stored_sat)[0]?.mint;
  if (held) return held;
  try { return parseCashuMints(env.CASHU_MINTS, env.ATTACKFEE_TEST_HOOKS === "1")[0] ?? null; } catch { return null; }
}

export async function ownerBalance(env: OwnerEnv, stub: AttackfeeDoStub, opts: OwnerOptions = {}): Promise<OwnerBalance> {
  const books = await stub.ownerBooks();
  const hold = await stub.holdCheck(holdThreshold(env.CASHU_HOLD_ALERT_MSAT));
  if (hold.alert) console.log(JSON.stringify({ event: "cashu_hold_alert", available_msat: hold.available_msat }));
  let fx: FxQuote | null = null;
  try { fx = opts.fx ? await opts.fx() : null; } catch { fx = null; }
  const available_msat = books.stored_sat * 1000;
  const available_usd = balanceUsd(available_msat, fx, Math.floor(Date.now() / 1000));
  return {
    available_msat,
    available_usd,
    pending_msat: (books.pending_swap_sat + books.withdrawing_sat) * 1000,
    losses_msat: books.losses_sat * 1000,
    withdrawn_msat: books.withdrawn_sat * 1000,
    paid_requests: books.paid_requests,
    mint: defaultMint(env, books),
    // Degraded: a swap or a withdrawal waits on the mint, or there is no USD rate.
    degraded: books.pending_swap_sat > 0 || books.withdrawals_pending.length > 0 || available_usd === null,
    over_hold: hold.over,
  };
}

/**
 * Settle pending withdrawals from the mint's own record (quote state, NUT-07). Used before a new
 * withdrawal and by the cron. Returns how many are still pending afterwards.
 */
export async function resolvePendingWithdrawals(env: OwnerEnv, stub: AttackfeeDoStub, max = RESOLVE_PER_CALL): Promise<{ checked: number; pending: number }> {
  const books = await stub.ownerBooks();
  if (!books.withdrawals_pending.length) return { checked: 0, pending: 0 };
  const deps = meltDeps(env, stub, books);
  let checked = 0;
  let pending = books.withdrawals_pending.length;
  for (const w of books.withdrawals_pending.slice(0, max)) {
    const r = await checkWithdrawal(deps, w.quote);
    checked++;
    logResult("check", r);
    if (r.state !== "pending") pending--;
  }
  return { checked, pending };
}

function statusOf(r: WithdrawResult): number {
  if (r.state === "paid") return 200;
  if (r.state === "pending") return 202;
  if (r.state === "released") return 502;
  if (r.error === "busy") return 409;
  return r.error === "not_found" ? 404 : r.error === "mint_unavailable" ? 503 : 400;
}

/** The wire form: amounts in msat, like the balance. */
function wire(r: WithdrawResult): Record<string, unknown> {
  if (r.state === "refused") return { ok: false, state: r.state, error: r.error, ...(r.fee_reserve_sat !== undefined ? { fee_reserve_msat: r.fee_reserve_sat * 1000 } : {}) };
  const out: Record<string, unknown> = { ok: r.state === "paid", state: r.state, quote: r.quote, amount_msat: r.amount_sat * 1000 };
  if (r.state === "paid") { out.fee_msat = r.fee_sat * 1000; out.change_msat = r.change_sat * 1000; }
  return out;
}

function logResult(kind: string, r: WithdrawResult): void {
  if (r.state === "paid") {
    console.log(JSON.stringify({ event: "owner_withdrawal", kind, amount_msat: r.amount_sat * 1000, fee_msat: r.fee_sat * 1000 }));
    return;
  }
  const line: Record<string, unknown> = { event: "owner_withdraw", kind, state: r.state };
  if (r.state === "refused") line.error = r.error;
  else line.amount_msat = r.amount_sat * 1000;
  console.log(JSON.stringify(line));
}

/** Null when this is not an owner path or the owner key is unset. The caller then answers as before. */
export async function ownerRoute(req: Request, env: OwnerEnv, stub: AttackfeeDoStub, clientIp: string | null, opts: OwnerOptions = {}): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  if (!path.startsWith("/v1/owner/") || !ownerEnabled(env)) return null;
  const method = req.method.toUpperCase();
  const limitKey = "owner-auth:" + (clientIp ?? "?");
  if ((await stub.windowCount(limitKey, 60)) >= AUTH_FAILS_PER_MIN) return json({ error: "rate_limited" }, 429);
  const auth = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!auth || !(await keyMatches(auth[1], env.OWNER_KEY!))) {
    await stub.windowHit(limitKey, 60);
    // Logged without the key or the header.
    console.log(JSON.stringify({ event: "owner_auth", result: "unauthorized", path, key: auth ? "wrong" : "missing" }));
    return json({ error: "unauthorized" }, 401);
  }
  if (path === "/v1/owner/balance" && method === "GET") return json(await ownerBalance(env, stub, opts));
  if ((path === "/v1/owner/withdraw" || path === "/v1/owner/withdraw/check") && method === "POST") {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "malformed" }, 400);
    let b: Record<string, unknown>;
    try { b = JSON.parse(raw); } catch { return json({ error: "malformed" }, 400); }
    if (!b || typeof b !== "object") return json({ error: "malformed" }, 400);
    if (path === "/v1/owner/withdraw/check") {
      if (typeof b.quote !== "string") return json({ error: "malformed" }, 400);
      const r = await checkWithdrawal(meltDeps(env, stub, await stub.ownerBooks()), b.quote);
      logResult("check", r);
      return json(wire(r), statusOf(r));
    }
    const maxFeeSat = b.max_fee_sat === undefined ? undefined : Number(b.max_fee_sat);
    if (maxFeeSat !== undefined && (!Number.isSafeInteger(maxFeeSat) || maxFeeSat < 0)) return json({ error: "malformed" }, 400);
    if (typeof b.invoice !== "string" || !b.invoice.trim()) return json({ error: "bad_invoice" }, 400);
    const invoice = b.invoice.trim().toLowerCase();
    // A withdrawal whose outcome is unknown is settled first; while one stays pending, nothing new is sent.
    if ((await resolvePendingWithdrawals(env, stub)).pending > 0) {
      const r: WithdrawResult = { state: "refused", error: "busy" };
      logResult("melt", r);
      return json(wire(r), 409);
    }
    const books = await stub.ownerBooks();
    const mint = typeof b.mint === "string" ? b.mint : defaultMint(env, books);
    // A mint that holds nothing stored is refused as too_much after the invoice is read, before any mint call.
    const r = await withdrawToInvoice(meltDeps(env, stub, books), { mint: mint ?? "", invoice, maxFeeSat });
    logResult("melt", r);
    return json(wire(r), statusOf(r));
  }
  return json({ error: "not_found" }, 404);
}
