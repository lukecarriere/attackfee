# Attackfee

Open to read. Priced to write.
Attackfee puts a small cost on the routes that change something on your site, like comments, signups, logins and write APIs. Reads stay free. People barely notice. Volume pays.

A person's browser earns a pass with a fraction of a second of background work while they read or type, and one pass covers 20 actions for 15 minutes. A script has to keep earning passes, every 20 actions. An agent sends the `Attackfee-Client: agent` header, does the same work and retries. An automated client can pay per action over HTTP 402 instead of doing the work. Current prices are at `/v1/price`. Checks run on your own server and never identify the caller.

What it doesn't do: it doesn't gate page views, block crawlers, filter network floods or claim to stop a funded attacker. Proof of work is cheap on rented GPUs, so someone willing to spend can keep going.

Attackfee checks writes, not page views. Leave public pages open so people and answer engines can read you. Turn Attackfee on for comments, forms, logins, and APIs.

> Not published yet. Today Attackfee runs from a clone (see [Run it locally](#run-it-locally)). The WordPress plugin runs locally only (packages/wp-attackfee). The edge worker (packages/edge-cf) runs attackfee.dev.

## How it works

1. Add `attackfee.js` to your page and `data-attackfee="write"` to a form.
2. While the visitor reads or types, the browser does a few hundred milliseconds of background work.
3. The work is checked by your server and exchanged for a short-lived pass.
4. The pass rides along with the form post, so pressing Send just sends.
5. One pass covers about 20 actions for 15 minutes, so a person needs about one check per visit.
6. Requests without a pass are rejected. Scripts that skip the check get nowhere.
7. Clients that send a lot of requests have to do the work again and again.
8. Reads stay free. You choose which routes count as search, write, account or admin.
9. Nothing to solve. No tracking pixels.

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <!-- fields -->
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

On the server (Node):

```js
import { Attackfee, loadConfig } from "@attackfee/server";
const attackfee = Attackfee.create(loadConfig("attackfee.yaml"));
app.use(Attackfee.router(attackfee));                                   // /v1/* and /attackfee/v1/attackfee.js
app.post("/contact", Attackfee.middleware(attackfee, { action: "write" }), handler);
```

A complete app is in [examples/express-contact](examples/express-contact).

Behind a reverse proxy, list it in the `ATTACKFEE_TRUSTED_PROXIES` environment variable (comma-separated addresses and CIDR ranges): it replaces Express `trust proxy`, which Attackfee does not read ([docs/adapters.md](docs/adapters.md) §5, contributor doc).

## Privacy

- The check never reads or sends what people type into your forms.
- No third-party cookies. The pass lives in a first-party `attackfee_pass` cookie or in memory.
- No IP-based blocking. Shared networks only change how much work is asked, never whether a person gets through.
- Nothing is sent to us. Checks run on your own server.

## Protocol

The wire protocol, the work rule and shared test vectors are in [docs/protocol.md](docs/protocol.md) and [docs/vectors.json](docs/vectors.json). Words we use and avoid: [docs/copy.md](docs/copy.md) (contributor doc).

## Run it locally

Node 22.18 or newer (TypeScript runs directly with Node's type stripping). PHP 8.1+ with Composer for the PHP vector test (ext-sodium for hardened mode).

```sh
npm install
(cd packages/server-php && composer install)
npm run demo        # http://localhost:8787  (ATTACKFEE_WORK_MODE=hardened for the memory-hard mode)
npm test            # build, typecheck, copy lint, all tests, PHP vectors
npm run bench       # solve times, standard and hardened, desktop and phone-like
npm run agent-pay -- --writes 5   # with the demo running: an automated client pays per request (test backend, no real money)
packages/wp-attackfee/dev/setup-local-wp.sh   # local WordPress with the plugin: http://127.0.0.1:8888 (see packages/wp-attackfee/README.md)
npm run dev -w packages/edge-cf   # the edge worker under wrangler dev, local only (see packages/edge-cf/README.md)
```

A read-only check of the live origin (agent manifest, `/llms.txt` as plain text, an unpaid 402 with an `X-Cashu` header, and a gitleaks scan of this checkout):

```sh
bash scripts/check-open-intelligence.sh
```

It does not pay. `bash scripts/check-open-intelligence.sh --self-check` proves each check can fail.

After a deploy, confirm the public pages still return 200 and (when you pass `--contains`) still include the phrases you just shipped:

```sh
bash scripts/check-live-pages.sh --path /docs/ask --contains "the phrase you just shipped"
```

It does not pay. `bash scripts/check-live-pages.sh --self-check` proves each check can fail.

A read-only check that the www host of the Domain recorded in docs/copy.md returns 308 to the apex and keeps the path and query. The script default is `https://attackfee.dev`:

```sh
bash scripts/check-www-redirect.sh
```

It does not follow the redirect. `bash scripts/check-www-redirect.sh --self-check` proves each check can fail.


## Licence

The Node packages are MIT. The WordPress plugin and the PHP library are GPL-2.0-or-later.

The repository is [MIT](LICENSE) too. The npm names are `@attackfee/widget`, `@attackfee/server`, `@attackfee/agent` and `@attackfee/mcp` (not published yet). The WordPress plugin is `packages/wp-attackfee` and the PHP library is `packages/server-php`.

## Credits

The work check is built on [ALTCHA](https://github.com/altcha-org) (MIT): `altcha-lib` issues and verifies challenges in Node, the `altcha` package provides the browser workers, and `altcha-org/altcha` verifies in PHP.
