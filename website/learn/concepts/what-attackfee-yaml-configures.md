---
title: What attackfee.yaml configures
description: The Node issuer reads attackfee.yaml for the site id, secret, public URL, routes, work defaults, and the self-hosted stub payment backend. Put the secret in the environment.
hub: concepts
slug: what-attackfee-yaml-configures
type: how-to
order: 420
related:
  - /learn/concepts/node-server-and-express
  - /learn/concepts/how-to-mark-routes
  - /learn/concepts/how-to-set-trusted-proxies
  - /learn/concepts/memory-hard-mode
  - /learn/limits/why-page-view-gating-should-stay-off
  - /docs/server
  - /docs/self-hosting
audience: owners
status: published
schema: WebPage
faq:
  - q: "Where does the secret live?"
    a: "In the environment. The example file uses secret: env:ATTACKFEE_SECRET. The secret must be at least 16 characters. Do not commit it."
  - q: "What is the self-hosted payment backend?"
    a: "A stub backend by default. settlement.enabled is off in the example. This build accepts only the stub backend."
  - q: "Do I have to copy every key?"
    a: "No. Start from the example file in the repo, set the site id, secret, public URL, and routes, and leave the rest at their defaults until you have a reason to change them."
  - q: "Can a route cost be any number?"
    a: "No. A route can omit cost and use the class default, or set cost: 0 to leave that route free. Other cost values are refused."
---

# What attackfee.yaml configures

The Node issuer reads `attackfee.yaml`. A complete example lives in the repo as `attackfee.example.yaml`. Copy that file, set `ATTACKFEE_SECRET` in the environment, and start with the site id, the public issuer URL, and the routes you want to check.

`site_id` is required. `secret` must be at least 16 characters. The example points at the environment with `secret: env:ATTACKFEE_SECRET`. Do not commit the secret. `issuer_public_url` is the public origin of the issuer, for example `http://localhost:8787`. `allowed_origins` defaults to that origin if you leave it out.

The `defaults` block sets how long a work pass lasts. The example and the Node defaults are 15 minutes (`pass_ttl_s: 900`) or 20 actions (`pass_uses: 20`), whichever comes first. `challenge_ttl_s` is at most 120 seconds. `max_solve_ms` defaults to 8000, and the page script should use the same number as `data-max-solve-ms`.

`work.mode` is `standard` or `hardened`. Standard is the default. Hardened is the memory-hard path. `rate_limit.challenge_per_min` defaults to 60 challenges per minute per network address. `cookie.secure` defaults to `auto`, which sets the Secure flag when the request is HTTPS.

Map routes by prefix and class. The example keeps `/` as `read` so page views stay free, and marks `/contact` as `write`. A route may set `cost: 0` to leave that route free. Any other `cost` value is refused. Page-view gating stays off unless you also set `confirm_page_view_gating: true`, which you should not do.

The `settlement` section is off in the example (`enabled: false`). A self-hosted issuer uses a stub backend by default. This build accepts only that stub backend. People never pay money.

Trusted proxies are not a YAML key. List them in the `ATTACKFEE_TRUSTED_PROXIES` environment variable.

## Where Attackfee fits

This file is the Node issuer config. See the [server docs](/docs/server), [How to mark which routes are writes](/learn/concepts/how-to-mark-routes), and [How to run the Node server and Express middleware](/learn/concepts/node-server-and-express).
