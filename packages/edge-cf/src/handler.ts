// Attackfee edge handler (spec §11). One fetch handler is both issuer (/v1/*) and gate:
//   GET / HEAD and free paths   -> forwarded (origin proxy, or static assets) untouched
//   POST/PUT/PATCH/DELETE to a gated path:
//     valid attackfee_pass cookie or Authorization: Attackfee <pass> -> one use spent, request forwarded
//     else Accept: application/json -> 403 {"error":"attackfee_required","challenge":{...}}
//     else -> 403 HTML interstitial that runs the check and re-sends a urlencoded form (last resort)
//   /v1/challenge, /v1/redeem, /v1/siteverify, /v1/status, /v1/health -> the Attackfee facade
//   /attackfee/v1/attackfee.js and its worker -> the widget, served same-origin
// The store is pluggable (KV, memory, or a Durable Object). Never logs bodies, cookies or
// Authorization values. Work stays available. Cashu receive is on when CASHU_MINTS is set and a
// proof store is bound (the site worker's ATTACKFEE_STORE). The local edge worker leaves both unset.
import { AttackfeeError, isActionClass, timingSafeEqual, utf8, siteUrl, ipBytes, type ActionClass } from "../../protocol/src/index.ts";
import { createAttackfee } from "../../server-node/src/attackfee.ts";
import { normalizeConfig } from "../../server-node/src/config.ts";
import { Metrics } from "../../server-node/src/metrics.ts";
import type { AttackfeeStore } from "../../server-node/src/stores.ts";
import { buildManifest, agentsPointer, howToPay, priceBody, PAID_CLASSES } from "../../server-node/src/manifest.ts";
import { offerAmountMsat } from "../../settlement-ln/src/stub-engine.ts";
import { FX_MAX_AGE_S, PublicBtcUsdRate, type FxQuote, type FxSource } from "../../settlement-ln/src/fx.ts";
import { CashuReceiveEngine } from "../../settlement-ln/src/cashu-receive.ts";
import { parseCashuMints } from "../../settlement-ln/src/cashu-net.ts";
import { parseL402Authorization, paymentHashOf, paymentRequired, presentedCashu, QUOTE_KIND, quoteMode, quoteRetryHeaders, stubEngineSecret, withQuoteOffer } from "../../settlement-ln/src/index.ts";
import type { ProofStore } from "../../settlement-ln/src/cashu-store.ts";
import type { KVLike } from "./kv-store.ts";
import { cashuFaultSlot, cashuFetch, holdBeforeSwap, mintFetches, releaseBeforeSwap } from "./cashu-edge.ts";
// Widget files, bundled as text by build.mjs.
import ATTACKFEE_JS from "../../widget/dist/attackfee.js";
import ATTACKFEE_WORKER_JS from "../../widget/dist/attackfee.worker.js";

export interface EdgeEnv {
  SITE_ID: string;
  SITE_SECRET: string;
  ORIGIN?: string;
  WRITE_PATHS?: string;
  SEARCH_PATHS?: string;
  ACCOUNT_PATHS?: string;
  FREE_PATHS?: string;
  ALLOWED_ORIGINS?: string;
  /** Attackfee's public site root for the manifest's `docs` (packages/protocol site-url.ts). Unset by default: docs is null. */
  ATTACKFEE_SITE_URL?: string;
  ATTACKFEE_KV?: KVLike;
  /** JSON array of https mint URLs. Unset: work only, settlement "off". */
  CASHU_MINTS?: string;
  /** Test-only. Unset in wrangler.toml. Enables the cashu fault header and the loopback fetch proxy. */
  ATTACKFEE_TEST_HOOKS?: string;
  /**
   * Production quote offer. The site worker sets "1" in wrangler.toml.
   * Any other value, including unset, leaves the cashu-only 402. Not a test hook.
   */
  L402_ENABLED?: string;
  /** Test-only fetch stand-in for the allowlisted mint. Ignored unless ATTACKFEE_TEST_HOOKS is "1". */
  CASHU_FETCH_PROXY?: string;
}

/** Store methods the Durable Object adds. Memory and KV leave them unset. */
export interface EdgeStore extends AttackfeeStore {
  /** Fixed-window increment. Returns the count in the current window. One round trip. */
  windowHit?(key: string, window_s: number): Promise<number>;
  /** Today's accepted or rejected gated writes. One round trip. */
  note?(kind: "accepted" | "rejected", test?: boolean): Promise<void>;
  /** Additive daily earnings counters. Test traffic uses the same marker as note(). */
  noteCounters?(delta: { paid_writes?: number; free_writes?: number; sats_settled?: number; offers_402?: number }, test?: boolean): Promise<void>;
}

export interface EdgeOptions<E extends EdgeEnv> {
  store(env: E): EdgeStore;
  /** Where an allowed request goes. Default: proxy to env.ORIGIN. */
  forward?(req: Request, env: E, url: URL): Promise<Response>;
  /**
   * Repeat urlencoded fields in the HTML interstitial so the check can re-send them.
   * The site demo turns this off: nothing a visitor types is echoed.
   */
  preserveFields?: boolean;
  /**
   * Build the store on every request. A Durable Object stub is request-scoped and cannot be
   * reused on a later request. Memory and KV keep the default (one store for the isolate).
   */
  freshStore?: boolean;
  /** Durable proof store. Required before CASHU_MINTS turns receive on. */
  proofStore?(env: E): ProofStore;
  /**
   * Path that answers an unpaid POST with the 402 offer and a paid POST with a pass,
   * without an agent header. The site worker sets `/v1/demo/agent`.
   */
  payPath?: string;
}

const PASS_COOKIE = "attackfee_pass";
const list = (s: string | undefined, d: string[]): string[] => {
  if (!s) return d;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : d; } catch { return d; }
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

function cookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function passFrom(req: Request): string | undefined {
  const a = req.headers.get("authorization");
  if (a && /^Attackfee\s+/i.test(a)) return a.replace(/^Attackfee\s+/i, "").trim();
  return cookies(req)[PASS_COOKIE];
}

/**
 * The client address: CF-Connecting-IP, which Cloudflare sets and overwrites on every request, so a
 * client cannot choose it. X-Forwarded-For is never read here (anyone can write it). Missing or not a
 * plain address (only in local dev without Cloudflare in front): null, so no network (multiplier 1).
 */
const ip = (req: Request): string | null => {
  const v = req.headers.get("cf-connecting-ip");
  return v !== null && ipBytes(v) ? v.trim() : null;
};
/** Challenge rate-limit key: the client address, else one shared bucket ("?") for every request without one. */
const limitKey = (req: Request): string => ip(req) ?? "?";

async function body(req: Request): Promise<Record<string, any>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await req.json().catch(() => ({}))) as Record<string, any>;
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const f = await req.formData().catch(() => null);
    const o: Record<string, any> = {};
    f?.forEach((v, k) => { if (typeof v === "string") o[k] = v; });
    return o;
  }
  return {};
}

function proxy(req: Request, env: EdgeEnv, url: URL): Promise<Response> {
  // Set the parts on the configured origin, so a path starting with // is kept as a path.
  const target = new URL(env.ORIGIN ?? "");
  target.pathname = url.pathname;
  target.search = url.search;
  target.hash = "";
  return fetch(new Request(target, req));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Last-resort interstitial: the widget binds the form, runs the check, and re-sends the fields. */
async function interstitial(req: Request, url: URL, action: ActionClass, preserveFields: boolean): Promise<Response> {
  let fields = "";
  const ct = req.headers.get("content-type") ?? "";
  if (preserveFields && ct.includes("application/x-www-form-urlencoded") && Number(req.headers.get("content-length") ?? 0) <= 16384) {
    const f = await req.formData().catch(() => null);
    f?.forEach((v, k) => { if (typeof v === "string" && k !== "attackfee-pass") fields += `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`; });
  }
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>403</title>
<form method="post" action="${esc(url.pathname + url.search)}" data-attackfee="${action}">${fields}<button type="submit">Send</button></form>
<noscript>This form needs JavaScript.</noscript><script src="/attackfee/v1/attackfee.js" defer></script>`;
  return new Response(html, { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function cookieFor(pass: string, exp: number, now: number, secure: boolean) {
  return `${PASS_COOKIE}=${encodeURIComponent(pass)}; Path=/; Max-Age=${Math.max(0, exp - now)}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

const discoveryMetrics = new Metrics((l) => console.log(l));

function hasWindow(store: EdgeStore): store is EdgeStore & { windowHit(key: string, window_s: number): Promise<number> } {
  return typeof store.windowHit === "function";
}

/** One public rate cache per isolate, shared across getAttackfee rebuilds. */
const edgeFx = new PublicBtcUsdRate();

/**
 * The last good rate, shared by every isolate in a data centre through the Workers Cache API (no
 * binding, no account setting, nothing paid). Without it, /v1/price in one isolate could show USD
 * while /v1/health in another, whose own fetch failed, said "unavailable" in the same minute.
 * The key host never resolves; Cache API keys only need to be URLs.
 */
const FX_CACHE_KEY = "https://attackfee-fx.invalid/v1/usd-per-btc";
interface ColoCache { match(key: string): Promise<Response | undefined>; put(key: string, res: Response): Promise<void>; }
function coloCache(): ColoCache | null {
  const c = (globalThis as { caches?: { default?: ColoCache } }).caches?.default;
  return c && typeof c.match === "function" && typeof c.put === "function" ? c : null;
}

/** The one rate source both /v1/price and /v1/health read (and the 402 offers' USD). */
const sharedFx: FxSource & { refresh(now: number): Promise<FxQuote | null> } = {
  kind: "public",
  quote: (now) => edgeFx.quote(now),
  async refresh(now) {
    const held = edgeFx.quote(now);
    if (held) return held;
    const cache = coloCache();
    if (cache) {
      try {
        const hit = await cache.match(FX_CACHE_KEY);
        if (hit) {
          const q = edgeFx.seed(await hit.json(), now);
          if (q) return q;
        }
      } catch { /* no shared copy; fetch below */ }
    }
    const q = await edgeFx.refresh(now);
    if (q && cache && q.fetched_at === now) {
      const ttl = Math.max(1, FX_MAX_AGE_S - (now - q.fetched_at));
      try {
        await cache.put(FX_CACHE_KEY, new Response(JSON.stringify(q), { headers: { "content-type": "application/json", "cache-control": `max-age=${ttl}` } }));
      } catch { /* the isolate copy still serves this request */ }
    }
    return q;
  },
};

/** The current USD rate from the same shared source as /v1/price (owner balance). Null without one. */
export function edgeFxQuote(): Promise<FxQuote | null> {
  return sharedFx.refresh(Math.floor(Date.now() / 1000));
}

/**
 * The edge fetch handler. `store` is built once per config and kept with the cached Attackfee instance.
 * A store error rejects the write (503); it never forwards the write.
 */
export function createEdgeHandler<E extends EdgeEnv>(options: EdgeOptions<E>) {
  const preserveFields = options.preserveFields !== false;
  let cached: { key: string; attackfee: ReturnType<typeof createAttackfee>; free: string[]; store: EdgeStore } | null = null;

  async function getAttackfee(env: E) {
    const routesFromKv = env.ATTACKFEE_KV ? await env.ATTACKFEE_KV.get("attackfee_routes").catch(() => null) : null;
    const mints = cashuMints(env, options.proofStore);
    const key = [env.SITE_ID, env.SITE_SECRET?.length, env.WRITE_PATHS, env.SEARCH_PATHS, env.ACCOUNT_PATHS, env.FREE_PATHS, routesFromKv, mints.join(","), env.L402_ENABLED === "1" ? "1" : ""].join("|");
    if (!options.freshStore && cached && cached.key === key) return cached;
    let routes: { prefix: string; class: ActionClass }[];
    try { routes = routesFromKv ? JSON.parse(routesFromKv) : []; } catch { routes = []; }
    if (!routes.length) {
      routes = [
        { prefix: "/", class: "read" as const }, // explicit: page views stay free (Amendment 2 §C)
        ...list(env.WRITE_PATHS, ["/contact", "/wp-comments-post.php", "/api/"]).map((prefix) => ({ prefix, class: "write" as const })),
        ...list(env.SEARCH_PATHS, ["/search"]).map((prefix) => ({ prefix, class: "search" as const })),
        ...list(env.ACCOUNT_PATHS, ["/wp-login.php"]).map((prefix) => ({ prefix, class: "account" as const })),
      ];
    }
    const origin = env.ORIGIN || "http://localhost";
    const config = normalizeConfig({
      site_id: env.SITE_ID,
      secret: env.SITE_SECRET,
      issuer_public_url: "http://edge.local",
      hostname: new URL(origin).hostname,
      allowed_origins: list(env.ALLOWED_ORIGINS, []),
      routes,
      // Standard engine only: Argon2id needs runtime WASM compilation, which Workers do not allow
      // (README "Limits"). Escalation is therefore off at the edge.
      work: { mode: "standard", escalate: { at_velocity: Number.MAX_SAFE_INTEGER, classes: [] } },
      ...(mints.length ? { settlement: { enabled: true, backend: "stub", fee_bps: 1000, pass_uses: 1, pass_ttl_s: 60, fx: { source: "public" } } } : {}),
    }, {});
    if (mints.length) config.settlement.cashu = { enabled: true, mints, store: "durable-object" };
    const store = options.store(env);
    const proof = mints.length && options.proofStore ? options.proofStore(env) : undefined;
    const fetchImpl = cashuFetch(env, mints);
    const secret = proof ? await stubEngineSecret(env.SITE_SECRET) : "";
    const base = proof ? new CashuReceiveEngine({
      secret,
      mints,
      store: proof,
      lookup: env.ATTACKFEE_TEST_HOOKS === "1" ? async () => ["1.1.1.1"] : undefined,
      fetch: fetchImpl,
      beforeSwap: async () => {
        if (cashuFaultSlot.getStore() === "crash-before-swap") throw new AttackfeeError("store_unavailable");
        await holdBeforeSwap();
      },
      afterSwap: () => { if (cashuFaultSlot.getStore() === "crash-after-swap") throw new AttackfeeError("store_unavailable"); },
    }) : undefined;
    const mode = quoteMode(env);
    const engine = base && mode !== "off" ? withQuoteOffer(base, {
      secret, mint: mints[0], fetchImpl, mode,
      guard: { lookup: env.ATTACKFEE_TEST_HOOKS === "1" ? async () => ["1.1.1.1"] : undefined, fetch: fetchImpl },
      allowlist: mints,
    }) : base;
    const attackfee = createAttackfee(config, {
      store,
      metrics: new Metrics((l) => console.log(l)),
      ...(engine ? { settlement: { engine, fx: sharedFx } } : {}),
    });
    const built = { key, attackfee, free: list(env.FREE_PATHS, ["/", "/blog"]), store };
    if (!options.freshStore) cached = built;
    return built;
  }

  async function forward(req: Request, env: E, url: URL): Promise<Response> {
    if (options.forward) return options.forward(req, env, url);
    return proxy(req, env, url);
  }

  /** Per-IP challenge limit. The Durable Object window is one call and is exact; otherwise the in-memory counter. */
  async function allow(attackfee: ReturnType<typeof createAttackfee>, store: EdgeStore, req: Request): Promise<boolean> {
    if (hasWindow(store)) return (await store.windowHit("challenge:" + limitKey(req), 60)) <= attackfee.config.rate_limit.challenge_per_min;
    return attackfee.allowChallenge(limitKey(req));
  }

  async function note(store: EdgeStore, kind: "accepted" | "rejected", req: Request): Promise<void> {
    if (!store.note) return;
    await store.note(kind, req.headers.get("attackfee-test") === "1");
  }

  async function noteCounters(store: EdgeStore, delta: { paid_writes?: number; free_writes?: number; sats_settled?: number; offers_402?: number }, req: Request): Promise<void> {
    if (!store.noteCounters) return;
    await store.noteCounters(delta, req.headers.get("attackfee-test") === "1");
  }

  function wholeSats(msat: number): number {
    return Number.isSafeInteger(msat) && msat >= 0 ? Math.floor(msat / 1000) : 0;
  }

  function isAgent(url: URL, req: Request): boolean {
    return url.searchParams.get("client") === "agent" || (req.headers.get("attackfee-client") ?? "").trim().toLowerCase() === "agent";
  }

  async function quotePresented(req: Request, attackfee: ReturnType<typeof createAttackfee>, action: ActionClass, agent: boolean, store: EdgeStore): Promise<Response | null> {
    if (!agent || !attackfee.config.settlement.cashu?.enabled) return null;
    const parsed = parseL402Authorization(req.headers.get("authorization") ?? undefined, "x");
    if (!parsed || !("preimage" in parsed)) return null;
    try {
      const r = await attackfee.redeemQuoted({ macaroon: parsed.credential, preimage: parsed.preimage, action, ip: ip(req) });
      await noteCounters(store, { paid_writes: 1, sats_settled: wholeSats(r.amount_msat) }, req);
      return json({ pass: r.pass, exp: r.exp, cls: r.cls, rail: r.rail });
    } catch (e) {
      const code = e instanceof AttackfeeError ? e.code : "internal";
      if (e instanceof AttackfeeError && code === "store_unavailable" && e.message !== code) return json({ error: code, detail: e.message }, 503, quoteRetryHeaders(e.message));
      if (code === "store_unavailable") return json({ error: code }, 503, quoteRetryHeaders(""));
      return json({ error: code }, code === "malformed" || code === "unsupported" ? 400 : 401);
    }
  }

  async function cashuPresented(req: Request, attackfee: ReturnType<typeof createAttackfee>, action: ActionClass, agent: boolean, store: EdgeStore): Promise<Response | null> {
    if (!agent || !attackfee.config.settlement.cashu?.enabled) return null;
    const presented = presentedCashu(req.headers.get("x-cashu"));
    if (!presented) return null;
    try {
      const r = await attackfee.redeemPresentedToken(presented.token, { action, ip: ip(req) });
      await noteCounters(store, { paid_writes: 1, sats_settled: wholeSats(r.amount_msat) }, req);
      return json({ pass: r.pass, exp: r.exp, cls: r.cls, rail: r.rail });
    } catch (e) {
      const code = e instanceof AttackfeeError ? e.code : "internal";
      return json({ error: code }, code === "store_unavailable" ? 503 : code === "malformed" || code === "unsupported" ? 400 : 401);
    }
  }

  /** R6: the agent 402 says how to pay (same fields as the manifest's payment object). */
  function withHowToPay<B extends { offers: { kind: string }[] }>(body: B, env: E, url: URL): B & { payment?: ReturnType<typeof howToPay> } {
    const mints = cashuMints(env, options.proofStore);
    if (mints.length === 0 || !body.offers.some((o) => o.kind === "cashu")) return body;
    return { ...body, payment: howToPay(url.origin, mints) };
  }

  async function fetch(req: Request, env: E): Promise<Response> {
    const fault = env.ATTACKFEE_TEST_HOOKS === "1" ? (req.headers.get("x-attackfee-cashu-fault") ?? "") : "";
    return cashuFaultSlot.run(fault, () => dispatch(req, env));
  }

  async function dispatch(req: Request, env: E): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();
    // Agent discovery (Amendment 3): free, served before any config or store is touched.
    // With CASHU_MINTS, the gate tool lists Cashu. Otherwise prices are null and status is "stub".
    if ((path === "/.well-known/attackfee.json" || path === "/.well-known/agents.json") && (method === "GET" || method === "HEAD")) {
      const mints = cashuMints(env, options.proofStore);
      const prices = mints.length ? Object.fromEntries(PAID_CLASSES.map((c) => [c, { amount_msat: offerAmountMsat(c), usd: undefined }])) : null;
      let methods: string[] | undefined;
      if (mints.length) {
        let live = false;
        try {
          const r = await cashuFetch(env, mints)(mints[0] + "/v1/info");
          await r.arrayBuffer();
          live = r.ok;
        } catch { live = false; }
        const quote = env.L402_ENABLED === "1" ? true : await loopbackQuoteOffered(env, mints);
        methods = live ? ["cashu", ...(quote ? [QUOTE_KIND] : [])] : [];
      }
      const doc = path === "/.well-known/attackfee.json"
        ? buildManifest({ api: url.origin + "/v1", docs: siteUrl(env.ATTACKFEE_SITE_URL), status: mints.length ? "cashu" : "stub", prices, method: mints.length ? "cashu" : "ln402", methods, pay: mints.length && options.payPath ? url.origin + options.payPath : undefined, how: mints.length ? howToPay(url.origin, mints) : undefined })
        : agentsPointer(url.origin + "/.well-known/attackfee.json");
      discoveryMetrics.discovery(path === "/.well-known/attackfee.json" ? "manifest" : "agents_json");
      return json(doc, 200, { "access-control-allow-origin": "*", "cache-control": "public, max-age=60" });
    }
    // Page loads are never gated (Amendment 2 §A): forwarded before any config or store is touched,
    // so a bad route list or a store outage can't block reading.
    if ((method === "GET" || method === "HEAD" || method === "OPTIONS") && !path.startsWith("/v1/") && !path.startsWith("/attackfee/v1/")) return forward(req, env, url);
    const { attackfee, free, store } = await getAttackfee(env);
    try {
      if (options.payPath && path === options.payPath && method === "POST") {
        const action = "write" as const;
        const presented = await cashuPresented(req, attackfee, action, true, store);
        if (presented) return presented;
        const quoted = await quotePresented(req, attackfee, action, true, store);
        if (quoted) return quoted;
        if (!(await allow(attackfee, store, req))) return json({ error: "attackfee_required" }, 403);
        const offers = await attackfee.offersFor({ action, path, client: "agent", userAgent: req.headers.get("user-agent"), ip: ip(req), source: "middleware" }).catch(() => []);
        if (offers.length > 0) {
          attackfee.metrics.offerShown({ cls: action, amount_msat: offers[0].amount_msat, offers: offers.length });
          const pr = paymentRequired(attackfee.config.site_id, action, path, offers);
          await noteCounters(store, { offers_402: 1 }, req);
          return json(withHowToPay(pr.body, env, url), pr.status, pr.headers);
        }
        attackfee.metrics.turnedAway();
        await note(store, "rejected", req);
        const challenge = await attackfee.issueChallenge({ action, path, client: "agent", userAgent: req.headers.get("user-agent"), ip: ip(req), source: "middleware" });
        return json({ error: "attackfee_required", challenge }, 403);
      }
      if (path === "/attackfee/v1/attackfee.js") return new Response(ATTACKFEE_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" } });
      if (path === "/attackfee/v1/attackfee.worker.js") return new Response(ATTACKFEE_WORKER_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" } });
      if (path.startsWith("/v1/")) return await facade(req, env, url, attackfee, store);

      if (free.some((p) => path === p)) return forward(req, env, url);
      const action = attackfee.classify(path, method).cls as ActionClass | "read";
      if (action === "read") return forward(req, env, url);

      const token = passFrom(req);
      const agent = isAgent(url, req);
      if (token) {
        try {
          const claims = await attackfee.verifyPass(token, { action });
          await note(store, "accepted", req);
          if (claims.rail === "work") await noteCounters(store, { free_writes: 1 }, req);
          return forward(req, env, url);
        } catch (e) {
          if (e instanceof AttackfeeError && e.code === "store_unavailable") return json({ error: "unavailable" }, 503);
          // fall through to a fresh challenge (verifyPass already logged pass_reject with its reason)
        }
      } else {
        attackfee.metrics.passAbsent({ action, status: 403 });
      }
      const presented = await cashuPresented(req, attackfee, action, agent, store);
      if (presented) return presented;
      const quoted = await quotePresented(req, attackfee, action, agent, store);
      if (quoted) return quoted;
      if ((req.headers.get("accept") ?? "").includes("text/html") && !(req.headers.get("accept") ?? "").includes("application/json")) {
        attackfee.metrics.turnedAway();
        await note(store, "rejected", req);
        return interstitial(req, url, action, preserveFields);
      }
      if (!(await allow(attackfee, store, req))) return json({ error: "attackfee_required" }, 403);
      if (agent && attackfee.config.settlement.cashu?.enabled) {
        const offers = await attackfee.offersFor({ action, path, client: "agent", userAgent: req.headers.get("user-agent"), ip: ip(req), source: "middleware" }).catch(() => []);
        if (offers.length > 0) {
          attackfee.metrics.offerShown({ cls: action, amount_msat: offers[0].amount_msat, offers: offers.length });
          const pr = paymentRequired(attackfee.config.site_id, action, path, offers);
          await noteCounters(store, { offers_402: 1 }, req);
          return json(withHowToPay(pr.body, env, url), pr.status, pr.headers);
        }
      }
      attackfee.metrics.turnedAway();
      await note(store, "rejected", req);
      const challenge = await attackfee.issueChallenge({ action, path, client: agent ? "agent" : "widget", userAgent: req.headers.get("user-agent"), ip: ip(req), source: "middleware" });
      return json({ error: "attackfee_required", challenge }, 403);
    } catch (e) {
      if (e instanceof AttackfeeError) return json({ error: e.code }, e.code === "store_unavailable" ? 503 : 400);
      console.log(JSON.stringify({ event: "edge_error", message: (e as Error)?.message }));
      return json({ error: "internal" }, 500);
    }
  }

  async function facade(req: Request, env: E, url: URL, attackfee: ReturnType<typeof createAttackfee>, store: EdgeStore): Promise<Response> {
    const path = url.pathname;
    if (env.ATTACKFEE_TEST_HOOKS === "1" && path === "/v1/test/cashu-books" && req.method === "GET") {
      const proof = options.proofStore?.(env);
      if (!proof) return json({ error: "not_found" }, 404);
      return json(await proof.books());
    }
    if (env.ATTACKFEE_TEST_HOOKS === "1" && path === "/v1/test/release-hold" && req.method === "POST") {
      releaseBeforeSwap();
      return json({ ok: true });
    }
    if (env.ATTACKFEE_TEST_HOOKS === "1" && path === "/v1/test/mint-fetches" && req.method === "GET") {
      const urls = mintFetches.slice();
      mintFetches.length = 0;
      return json({ urls });
    }
    const cashuOn = !!attackfee.config.settlement.cashu?.enabled;
    if (path === "/v1/health") {
      if (!cashuOn || !attackfee.paid) return json({ ok: true, v: "1.0.0", settlement: "off", edge: true });
      try {
        await attackfee.paid.ensureFx();
        const st = await attackfee.paid.status();
        return json({ ok: true, v: "1.0.0", settlement: "cashu", settlement_degraded: !st.healthy || !st.collecting, usd_rate: st.usd, edge: true });
      } catch {
        // Still report the rate /v1/price would use, not a fixed "unavailable".
        return json({ ok: true, v: "1.0.0", settlement: "cashu", settlement_degraded: true, usd_rate: sharedFx.quote(Math.floor(Date.now() / 1000)) ? "ok" : "unavailable", edge: true });
      }
    }
    if (path === "/v1/price" && req.method === "GET") {
      const action = url.searchParams.get("action") ?? "write";
      if (!(PAID_CLASSES as readonly string[]).includes(action)) return json({ error: "bad_action" }, 400);
      const cls = action as (typeof PAID_CLASSES)[number];
      if (cashuOn && attackfee.paid) await attackfee.paid.ensureFx();
      const p = cashuOn ? attackfee.currentPrice({ action: cls, path: url.searchParams.get("path") ?? "/", client: "widget", ip: ip(req) }) : null;
      return json(priceBody({ action: cls, status: p ? "cashu" : "stub", p, challenge_url: attackfee.challengeUrl(cls, url.searchParams.get("path") ?? "/") }));
    }
    if (path === "/v1/challenge" && req.method === "GET") {
      const action = url.searchParams.get("action") ?? "write";
      if (!isActionClass(action) || action === "read") return json({ error: "bad_action" }, 400);
      if (!(await allow(attackfee, store, req))) return json({ error: "rate_limited" }, 429, { "retry-after": "60" });
      const client = url.searchParams.get("client") === "agent" || req.headers.get("attackfee-client") === "agent" ? "agent" : "widget";
      const input = { site: url.searchParams.get("site") ?? undefined, action, path: url.searchParams.get("path") ?? undefined, client: client as "agent" | "widget", userAgent: req.headers.get("user-agent"), ip: ip(req), source: "challenge_endpoint" as const };
      if (url.searchParams.get("offers") === "0" || !cashuOn) {
        const challenge = await attackfee.issueChallenge(input);
        return json({ challenge, offers: [] });
      }
      const { challenge, offers } = await attackfee.issueWithOffers(input);
      return json({ challenge, offers });
    }
    if (path === "/v1/redeem" && req.method === "POST") {
      const b = await body(req);
      if (b.offer_id !== undefined) {
        if (!cashuOn) return json({ error: "unsupported", detail: "paid redeem is not enabled at the edge" }, 400);
        try {
          const r = await attackfee.redeemPaid(b, { ip: ip(req) });
          await noteCounters(store, { paid_writes: 1, sats_settled: wholeSats(r.amount_msat) }, req);
          return json({ pass: r.pass, exp: r.exp, cls: r.cls, rail: r.rail });
        } catch (e) {
          const code = e instanceof AttackfeeError ? e.code : "internal";
          return json({ error: code }, code === "store_unavailable" ? 503 : code === "malformed" || code === "unsupported" ? 400 : 401);
        }
      }
      if (typeof b.challenge_id !== "string" || typeof b.solution !== "object" || b.solution === null) return json({ error: "malformed" }, 400);
      const ch = b.challenge ?? attackfee.findIssued(b.challenge_id);
      if (!ch) return json({ error: "unknown_challenge" }, 401);
      if (ch.id !== b.challenge_id) return json({ error: "malformed" }, 400);
      try {
        const r = await attackfee.verifySolution(ch, b.solution, { ip: ip(req), client: b.client === "agent" ? "agent" : "widget" });
        return json({ pass: r.pass, exp: r.exp, cls: r.cls, rail: r.rail }, 200, { "set-cookie": cookieFor(r.pass, r.exp, attackfee.now(), url.protocol === "https:") });
      } catch (e) {
        const code = e instanceof AttackfeeError ? e.code : "error";
        return json({ error: code }, code === "replay" ? 401 : code === "store_unavailable" ? 503 : 400);
      }
    }
    if (path === "/v1/status" && req.method === "GET") {
      const token = passFrom(req);
      if (!token) return json({ ok: false });
      try {
        const c = await attackfee.verifyPass(token, { action: "search", consume: false });
        return json({ ok: true, exp: c.exp, cls: c.cls, n: c.remaining });
      } catch {
        return json({ ok: false });
      }
    }
    if (path === "/v1/siteverify" && req.method === "POST") {
      // Recaptcha-compatible subset (spec §8.5): form or JSON, secret + response (+ optional action).
      const b = await body(req);
      const secret = typeof b.secret === "string" ? b.secret : "";
      if (!timingSafeEqual(utf8(secret), utf8(env.SITE_SECRET))) return json({ success: false, "error-codes": ["invalid-input-secret"] });
      try {
        let token: string;
        const response = b.response;
        if (typeof response === "string" && response.trim().startsWith("{")) {
          const p = JSON.parse(response);
          const ch = p.challenge ?? attackfee.findIssued(p.challenge_id);
          if (!ch || ch.id !== p.challenge_id) throw new AttackfeeError("malformed");
          token = (await attackfee.verifySolution(ch, p.solution ?? {}, { ip: ip(req) })).pass;
        } else {
          token = String(response ?? "");
        }
        const action = isActionClass(b.action) ? b.action : undefined;
        const c = await attackfee.verifyPass(token, { action: action ?? "search" });
        return json({ success: true, action: c.cls, hostname: attackfee.config.hostname, challenge_ts: new Date(c.iat * 1000).toISOString() });
      } catch (e) {
        const code = e instanceof AttackfeeError ? e.code : "invalid-input-response";
        return json({ success: false, "error-codes": [code === "expired" || code === "exhausted" || code === "replay" ? "timeout-or-duplicate" : "invalid-input-response"] });
      }
    }
    return json({ error: "not_found" }, 404);
  }

  return { fetch };
}

/** True when test hooks are on and the mint's quote invoice is the loopback form the 402 can offer. */
async function loopbackQuoteOffered(env: EdgeEnv, mints: string[]): Promise<boolean> {
  if (env.ATTACKFEE_TEST_HOOKS !== "1" || mints.length === 0) return false;
  try {
    const r = await cashuFetch(env, mints)(mints[0] + "/v1/mint/quote/bolt11", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 1, unit: "sat" }),
    });
    const text = await r.text();
    if (!r.ok) return false;
    const parsed: unknown = text ? JSON.parse(text) : null;
    const request = parsed && typeof parsed === "object" && "request" in parsed ? (parsed as { request?: unknown }).request : undefined;
    if (typeof request !== "string") return false;
    paymentHashOf(request);
    return true;
  } catch {
    return false;
  }
}

function cashuMints<E extends EdgeEnv>(env: E, proofStore: EdgeOptions<E>["proofStore"]): string[] {
  if (!proofStore) return [];
  return parseCashuMints(env.CASHU_MINTS, env.ATTACKFEE_TEST_HOOKS === "1");
}
