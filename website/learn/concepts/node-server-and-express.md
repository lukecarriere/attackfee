---
title: How to run the Node server and Express middleware
description: Install @attackfee/server from a clone, serve the /v1 API and the page script with Attackfee.router, and check writes with Attackfee.middleware. Reads stay free.
hub: concepts
slug: node-server-and-express
type: how-to
order: 120
related:
  - /learn
  - /docs/server
  - /docs/quick-start
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/concepts/self-hosting-attackfee
audience: owners
status: published
schema: WebPage
faq:
  - q: "What Node version do I need?"
    a: "Node 22.18 or newer."
  - q: "Where do I put the secret?"
    a: "In the environment. In the config, secret is at least 16 characters. Do not commit it."
  - q: "How do I keep page views free?"
    a: "Start the route list with a / prefix in the read class, and do not turn on the confirm setting that allows gating GET."
  - q: "What if I am behind a reverse proxy?"
    a: "List the proxy in the ATTACKFEE_TRUSTED_PROXIES environment variable. Attackfee does not read the framework's proxy setting."
  - q: "Does this take payments by default?"
    a: "No. No real money moves on the self-hosted server's stub backend."
---

# How to run the Node server and Express middleware

`@attackfee/server` is the Node issuer. It is not on a public package registry yet. From a clone, run `npm install` and `npm run build`, then install `packages/server-node` by path. You need Node 22.18 or newer.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/server-node express
```

`secret` in the config is at least 16 characters. Put it in the environment. Do not commit it.

```yaml
site_id: site_abc123
secret: env:ATTACKFEE_SECRET
issuer_public_url: http://127.0.0.1:8787
routes:
  - { prefix: "/", class: read }
  - { prefix: "/contact", class: write }
```

The `/` route keeps every page view free. A route's class applies to writes under that prefix.

```js
import express from "express";
import { Attackfee, loadConfig } from "@attackfee/server";

const attackfee = Attackfee.create(loadConfig("attackfee.yaml"));
const app = express();
app.use(Attackfee.router(attackfee));
app.post("/contact", Attackfee.middleware(attackfee, { action: "write" }), (req, res) => {
  res.status(200).json({ ok: true });
});
app.listen(8787);
```

`Attackfee.router()` serves `/v1` and the widget files. `Attackfee.middleware()` checks the pass before your handler runs.

Behind a reverse proxy, list it in the `ATTACKFEE_TRUSTED_PROXIES` environment variable (comma-separated addresses and ranges). Attackfee does not read the framework's proxy setting.

No real money moves on the self-hosted server's stub backend.

## Where Attackfee fits

This is the Node install path. The [server docs](/docs/server) and the [quick start](/docs/quick-start) have the full config. For PHP, see [How to check passes in PHP](/learn/concepts/php-library).
