---
title: How to check writes on your own server
description: The page script is not enough. Check the pass on the route that accepts the write, and fail closed if the pass store is down. Reads stay free.
hub: concepts
slug: how-to-check-writes-on-your-server
type: how-to
order: 60
related:
  - /learn
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/what-is-a-write-pass
  - /docs/server
  - /learn/concepts/node-server-and-express
  - /learn/concepts/php-library
  - /learn/wordpress/how-to-install-the-wordpress-plugin
audience: owners
status: published
schema: WebPage
faq:
  - q: "What if I mark the form and forget the server check?"
    a: "The post will go through. The page script cannot enforce the check. The server has to."
  - q: "What status should I return when the store is down?"
    a: "503, and do not accept the write. Failing open would leave the route priced at zero."
  - q: "Where does the pass come from on the request?"
    a: "From the attackfee_pass cookie, or from Authorization: Attackfee <pass>."
  - q: "Can a self-hosted server take payments?"
    a: "Only if you turn that path on and wire a real backend. A self-hosted issuer uses a stub backend by default. Work-only is the usual local setup."
  - q: "Does the check look at the form body?"
    a: "No. It checks the pass. Your handler still validates the fields."
---

# How to check writes on your own server

The page script is not enough. A write has to be checked on the route that accepts it. If the pass is missing, used up, or invalid, refuse the write. If the store that tracks used challenges is down, fail closed with a 503. Do not let the write through unchecked.

## Node

Install `@attackfee/server` from a clone of the project. The packages are not on a public package registry yet. You need Node 22.18 or newer.

```ts
import { attackfee } from "@attackfee/server";

app.use("/contact", attackfee({ action: "write" }));
```

Map route prefixes in the issuer config to a class: search, write, account, or admin. The middleware reads the pass from the `attackfee_pass` cookie or from `Authorization: Attackfee <pass>`, checks it, and only then calls your handler.

A self-hosted issuer uses a stub backend by default. You can run work-only. Payments on attackfee.dev are a separate, configured path.

Do not mark ordinary GET routes. The Node server will refuse a config that gates page views unless a confirm setting is on, and you should leave that off.

If the issuer cannot reach its store, protected writes should get a 503. The packaged middleware follows that rule.

The [server docs](/docs/server) and the [quick start](/docs/quick-start) have the full config.

## WordPress

The plugin is the issuer on your site. Built-in forms are checked for you when the matching option is on. For a theme form, call `attackfee_wp_verify_request('write')` before you handle the post. See [How to install the Attackfee WordPress plugin](/learn/wordpress/how-to-install-the-wordpress-plugin).

## Other stacks

Any origin that can call the issuer API can check a pass. The check is: get a challenge, redeem work (or a payment, if that path is on), then present the pass on the write. Clients speak `/v1/challenge`, `/v1/redeem`, and `/v1/price`.

## Where Attackfee fits

Mark the form, then put this check in front of the handler. Leave docs and other reads alone. Automated clients are covered in [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
