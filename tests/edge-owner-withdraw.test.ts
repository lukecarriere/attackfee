// Owner balance and withdraw on the site worker, run in Node: the Durable Object SQL over node:sqlite
// and the loopback keyset mint behind the configured mint URL (the same proxy the worker tests use).
// No real mint is called and no sats move.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { captureLogs, doStorage } from "./do-harness.ts";
import { randomHex } from "../packages/protocol/src/bytes.ts";
import { toHex } from "../packages/protocol/src/bytes.ts";
import { encodeBolt11 } from "../packages/settlement-ln/src/bolt11.ts";
import { decodeTokenV4 } from "../packages/settlement-ln/src/cashu.ts";
import { secretY } from "../packages/settlement-ln/src/cashu-crypto.ts";
import { startKeysetMint } from "../packages/settlement-ln/src/keyset-mint.ts";
import { resolveLightningAddress } from "../packages/settlement-ln/src/cashu-melt.ts";
import { ownerRoute, resolvePendingWithdrawals, type OwnerOptions } from "../packages/edge-cf/src/owner.ts";
import type { AttackfeeDoStub } from "../packages/edge-cf/src/do-store.ts";

const MINT = "https://mint.minibits.cash/Bitcoin";
const KEY = "owner-key-for-tests-only-0123456789abcdef";
const BALANCE_KEYS = ["available_msat", "available_usd", "pending_msat", "losses_msat", "withdrawn_msat", "paid_requests", "mint", "degraded", "over_hold"].sort();
const FX: OwnerOptions = { fx: async () => ({ usd_per_btc: 100_000, fetched_at: Math.floor(Date.now() / 1000), source: "test" } as never) };
let mint: Awaited<ReturnType<typeof startKeysetMint>>;
let s: ReturnType<typeof doStorage>;
let d: ReturnType<ReturnType<typeof doStorage>["open"]>;
let env: Record<string, string>;
let seeded: string[] = [];

/**
 * A proxy in front of the loopback mint for timing cases: it can hold a melt POST on its way to the
 * mint (`meltDelayMs`), answer 502 at once and pass the melt on later (`meltGateway`), or report the
 * first input of a checkstate as SPENT (`firstSpent`). With `lie`, the mint is made to look as if
 * it never took a melt it actually paid: the melt reply and GET quote say UNPAID, checkstate UNSPENT.
 */
const px = { meltDelayMs: 0, meltGateway: false, firstSpent: false, lie: false };
let proxy: http.Server;
let proxyUrl = "";

before(async () => {
  mint = await startKeysetMint();
  const target = new URL(mint.url);
  proxy = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const isMelt = req.method === "POST" && req.url === "/v1/melt/bolt11";
      const isCheck = req.method === "POST" && req.url === "/v1/checkstate";
      const isQuoteGet = req.method === "GET" && /^\/v1\/melt\/quote\/bolt11\//.test(req.url ?? "");
      const forward = (reply: boolean) => {
        const up = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
          if (!reply) { r.resume(); return; }
          if (px.lie && (isMelt || isCheck || isQuoteGet)) {
            const body: Buffer[] = [];
            r.on("data", (c) => body.push(c));
            r.on("end", () => {
              let j: any = null;
              try { j = JSON.parse(Buffer.concat(body).toString("utf8")); } catch { j = null; }
              if (isMelt) j = { quote: j?.quote, state: "UNPAID", change: [] };
              else if (isQuoteGet && j) { j.state = "UNPAID"; delete j.change; }
              else if (isCheck && Array.isArray(j?.states)) for (const st of j.states) st.state = "UNSPENT";
              const out = JSON.stringify(j);
              res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(out) });
              res.end(out);
            });
            return;
          }
          if (isCheck && px.firstSpent) {
            const body: Buffer[] = [];
            r.on("data", (c) => body.push(c));
            r.on("end", () => {
              const j = JSON.parse(Buffer.concat(body).toString("utf8"));
              if (Array.isArray(j.states) && j.states.length) j.states[0].state = "SPENT";
              const out = JSON.stringify(j);
              res.writeHead(r.statusCode ?? 500, { "content-type": "application/json", "content-length": Buffer.byteLength(out) });
              res.end(out);
            });
            return;
          }
          res.writeHead(r.statusCode ?? 500, r.headers);
          r.pipe(res);
        });
        up.end(Buffer.concat(chunks));
      };
      if (isMelt && px.meltGateway) {
        res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ detail: "gateway" }));
        setTimeout(() => forward(false), px.meltDelayMs);
      } else if (isMelt && px.meltDelayMs) setTimeout(() => forward(true), px.meltDelayMs);
      else forward(true);
    });
  });
  await new Promise<void>((r) => proxy.listen(0, "127.0.0.1", () => r()));
  proxyUrl = "http://127.0.0.1:" + (proxy.address() as { port: number }).port;
});
after(async () => { await mint?.close(); proxy?.close(); });
beforeEach(() => {
  px.meltDelayMs = 0;
  px.meltGateway = false;
  px.firstSpent = false;
  px.lie = false;
  mint.setFault(null, null);
  mint.setMeltFees({ reserve: 2, fee: 1 });
  env = { OWNER_KEY: KEY, CASHU_MINTS: JSON.stringify([MINT]), ATTACKFEE_TEST_HOOKS: "1", CASHU_FETCH_PROXY: mint.url };
  s = doStorage();
  d = s.open(env);
  seeded = [];
});

/** Store proofs worth `amount` as if paid in, at the configured mint. */
function seed(amount: number) {
  for (const p of decodeTokenV4(mint.token(amount)).proofs) {
    s.db.prepare("INSERT INTO cashu_proof (secret, mint, unit, amount, keyset, c) VALUES (?, ?, 'sat', ?, ?, ?)").run(p.secret, MINT, p.amount, mint.keysetId, toHex(p.C));
    seeded.push(p.secret);
  }
}

/**
 * A real amountless BOLT11 invoice with a valid checksum: the "donation of any amount" example from
 * the BOLT 11 specification (lightning/bolts 11-payment-encoding.md). It decodes with no amount.
 */
const AMOUNTLESS_INVOICE = "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql";

const invoice = (sat: number) => encodeBolt11({ amountMsat: sat * 1000, paymentHash: randomHex(32) });
const stubOf = () => d as unknown as AttackfeeDoStub;

async function owner(path: string, body?: unknown, o: { key?: string | null; method?: string; ip?: string; opts?: OwnerOptions } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const key = o.key === undefined ? KEY : o.key;
  if (key !== null) headers.authorization = "Bearer " + key;
  const req = new Request("https://site.example" + path, { method: o.method ?? (body === undefined ? "GET" : "POST"), headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await ownerRoute(req, env, stubOf(), o.ip ?? "203.0.113.9", o.opts ?? FX);
  if (!res) return null;
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), text };
}

async function balance() {
  const r = await owner("/v1/owner/balance");
  assert.equal(r?.status, 200, r?.text);
  return r!.body;
}

/** Seconds a pending row must be older than before a check may return its proofs: melt timeout + 30 s. */
const RELEASE_AGE_S = 55;
/** Make a withdrawal row look `ageS` seconds older. */
function ageRow(quote: string, ageS: number) {
  s.db.prepare("UPDATE cashu_withdraw SET at = at - ? WHERE quote = ?").run(ageS, quote);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pendingQuote = () => String((s.db.prepare("SELECT quote FROM cashu_withdraw WHERE state = 'pending'").get() as { quote?: string } | undefined)?.quote ?? "");

/** Internal books (the fee total is not on the balance). */
const books = () => d.ownerBooks();

function storedSum(): number {
  return Number((s.db.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM cashu_proof").get() as { n: number }).n);
}

/** Every sat is stored, held by a pending withdrawal, paid out, or fee. */
function conserved(total: number) {
  const b = books();
  assert.equal(storedSum() + b.withdrawing_sat + b.withdrawn_sat + b.withdraw_fee_sat, total, "every sat is accounted for");
}

test("owner routes are off while OWNER_KEY is unset or short: every /v1/owner/ path falls through to the 404", async () => {
  seed(10);
  for (const k of [undefined, "", "short-key", "x".repeat(31)]) {
    env = { CASHU_MINTS: JSON.stringify([MINT]) };
    if (k !== undefined) env.OWNER_KEY = k;
    for (const key of [null, KEY, k ?? null]) {
      assert.equal(await owner("/v1/owner/balance", undefined, { key }), null);
      assert.equal(await owner("/v1/owner/withdraw", { invoice: invoice(5) }, { key }), null);
      assert.equal(await owner("/v1/owner/withdraw/check", { quote: "abc" }, { key }), null);
      assert.equal(await owner("/v1/owner/books", undefined, { key }), null);
    }
  }
  assert.equal(storedSum(), 10, "nothing moved");
  env.OWNER_KEY = KEY;
  assert.equal((await owner("/v1/owner/balance"))?.status, 200, "on once the key is set");
});

test("a missing or wrong owner key is 401, logged without the key, and repeated failures are rate limited", async () => {
  seed(10);
  const logs = captureLogs();
  try {
    assert.equal((await owner("/v1/owner/balance", undefined, { key: null }))?.status, 401);
    assert.equal((await owner("/v1/owner/balance", undefined, { key: KEY + "x" }))?.status, 401);
    assert.equal((await owner("/v1/owner/withdraw", { invoice: invoice(5) }, { key: KEY.slice(0, -1) }))?.status, 401);
  } finally { logs.restore(); }
  assert.equal(logs.parsed().filter((l) => l.event === "owner_auth").length, 3);
  assert.ok(!logs.lines.some((l) => l.includes(KEY.slice(0, 16))), "the key is not logged");
  for (let i = 0; i < 10; i++) assert.equal((await owner("/v1/owner/balance", undefined, { key: "nope", ip: "198.51.100.7" }))?.status, 401);
  assert.equal((await owner("/v1/owner/balance", undefined, { key: "nope", ip: "198.51.100.7" }))?.status, 429);
  assert.equal((await owner("/v1/owner/balance", undefined, { ip: "198.51.100.7" }))?.status, 429, "the limit holds for that address");
  assert.equal((await owner("/v1/owner/balance"))?.status, 200, "another address is not limited");
  assert.equal(storedSum(), 10);
});

test("balance: exactly the documented fields, in msat, never a proof value", async () => {
  seed(37);
  s.db.prepare("INSERT INTO cashu_proof (secret, mint, unit, amount, keyset, c) VALUES (?, ?, 'sat', ?, ?, ?)").run("other-secret", "https://mint.other.example", 4, mint.keysetId, "02" + "cd".repeat(32));
  d.noteCounters({ paid_writes: 1, sats_settled: 10 });
  d.noteCounters({ paid_writes: 1, sats_settled: 10 }, true);
  const r = await owner("/v1/owner/balance");
  assert.equal(r?.status, 200);
  assert.deepEqual(Object.keys(r!.body).sort(), BALANCE_KEYS);
  assert.deepEqual(r!.body, {
    available_msat: 41_000,
    available_usd: "0.0410",
    pending_msat: 0,
    losses_msat: 0,
    withdrawn_msat: 0,
    paid_requests: 2,
    mint: MINT,
    degraded: false,
    over_hold: false,
  });
  for (const secret of [...seeded, "other-secret"]) assert.ok(!r!.text.includes(secret), "no secret in the body");
  assert.ok(!/"(secret|C|c|C_|B_|r|inputs|outputs)"/.test(r!.text), "no proof fields");
  const noRate = await owner("/v1/owner/balance", undefined, { opts: {} });
  assert.equal(noRate!.body.available_usd, null);
  assert.equal(noRate!.body.degraded, true, "no USD rate is degraded");
  assert.equal((await owner("/v1/owner/books"))?.status, 404, "only one balance shape");
  assert.equal((await owner("/v1/owner/nope"))?.status, 404);
  assert.equal((await owner("/v1/owner/withdraw"))?.status, 404, "GET withdraw is not a route");
});

test("an empty store: zero balance, the configured mint, nothing to withdraw", async () => {
  const b = await balance();
  assert.equal(b.available_msat, 0);
  assert.equal(b.mint, MINT);
  const posts = mint.meltPosts();
  const w = await owner("/v1/owner/withdraw", { invoice: invoice(1) });
  assert.equal(w?.status, 400);
  assert.equal(w!.body.error, "too_much");
  assert.equal(mint.meltPosts(), posts);
});

test("withdraw (a): melts stored proofs to the invoice, stores the change, and books amount and fee once", async () => {
  seed(64);
  const inv = invoice(20);
  const logs = captureLogs();
  let r;
  try { r = await owner("/v1/owner/withdraw", { invoice: inv }); } finally { logs.restore(); }
  assert.equal(r?.status, 200, r?.text);
  assert.equal(r!.body.state, "paid");
  assert.equal(r!.body.amount_msat, 20_000);
  assert.equal(r!.body.fee_msat, 1_000);
  assert.equal(r!.body.change_msat, (64 - 20 - 1) * 1000);
  assert.ok(!r!.text.includes(inv), "the invoice is not echoed");
  assert.deepEqual(logs.parsed().filter((l) => l.event === "owner_withdrawal"), [{ event: "owner_withdrawal", kind: "melt", amount_msat: 20_000, fee_msat: 1_000 }]);
  assert.ok(!logs.lines.some((l) => l.includes(inv)), "the invoice is not logged");
  assert.deepEqual(mint.meltsPaid(), [inv]);
  const b = await balance();
  assert.equal(b.available_msat, 43_000, "available drops by amount + fee");
  assert.equal(b.withdrawn_msat, 20_000);
  assert.equal(b.pending_msat, 0);
  conserved(64);
  // The change is real: it pays a second withdrawal at the same mint.
  const again = await owner("/v1/owner/withdraw", { invoice: invoice(30) });
  assert.equal(again?.body.state, "paid", again?.text);
  conserved(64);
  assert.equal((await balance()).withdrawn_msat, 50_000);
  assert.equal(mint.meltsPaid().length, 2);
});

test("a PAID reply without the change still stores it, from restore of the blank outputs", async () => {
  seed(64);
  mint.setFault("/v1/melt/bolt11", "no-change");
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(20) });
  assert.equal(r!.body.state, "paid", r?.text);
  assert.equal(r!.body.change_msat, 43_000);
  assert.equal(r!.body.fee_msat, 1_000);
  assert.equal(storedSum(), 43);
});

test("withdraw (b)+(f): over-balance, bad and amountless invoices are 400 and nothing is sent to the mint", async () => {
  seed(32);
  const posts = mint.meltPosts();
  const quotes = mint.meltQuotes();
  const noAmount = AMOUNTLESS_INVOICE;
  const cases: [unknown, string][] = [
    [{ invoice: invoice(40) }, "too_much"],
    [{ invoice: invoice(10), mint: "https://mint.other.example" }, "too_much"],
    [{ invoice: "lnbc1notaninvoice" }, "bad_invoice"],
    [{ invoice: noAmount }, "bad_invoice"],
    [{}, "bad_invoice"],
    [{ invoice: "" }, "bad_invoice"],
    [{ invoice: invoice(10), max_fee_sat: -1 }, "malformed"],
  ];
  for (const [body, error] of cases) {
    const r = await owner("/v1/owner/withdraw", body);
    assert.equal(r?.status, 400, JSON.stringify(body));
    assert.equal(r!.body.error, error, JSON.stringify(body));
  }
  assert.equal(mint.meltQuotes(), quotes, "no melt quote was asked for");
  assert.equal(mint.meltPosts(), posts, "no melt was sent");
  assert.equal(storedSum(), 32);
  assert.equal(books().withdrawing_sat, 0);
});

test("withdraw (b): amount + fee reserve over the balance is too_much after the quote, before any melt", async () => {
  seed(32);
  const posts = mint.meltPosts();
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(31) });
  assert.equal(r?.status, 400, r?.text);
  assert.equal(r!.body.error, "too_much");
  assert.equal(r!.body.fee_reserve_msat, 2_000);
  const fee = await owner("/v1/owner/withdraw", { invoice: invoice(10), max_fee_sat: 1 });
  assert.equal(fee!.body.error, "fee_too_high");
  assert.equal(mint.meltPosts(), posts, "no melt was sent");
  assert.equal(Number((s.db.prepare("SELECT COUNT(*) AS n FROM cashu_withdraw").get() as { n: number }).n), 0, "nothing reserved");
  assert.equal(storedSum(), 32);
});

test("a melt quote for another amount than the invoice is refused before anything is reserved or melted", async () => {
  seed(32);
  const posts = mint.meltPosts();
  mint.setMeltQuoteAmount(11);
  try {
    const r = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
    assert.equal(r?.status, 400, r?.text);
    assert.equal(r!.body.error, "mint_bad_quote");
  } finally {
    mint.setMeltQuoteAmount(null);
  }
  assert.equal(mint.meltPosts(), posts, "no melt was sent");
  assert.equal(storedSum(), 32);
  assert.equal(Number((s.db.prepare("SELECT COUNT(*) AS n FROM cashu_withdraw").get() as { n: number }).n), 0, "nothing reserved");
});

test("withdraw (d): a melt the mint refuses or reports unpaid returns every proof, nothing counted", async () => {
  seed(32);
  mint.setFault("/v1/melt/bolt11", "refuse");
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(r?.status, 502, r?.text);
  assert.equal(r!.body.state, "released");
  assert.equal(storedSum(), 32);
  const left = s.db.prepare("SELECT secret FROM cashu_proof ORDER BY secret").all().map((x) => String((x as { secret: string }).secret));
  assert.deepEqual(left, [...seeded].sort(), "the same proofs are back");
  let b = await balance();
  assert.equal(b.withdrawn_msat, 0);
  assert.equal(b.available_msat, 32_000);
  assert.equal(books().withdrawals_pending.length, 0);
  mint.setFault("/v1/melt/bolt11", "unpaid");
  const unpaid = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(unpaid!.body.state, "released");
  b = await balance();
  assert.equal(b.withdrawn_msat, 0);
  assert.equal(b.available_msat, 32_000);
  conserved(32);
});

test("withdraw (c): a lost melt response stays pending with the row written first; the next call settles it as paid once", async () => {
  seed(64);
  mint.setFault("/v1/melt/bolt11", "drop-after");
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(r?.status, 202, r?.text);
  assert.equal(r!.body.state, "pending");
  const row = s.db.prepare("SELECT state FROM cashu_withdraw WHERE quote = ?").get(r!.body.quote) as { state: string } | undefined;
  assert.equal(row?.state, "pending", "the pending row exists after the melt call");
  let b = await balance();
  assert.ok(b.pending_msat >= 12_000, "held, not lost");
  assert.equal(b.available_msat + b.pending_msat, 64_000);
  assert.equal(b.degraded, true, "a withdrawal waits on the mint");
  conserved(64);
  mint.setFault(null, null);
  // The next withdraw settles the lost one first (paid), then makes its own.
  const next = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(next?.status, 200, next?.text);
  b = await balance();
  assert.equal(b.withdrawn_msat, 15_000, "10 settled once, plus 5");
  assert.equal(b.pending_msat, 0);
  const twice = await owner("/v1/owner/withdraw/check", { quote: r!.body.quote });
  assert.equal(twice!.body.state, "paid", "a second check changes nothing");
  assert.equal((await balance()).withdrawn_msat, 15_000);
  conserved(64);
});

test("withdraw (c): the cron settles a lost melt as paid exactly once", async () => {
  seed(32);
  mint.setFault("/v1/melt/bolt11", "drop-after");
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(r!.body.state, "pending");
  mint.setFault(null, null);
  assert.deepEqual(await resolvePendingWithdrawals(env, stubOf(), 1), { checked: 1, pending: 0 });
  assert.deepEqual(await resolvePendingWithdrawals(env, stubOf(), 1), { checked: 0, pending: 0 });
  const b = await balance();
  assert.equal(b.withdrawn_msat, 10_000);
  assert.equal(b.pending_msat, 0);
  assert.equal(books().withdraw_fee_sat, 1);
  conserved(32);
  const c = await owner("/v1/owner/withdraw/check", { quote: r!.body.quote });
  assert.equal(c!.body.state, "paid");
  assert.equal((await balance()).withdrawn_msat, 10_000);
});

test("withdraw (c): two checks of the same lost melt at once book it once", async () => {
  seed(32);
  mint.setFault("/v1/melt/bolt11", "drop-after");
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(r!.body.state, "pending");
  mint.setFault(null, null);
  const [x, y] = await Promise.all([owner("/v1/owner/withdraw/check", { quote: r!.body.quote }), owner("/v1/owner/withdraw/check", { quote: r!.body.quote })]);
  assert.deepEqual([x!.body.state, y!.body.state], ["paid", "paid"]);
  assert.equal((await balance()).withdrawn_msat, 10_000, "counted once");
  assert.equal(books().withdraw_fee_sat, 1);
  conserved(32);
});

test("withdraw (e): two withdrawals at once cannot both be sent; one is 409 busy", async () => {
  seed(64);
  mint.setFault("/v1/melt/bolt11", "pending");
  const posts = mint.meltPosts();
  const [x, y] = await Promise.all([owner("/v1/owner/withdraw", { invoice: invoice(10) }), owner("/v1/owner/withdraw", { invoice: invoice(10) })]);
  const label = (r: { status: number; body: { state: string; error?: string } }) => r.status + ":" + (r.body.state === "refused" ? r.body.error : r.body.state);
  assert.deepEqual([label(x!), label(y!)].sort(), ["202:pending", "409:busy"]);
  assert.equal(mint.meltPosts(), posts + 1, "one melt sent");
  // While it stays pending, a new withdraw is busy and sends nothing.
  const z = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(z?.status, 409);
  assert.equal(mint.meltPosts(), posts + 1);
  conserved(64);
});

test("a pending Lightning payment keeps the proofs until the mint settles it either way", async () => {
  seed(32);
  seed(32);
  mint.setFault("/v1/melt/bolt11", "pending");
  const a = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(a!.body.state, "pending");
  mint.setFault(null, null);
  assert.equal((await owner("/v1/owner/withdraw/check", { quote: a!.body.quote }))!.body.state, "pending", "still in flight");
  const held = storedSum();
  mint.settleMelt(a!.body.quote, "UNPAID");
  // Unpaid with every input unspent, but the row is younger than the melt timeout + 30 s: kept.
  const young = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
  assert.equal(young!.body.state, "pending", "not released while the melt may still be in flight");
  assert.equal(storedSum(), held);
  ageRow(a!.body.quote, RELEASE_AGE_S + 1);
  const released = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
  assert.equal(released!.body.state, "released");
  assert.ok(storedSum() > held);
  const kept = s.db.prepare("SELECT outputs FROM cashu_withdraw WHERE quote = ?").get(a!.body.quote) as { outputs: string };
  assert.ok(JSON.parse(kept.outputs).length > 0, "the blank change outputs are kept on release");
  mint.setFault("/v1/melt/bolt11", "pending");
  const z = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(z!.body.state, "pending");
  mint.setFault(null, null);
  mint.settleMelt(z!.body.quote, "PAID");
  const paid = await owner("/v1/owner/withdraw/check", { quote: z!.body.quote });
  assert.equal(paid!.body.state, "paid");
  assert.equal((await balance()).withdrawn_msat, 10_000);
  conserved(64);
  assert.equal((await owner("/v1/owner/withdraw/check", { quote: "unknown" }))?.status, 404);
});

test("the melt inputs are spent at the mint and gone from the store; nothing else changed", async () => {
  seed(16);
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(8) });
  assert.equal(r!.body.state, "paid");
  const res = await fetch(mint.url + "/v1/checkstate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ Ys: seeded.map(secretY) }) });
  const states = (await res.json()).states.map((x: { state: string }) => x.state);
  assert.deepEqual(states, seeded.map(() => "SPENT"));
  const left = s.db.prepare("SELECT secret FROM cashu_proof").all().map((x) => String((x as { secret: string }).secret));
  assert.ok(seeded.every((sec) => !left.includes(sec)));
  const row = s.db.prepare("SELECT state, inputs, outputs FROM cashu_withdraw").get() as { state: string; inputs: string; outputs: string };
  assert.deepEqual({ ...row }, { state: "paid", inputs: "[]", outputs: "[]" }, "a closed row keeps no proof");
});

test("a lightning_address body is not a withdraw destination: an invoice is required", async () => {
  seed(32);
  const posts = mint.meltPosts();
  const r = await owner("/v1/owner/withdraw", { lightning_address: "owner@pay.example.com", amount_sat: 10 });
  assert.equal(r?.status, 400);
  assert.equal(r!.body.error, "bad_invoice");
  assert.equal(mint.meltPosts(), posts);
});

test("a Lightning address resolves to an invoice for exactly the amount, over https only", async () => {
  const pr = invoice(21);
  const seen: string[] = [];
  const fake = (pay: string, callback = "https://pay.example.com/cb?x=1") => (async (url: string | URL | Request) => {
    const href = String(url);
    seen.push(href);
    if (href.includes("/.well-known/lnurlp/")) return new Response(JSON.stringify({ tag: "payRequest", callback, minSendable: 1000, maxSendable: 1_000_000_000, metadata: "[]" }));
    return new Response(JSON.stringify({ pr: pay }));
  }) as typeof fetch;
  assert.equal(await resolveLightningAddress("Owner@Pay.Example.com", 21, fake(pr)), pr);
  assert.equal(seen[0], "https://pay.example.com/.well-known/lnurlp/owner");
  assert.equal(new URL(seen[1]).searchParams.get("amount"), "21000");
  await assert.rejects(resolveLightningAddress("owner@pay.example.com", 21, fake(invoice(22))), /malformed/);
  await assert.rejects(resolveLightningAddress("owner@pay.example.com", 21, fake(pr, "http://pay.example.com/cb")), /malformed/);
  for (const bad of ["owner@127.0.0.1", "owner@localhost", "nobody", "a@b"]) await assert.rejects(resolveLightningAddress(bad, 21, fake(pr)), /malformed/);
});

for (const callback of ["https://127.0.0.1/cb", "https://10.0.0.5/cb", "https://169.254.169.254/latest", "https://[::1]/cb", "https://localhost/cb", "https://192.168.1.1/cb", "https://pay.local/cb", "https://pay." + "internal/cb"]) {
  test("a Lightning address callback on a non-public host is refused before it is fetched: " + callback, async () => {
    const pr = invoice(21);
    const seen: string[] = [];
    const fake = (async (url: string | URL | Request) => {
      seen.push(String(url));
      if (String(url).includes("/.well-known/lnurlp/")) return new Response(JSON.stringify({ tag: "payRequest", callback, minSendable: 1000, maxSendable: 1_000_000_000, metadata: "[]" }));
      return new Response(JSON.stringify({ pr }));
    }) as typeof fetch;
    await assert.rejects(resolveLightningAddress("owner@pay.example.com", 21, fake), /malformed/);
    assert.equal(seen.length, 1, "the callback was not fetched");
  });
}

// F1: a check that lands while the first withdraw's melt POST is still on its way to the mint.
// The proxy holds the melt for 400 ms; the check sees UNPAID and every input UNSPENT, and must not
// return the proofs, because the mint pays when the melt arrives.
for (const how of ["withdraw/check", "a second withdraw", "the cron"] as const) {
  test(`a check via ${how} while the first melt is in flight keeps the row; the paid melt is booked once with its change`, async () => {
    seed(64);
    env.CASHU_FETCH_PROXY = proxyUrl;
    px.meltDelayMs = 400;
    const paidBefore = mint.meltsPaid().length;
    const first = owner("/v1/owner/withdraw", { invoice: invoice(5) });
    let quote = "";
    for (let i = 0; i < 200 && !quote; i++) { await sleep(5); quote = pendingQuote(); }
    assert.ok(quote, "the first withdraw reserved its row");
    if (how === "withdraw/check") {
      const c = await owner("/v1/owner/withdraw/check", { quote });
      assert.equal(c?.status, 202, c?.text);
      assert.equal(c!.body.state, "pending");
    } else if (how === "a second withdraw") {
      const w = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
      assert.equal(w?.status, 409, w?.text);
      assert.equal(w!.body.error, "busy");
    } else {
      assert.deepEqual(await resolvePendingWithdrawals(env, stubOf(), 1), { checked: 1, pending: 1 });
    }
    const a = await first;
    assert.equal(a?.status, 200, a?.text);
    assert.equal(a!.body.state, "paid");
    assert.equal(mint.meltsPaid().length, paidBefore + 1, "the mint paid the invoice once");
    const b = books();
    assert.equal(b.withdrawn_sat, 5, "the paid invoice is booked");
    assert.equal(b.withdraw_fee_sat, 1);
    assert.equal(storedSum(), 64 - 5 - 1, "the change is stored and the spent inputs are gone");
    assert.equal(b.withdrawals_pending.length, 0);
    conserved(64);
    px.meltDelayMs = 0;
    const next = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
    assert.equal(next?.status, 200, next?.text);
    assert.equal(books().withdrawn_sat, 15, "later withdrawals are not blocked");
    conserved(64);
  });
}

test("a row released by mistake is settled when its melt turns out PAID; a withdrawal holding its spent proofs is let go", async () => {
  seed(64);
  env.CASHU_FETCH_PROXY = proxyUrl;
  px.meltDelayMs = 300;
  const first = owner("/v1/owner/withdraw", { invoice: invoice(5) });
  let quote = "";
  for (let i = 0; i < 200 && !quote; i++) { await sleep(5); quote = pendingQuote(); }
  assert.ok(quote);
  // A release forced past the age rule, as an older build or a stuck clock could do.
  assert.equal(d.withdrawRelease(quote, 0), true);
  assert.equal(storedSum(), 64, "the inputs are back in the store");
  const row = s.db.prepare("SELECT outputs FROM cashu_withdraw WHERE quote = ?").get(quote) as { outputs: string };
  assert.ok(JSON.parse(row.outputs).length > 0, "the blank change outputs are kept on release");
  // A second withdrawal reserves the same (soon spent) proofs while the first melt is still in flight.
  const second = owner("/v1/owner/withdraw", { invoice: invoice(5) });
  const a = await first;
  assert.equal(a!.body.state, "paid", a?.text);
  const z = await second;
  assert.notEqual(z?.status, 200, z?.text);
  const b = books();
  assert.equal(b.withdrawn_sat, 5, "booked once");
  assert.equal(b.withdraw_fee_sat, 1);
  assert.equal(storedSum(), 58, "no phantom coins: spent inputs gone, change stored");
  assert.equal(b.withdrawals_pending.length, 0, "nothing stays pending");
  conserved(64);
  assert.equal((await owner("/v1/owner/withdraw/check", { quote }))!.body.state, "paid");
  px.meltDelayMs = 0;
  const next = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(next?.status, 200, next?.text);
  conserved(64);
});

test("a released row found PAID by a later check is settled from its kept outputs", async () => {
  seed(64);
  mint.setFault("/v1/melt/bolt11", "pending");
  const a = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(a!.body.state, "pending");
  mint.setFault(null, null);
  assert.equal(d.withdrawRelease(a!.body.quote, 0), true, "released by mistake");
  assert.equal(storedSum(), 64);
  mint.settleMelt(a!.body.quote, "PAID");
  const c = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
  assert.equal(c?.status, 200, c?.text);
  assert.equal(c!.body.state, "paid");
  assert.equal(c!.body.change_msat, 58_000);
  assert.equal(storedSum(), 58);
  assert.equal(books().withdrawn_sat, 5);
  conserved(64);
});

test("unpaid quote, old enough, but only some inputs unspent: the row keeps every proof", async () => {
  seed(32);
  seed(32);
  env.CASHU_FETCH_PROXY = proxyUrl;
  mint.setFault("/v1/melt/bolt11", "pending");
  const a = await owner("/v1/owner/withdraw", { invoice: invoice(40) });
  assert.equal(a!.body.state, "pending");
  mint.setFault(null, null);
  mint.settleMelt(a!.body.quote, "UNPAID");
  ageRow(a!.body.quote, RELEASE_AGE_S + 1);
  const held = storedSum();
  px.firstSpent = true;
  const c = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
  assert.equal(c!.body.state, "pending", "one SPENT input: not released");
  assert.equal(storedSum(), held);
  assert.equal(books().withdrawals_pending.length, 1);
  px.firstSpent = false;
  const r = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
  assert.equal(r!.body.state, "released", "every input unspent: released");
  conserved(64);
});

test("a 502 from the melt POST while the mint still takes the melt stays pending and settles as paid", async () => {
  seed(64);
  env.CASHU_FETCH_PROXY = proxyUrl;
  px.meltGateway = true;
  px.meltDelayMs = 200;
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(r?.status, 202, r?.text);
  assert.equal(r!.body.state, "pending");
  await sleep(400);
  px.meltGateway = false;
  px.meltDelayMs = 0;
  const c = await owner("/v1/owner/withdraw/check", { quote: r!.body.quote });
  assert.equal(c!.body.state, "paid", c?.text);
  assert.equal(books().withdrawn_sat, 5);
  assert.equal(storedSum(), 58);
  conserved(64);
});

test("store: release changes nothing on a paid or already released row", async () => {
  seed(64);
  const r = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(r!.body.state, "paid");
  const stored = storedSum();
  assert.equal(d.withdrawRelease(r!.body.quote, 0), false, "a paid row is not released");
  assert.equal(storedSum(), stored, "no spent proof comes back");
  assert.equal((s.db.prepare("SELECT state FROM cashu_withdraw WHERE quote = ?").get(r!.body.quote) as { state: string }).state, "paid");
  assert.equal(books().withdrawn_sat, 5);
  mint.setFault("/v1/melt/bolt11", "pending");
  const p = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  mint.setFault(null, null);
  assert.equal(d.withdrawRelease(p!.body.quote, 0), true);
  const after = storedSum();
  assert.equal(d.withdrawRelease(p!.body.quote, 0), false, "a released row is not released twice");
  assert.equal(storedSum(), after, "nothing is stored twice");
  assert.equal(d.withdrawRelease("no-such-quote", 0), false);
});

test("store: release refuses a pending row younger than the minimum age", async () => {
  seed(32);
  mint.setFault("/v1/melt/bolt11", "pending");
  const p = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  mint.setFault(null, null);
  const held = storedSum();
  assert.equal(d.withdrawRelease(p!.body.quote, RELEASE_AGE_S), false, "too young");
  assert.equal(storedSum(), held);
  // A few seconds under the minimum age (a margin so a clock tick during the test cannot cross it).
  ageRow(p!.body.quote, RELEASE_AGE_S - 3);
  assert.equal(d.withdrawRelease(p!.body.quote, RELEASE_AGE_S), false, "still under the minimum age");
  assert.equal(storedSum(), held);
  ageRow(p!.body.quote, 4);
  assert.equal(d.withdrawRelease(p!.body.quote, RELEASE_AGE_S), true, "older than the minimum age");
  assert.equal(storedSum(), 32);
});

test("store: reserve takes inputs that cover amount + fee reserve + input fees, not one sat less", async () => {
  const add = (secret: string, amount: number) =>
    s.db.prepare("INSERT INTO cashu_proof (secret, mint, unit, amount, keyset, c) VALUES (?, ?, 'sat', ?, ?, ?)").run(secret, MINT, amount, mint.keysetId, "02" + "ab".repeat(32));
  [8, 4, 2, 1, 1].forEach((a, i) => add("p" + i, a));
  const out = [{ amount: 1, id: mint.keysetId, secret: "s", r: "00".repeat(32), B_: "02" + "cd".repeat(32) }];
  const r = d.withdrawReserve({ quote: "q1", mint: MINT, amount: 13, feeReserve: 2, ppk: {}, outputs: out, maxInputs: 100 });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal((r as { inputs: { amount: number }[] }).inputs.reduce((n, p) => n + p.amount, 0), 15, "exactly 13 + 2");
  d.withdrawRelease("q1", 0);
  // At 1000 ppk (1 sat per input) all five proofs (16) are short of 15 + 5.
  const fee = d.withdrawReserve({ quote: "q2", mint: MINT, amount: 13, feeReserve: 2, ppk: { [mint.keysetId]: 1000 }, outputs: out, maxInputs: 100 });
  assert.deepEqual(fee, { ok: false, error: "too_much" });
  const fits = d.withdrawReserve({ quote: "q3", mint: MINT, amount: 10, feeReserve: 1, ppk: { [mint.keysetId]: 500 }, outputs: out, maxInputs: 100 });
  // 8 -> need 11+1, +4 -> 12 >= 11+1 (two inputs at 500 ppk round up to 1 sat).
  assert.equal(fits.ok, true, JSON.stringify(fits));
  assert.equal((fits as { inputs: { amount: number }[] }).inputs.reduce((n, p) => n + p.amount, 0), 12);
});

test("withdraw: a real amountless invoice (valid checksum, no amount) is 400 bad_invoice before any mint call", async () => {
  seed(32);
  const quotes = mint.meltQuotes();
  const posts = mint.meltPosts();
  const r = await owner("/v1/owner/withdraw", { invoice: AMOUNTLESS_INVOICE });
  assert.equal(r?.status, 400, r?.text);
  assert.equal(r!.body.error, "bad_invoice");
  assert.equal(mint.meltQuotes(), quotes, "no melt quote was asked for");
  assert.equal(mint.meltPosts(), posts);
  assert.equal(storedSum(), 32);
});

// Top-up: released-row re-checks and the grace past the melt timeout.
test("an honestly released row (the mint refused the melt) re-checked twice stays released and nothing is booked", async () => {
  seed(64);
  mint.setFault("/v1/melt/bolt11", "refuse");
  const a = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(a?.status, 502, a?.text);
  assert.equal(a!.body.state, "released");
  mint.setFault(null, null);
  for (let i = 0; i < 2; i++) {
    const c = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
    assert.equal(c!.body.state, "released", "check " + (i + 1) + ": " + c?.text);
  }
  assert.equal(storedSum(), 64, "every proof is still stored");
  assert.equal(books().withdrawn_sat, 0);
  assert.equal(books().withdraw_fee_sat, 0);
  conserved(64);
});

test("a melt the mint paid while reporting UNPAID/UNSPENT is released; the next withdraw reusing those proofs settles it and nothing stays pending", async () => {
  seed(64);
  env.CASHU_FETCH_PROXY = proxyUrl;
  px.lie = true;
  const paidBefore = mint.meltsPaid().length;
  const a = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(a!.body.state, "released", a?.text);
  assert.equal(mint.meltsPaid().length, paidBefore + 1, "the mint did pay it");
  assert.equal(storedSum(), 64, "released: the (spent) inputs are back in the store");
  px.lie = false;
  // The next withdraw reserves the same spent proofs; the mint refuses them; its check finds them
  // SPENT on an UNPAID quote and re-checks the released row, which the mint reports PAID.
  const w = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.notEqual(w?.status, 200, w?.text);
  const b = books();
  assert.equal(b.withdrawals_pending.length, 0, "nothing stays pending: " + w?.text);
  assert.equal(b.withdrawn_sat, 5, "the paid melt is booked once");
  assert.equal(b.withdraw_fee_sat, 1);
  assert.equal(storedSum(), 58, "spent inputs gone, change stored");
  conserved(64);
  const next = await owner("/v1/owner/withdraw", { invoice: invoice(10) });
  assert.equal(next?.status, 200, next?.text);
  conserved(64);
});

test("an unpaid row 30 s old (past the 25 s melt timeout, inside the 30 s grace) is not released by a check", async () => {
  seed(64);
  mint.setFault("/v1/melt/bolt11", "pending");
  const a = await owner("/v1/owner/withdraw", { invoice: invoice(5) });
  assert.equal(a!.body.state, "pending");
  mint.setFault(null, null);
  mint.settleMelt(a!.body.quote, "UNPAID");
  ageRow(a!.body.quote, 30);
  const c = await owner("/v1/owner/withdraw/check", { quote: a!.body.quote });
  assert.equal(c!.body.state, "pending", c?.text);
  assert.equal(storedSum(), 0, "the row still holds every proof");
  assert.equal(books().withdrawals_pending.length, 1);
  conserved(64);
});
