# Self-hosting

Attackfee runs on your server. Nothing is sent to us. Page views stay free. Checks run where you installed them.

## Packages

The packages are not on npm yet. From a clone of this repo, run `npm install` and `npm run build`, then install each package by path and run it yourself. You do not need a hosted worker to do that.

- `@attackfee/widget` serves the page script. See [Widget](/docs/widget).
- `@attackfee/server` is the Node issuer. See [Server](/docs/server).
- `@attackfee/agent` is the automated client. See [Agent SDK](/docs/agent).
- `@attackfee/mcp` is the local tool server. See [MCP server](/docs/mcp).
- The WordPress plugin is the PHP issuer. See [WordPress](/docs/wordpress) and [Download](/download).

`secret` is at least 16 characters. Keep it in the environment or a Worker secret. Do not commit it, and do not print it.

## This site's worker

The attackfee-site worker is the site and demo worker in this repo. It runs attackfee.dev and the demo at [/demo](/demo). The owner chooses each route's class, which sets its relative cost. Production on attackfee.dev accepts payment over HTTP 402 (`CASHU_MINTS` is set, `L402_ENABLED` is `1`). The mint allowlist is `CASHU_MINTS`. The store is one SQLite-backed Durable Object, `AttackfeeStoreDO`. From a clean checkout:

```sh
npm ci
npm run build
npx wrangler deploy
```

`npm run build` writes the worker bundle and the static files the config points at. `npx wrangler deploy` publishes that worker. Attackfee's own production deploy is `scripts/deploy.sh --sha <origin/main>` after a verifier passes, and attaches only the attackfee.dev apex under `routes`. www and attackfee.com are not attached; they 308 to the apex at the DNS layer. For your own copy, change or remove those routes before you deploy.

Set `SITE_SECRET` before the demo can issue checks:

```sh
npx wrangler secret put SITE_SECRET
```

To run it on your own machine instead of publishing, copy `.dev.vars.example` to `.dev.vars`, replace the placeholder, and start `npx wrangler dev --local`. The placeholder is not a secret you can reuse.
