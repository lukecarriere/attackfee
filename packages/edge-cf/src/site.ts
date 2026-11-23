// attackfee-site worker: static assets plus the demo. The gate and issuer are the shared edge
// handler. The store is one SQLite-backed Durable Object. POST /demo/contact is the origin: it
// answers Accepted and never stores, echoes, emails or logs the text.
import { AttackfeeError } from "../../protocol/src/index.ts";
import { createEdgeHandler, edgeFxQuote, type EdgeEnv } from "./handler.ts";
import { DurableObjectStore, DurableProofStore, storeFailSlot, AttackfeeStoreDO, type AttackfeeDoStub } from "./do-store.ts";
import { movedPage, workerHandles, wwwRedirect } from "./host-redirect.ts";
import { serveSite } from "./agent-view.ts";
import { ownerEnabled, ownerRoute, resolvePendingWithdrawals, type OwnerEnv } from "./owner.ts";
import { holdThreshold } from "./hold.ts";

export { AttackfeeStoreDO };

interface Assets { fetch(req: Request): Promise<Response>; }
interface DoNs {
  idFromName(name: string): unknown;
  get(id: unknown): AttackfeeDoStub;
}

export interface SiteEnv extends EdgeEnv, OwnerEnv {
  ASSETS: Assets;
  ATTACKFEE_STORE: DoNs;
  /** Whole-process fail-closed switch. Unset in wrangler.toml. */
  STORE_FAIL?: string;
  /**
   * Test-only. Unset in wrangler.toml. When "1", the x-attackfee-store-fail request header makes this
   * request's store calls fail closed. Pages are served without the store, so they stay up.
   */
  ATTACKFEE_TEST_HOOKS?: string;
}

const INSTANCE = "toll";

function stub(env: SiteEnv): AttackfeeDoStub {
  return env.ATTACKFEE_STORE.get(env.ATTACKFEE_STORE.idFromName(INSTANCE));
}

function storeFor(env: SiteEnv): DurableObjectStore {
  return new DurableObjectStore(stub(env));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const handler = createEdgeHandler<SiteEnv>({
  // A stub from one request cannot be used on the next (Workers I/O isolation).
  freshStore: true,
  store: storeFor,
  proofStore: (env) => new DurableProofStore(stub(env)),
  preserveFields: false,
  payPath: "/v1/demo/agent",
  async forward(req, env, url) {
    // In-worker origin. The body is not read, stored, echoed or logged.
    if (req.method.toUpperCase() === "POST" && url.pathname === "/demo/contact") {
      if ((req.headers.get("accept") ?? "").includes("application/json")) return json({ ok: true });
      return new Response(null, { status: 303, headers: { location: "/demo?sent=contact" } });
    }
    return env.ASSETS.fetch(req);
  },
});

function inject(req: Request, env: SiteEnv): boolean {
  if (env.STORE_FAIL === "1") return true;
  return env.ATTACKFEE_TEST_HOOKS === "1" && req.headers.get("x-attackfee-store-fail") === "1";
}

export default {
  async fetch(req: Request, env: SiteEnv): Promise<Response> {
    // Host canonicalisation runs before the gate. The worker runs first so the redirect
    // can see every path. Only a real static page or file is then served by ASSETS.
    // A gated route such as POST /search stays here.
    const redirected = wwwRedirect(req, env.ATTACKFEE_SITE_URL);
    if (redirected) return redirected;
    const moved = movedPage(req);
    if (moved) return moved;
    const url = new URL(req.url);
    if (!workerHandles(url.pathname)) return serveSite(req, env.ASSETS);
    return storeFailSlot.run(inject(req, env), async () => {
      const method = req.method.toUpperCase();
      // Counts for the demo page. A store failure here is 503; the page itself is a static asset.
      // /demo/stats/daily is the last N UTC days; /demo/stats stays today's accepted/rejected only.
      if (url.pathname === "/demo/stats/daily" && (method === "GET" || method === "HEAD")) {
        const raw = url.searchParams.get("days");
        let n = 7;
        if (raw !== null && raw !== "") {
          if (!/^[0-9]+$/.test(raw)) return json({ error: "invalid_days" }, 400);
          n = Number(raw);
          if (n < 1 || n > 30) return json({ error: "invalid_days" }, 400);
        }
        try {
          const body = await storeFor(env).daily(n);
          return new Response(method === "HEAD" ? null : JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch (e) {
          const code = e instanceof AttackfeeError ? e.code : "store_unavailable";
          return json({ error: code }, 503);
        }
      }
      if (url.pathname === "/demo/stats" && (method === "GET" || method === "HEAD")) {
        try {
          const c = await storeFor(env).counts();
          return new Response(method === "HEAD" ? null : JSON.stringify(c), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch (e) {
          const code = e instanceof AttackfeeError ? e.code : "store_unavailable";
          return json({ error: code }, 503);
        }
      }
      // Test hooks only: seed an aged mint-quote row or loss for the scheduled sweep tests.
      if (env.ATTACKFEE_TEST_HOOKS === "1" && url.pathname === "/v1/test/mint-quote-seed" && method === "POST") {
        const b = await req.json().catch(() => null) as Parameters<AttackfeeDoStub["mintQuoteSeed"]>[0] | null;
        if (!b || typeof b.quote !== "string") return json({ error: "malformed" }, 400);
        return json(await stub(env).mintQuoteSeed(b));
      }
      // Owner balance and withdraw. Null (the default, OWNER_KEY unset): the path is handled as before.
      if (url.pathname.startsWith("/v1/owner/")) {
        if (ownerEnabled(env) && storeFailSlot.getStore() === true) return json({ error: "store_unavailable" }, 503);
        try {
          const owner = await ownerRoute(req, env, stub(env), req.headers.get("cf-connecting-ip"), { fx: edgeFxQuote });
          if (owner) return owner;
        } catch (e) {
          const malformed = e instanceof AttackfeeError && e.code === "malformed";
          return json({ error: malformed ? "malformed" : "store_unavailable" }, malformed ? 400 : 503);
        }
      }
      return handler.fetch(req, env);
    });
  },

  /**
   * Cron (wrangler.toml [triggers]): one bounded mint-quote sweep in the Durable Object, then one
   * summary log line. Workers Free allows 50 subrequests. This RPC (1), DNS (2 per host, once
   * per run including a failure) and the mint calls share a ceiling of 45, and the mint calls
   * themselves stay at most SWEEP_MAX_CALLS (40).
   */
  async scheduled(controller: { cron: string }, env: SiteEnv): Promise<void> {
    const t0 = Date.now();
    const line: Record<string, unknown> = { event: "mint_quote_sweep", cron: controller.cron };
    if (env.STORE_FAIL === "1") {
      console.log(JSON.stringify({ ...line, skipped_run: "store_fail", ms: 0 }));
      return;
    }
    try {
      Object.assign(line, await stub(env).mintQuoteSweep({}));
    } catch (e) {
      line.error = e instanceof AttackfeeError ? e.code : "store_unavailable";
    }
    line.ms = Date.now() - t0;
    console.log(JSON.stringify(line));
    await ownerCron(env, line);
  },
};

/**
 * After the sweep: the held-balance check (one store call, one log line per UTC day when over), and,
 * with the owner key set, settling up to one pending withdrawal from the mint. The withdrawal check
 * is skipped when the sweep used most of the subrequest ceiling; the next run tries again.
 */
async function ownerCron(env: SiteEnv, sweep: Record<string, unknown>): Promise<void> {
  try {
    const hold = await stub(env).holdCheck(holdThreshold(env.CASHU_HOLD_ALERT_MSAT));
    if (hold.alert) console.log(JSON.stringify({ event: "cashu_hold_alert", available_msat: hold.available_msat }));
  } catch { /* the next run checks again */ }
  if (!ownerEnabled(env)) return;
  if (sweep.error || sweep.stop === "calls" || Number(sweep.calls ?? 0) > 30) return;
  try {
    const r = await resolvePendingWithdrawals(env, stub(env), 1);
    if (r.checked) console.log(JSON.stringify({ event: "owner_withdraw_cron", checked: r.checked, pending: r.pending }));
  } catch {
    console.log(JSON.stringify({ event: "owner_withdraw_cron", error: "store_unavailable" }));
  }
}
