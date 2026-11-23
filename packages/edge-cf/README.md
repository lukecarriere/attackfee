# packages/edge-cf

Attackfee at the edge (spec §11, phase 3): one Worker that is both the issuer (`/v1/*`) and the gate in
front of any origin, with no origin changes. **Local only**: it runs under `wrangler dev --local`
(workerd, a local KV for the optional route list, and one Durable Object for single-use state).
Nothing here deploys, logs in, or needs an account; `wrangler.toml` has no account, route or zone on purpose.

## Run it locally

```
npm run build                              # widget files the Worker serves
cp packages/edge-cf/.dev.vars.example packages/edge-cf/.dev.vars   # local test secret (gitignored)
npm run dev -w packages/edge-cf            # bundles, then wrangler dev --local on http://127.0.0.1:8789
```

By default it fronts the Node demo on `http://127.0.0.1:8787` (`ORIGIN` in `wrangler.toml`), so with
`npm run demo` running you can try:

```
curl -s http://127.0.0.1:8789/v1/health
curl -s -X POST -H 'accept: application/json' http://127.0.0.1:8789/contact -d '{}'   # 403 + challenge
```

Tests: `node --test tests/edge.test.ts` (starts `wrangler dev --local` on a free port against a
throwaway origin; part of `npm test`).

## Behaviour (spec §11)

| Request | Result |
|---|---|
| GET/HEAD/OPTIONS outside `/v1/` and `/attackfee/v1/` (any prefix, even a gated one), `FREE_PATHS` | proxied to `ORIGIN` before any Attackfee code runs, so page views stay up even if the Attackfee config is broken (Amendment 2: reads stay free) |
| POST/PUT/PATCH/DELETE to a gated prefix with a valid `attackfee_pass` cookie or `Authorization: Attackfee` | one pass use spent, proxied |
| …without a pass, `Accept: application/json` | `403 {"error":"attackfee_required","challenge":{…}}` |
| …without a pass, HTML | `403` interstitial: a `data-attackfee` form that re-sends the urlencoded fields (≤ 16 KB) after the check; `<noscript>` says "This form needs JavaScript." |
| `GET /.well-known/attackfee.json`, `/.well-known/agents.json` | the agent manifest and its pointer (Amendment 3), served before any config or store is touched. The edge is work-only, so prices are null with status `stub`. Logged as `manifest_fetch` / `agents_json_fetch` |
| `/v1/challenge`, `/v1/redeem`, `/v1/status`, `/v1/health`, `/v1/price` | the Attackfee facade (docs/protocol.md); `/v1/price` is always `stub` here |
| `/v1/siteverify` | form or JSON `secret` + `response` (a pass or a redeem payload) + optional `action` → `{success, action, hostname, challenge_ts}` or `{success:false,"error-codes":[…]}` |
| `/attackfee/v1/attackfee.js`, `/attackfee/v1/attackfee.worker.js` | the widget, same-origin |

Config: `SITE_ID`, `SITE_SECRET` (secret), `ORIGIN`, and JSON arrays `WRITE_PATHS`, `SEARCH_PATHS`,
`ACCOUNT_PATHS`, `FREE_PATHS`; optional `ATTACKFEE_SITE_URL` (Attackfee's public site root, e.g. `https://example.com`, for the
manifest's `docs`; unset by default, and wrangler.toml sets none); an optional KV key `attackfee_routes` (`[{"prefix":"/x","class":"write"}]`)
overrides the path lists. `ATTACKFEE_STORE` is the Durable Object that records challenge first-use and pass use counts. Binding `ATTACKFEE_KV` without it throws before the request is handled, because KV cannot make that decision on its own. With neither binding, state stays in memory for the isolate. The default routes start with `{"prefix":"/","class":"read"}`; the worker never gates a GET, whatever the routes say. Metrics go to the console as the same JSON lines as Node
(`challenge_minted`, `pass_absent`, `pass_reject`, …). Bodies, cookies and Authorization values are
never logged.

## Limits (deferred)

- **Cashu on the site worker only, when a mint list is set.** Root `wrangler.toml` leaves `CASHU_MINTS` unset and sets `L402_ENABLED` to `0`, so production is work-only. Self-hosters can set `CASHU_MINTS` (for example `https://mint.minibits.cash/Bitcoin`) and `L402_ENABLED` to `1`. When a mint list is set, proofs are stored in the existing `ATTACKFEE_STORE` Durable Object. Agents get a 402 with `X-Cashu` and `WWW-Authenticate`. `POST /v1/demo/agent` returns that offer without an agent header, and `/.well-known/attackfee.json` lists it as `pay`. `POST /demo/contact` without a pass stays the work check. `ATTACKFEE_TEST_HOOKS` stays unset (docs/settlement.md §18). This package's own `wrangler.toml` (no mint list) stays work-only: no offers and a paid redeem is `400 unsupported`. It does bind `ATTACKFEE_STORE` so single-use state is decided in that Durable Object.
- **Standard engine only.** The Argon2id engine compiles WebAssembly at runtime, which Workers do not
  allow, so hardened mode and Argon2id escalation are off here (velocity still raises the work). Fix:
  ship the WASM as a module import.
- **Single-use state is one Durable Object.** Challenge first-use and pass use counts run in
  `AttackfeeStoreDO` (one named instance), the same class the site worker uses (`src/site.ts`, root
  `wrangler.toml`). KV holds the route list only. `wrangler dev --local` only; this package's `wrangler.toml` has no route or zone.
- No deploy, no route setup, no custom domain: that needs an account and a separate approval.
