---
title: How to check a pass with /v1/siteverify
description: POST /v1/siteverify is for the site owner's server. Send your site secret and the pass. The call spends one use. A timeout-or-duplicate result means the pass expired, was used up, or was sent again.
hub: concepts
slug: how-to-check-a-pass-with-siteverify
type: how-to
order: 380
related:
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/concepts/why-checks-run-on-your-server
  - /learn/concepts/two-requests-cannot-share-a-pass-use
  - /learn/concepts/php-library
  - /learn/concepts/node-server-and-express
  - /docs/ask
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does siteverify spend a use?"
    a: "Yes. POST /v1/siteverify spends one use. GET /v1/status does not."
  - q: "What does timeout-or-duplicate mean?"
    a: "The pass expired, was used up, or was sent again. Get a new pass."
  - q: "Where does the secret come from?"
    a: "Your issuer config. The secret should be at least 16 characters, kept in the environment, and never committed or printed into a page."
  - q: "Is there an MCP tool for this?"
    a: "Yes. verify_write_pass sends the site, the secret, and the pass. It is for the site's own server, not for a public client."
---

# How to check a pass with /v1/siteverify

`POST /v1/siteverify` is the HTTP check for your own server. Send your site secret and the pass. The call spends one use. If the pass is good, you can handle the write. If the result is `timeout-or-duplicate`, the pass expired, was used up, or was sent again. Get a new one. Do not accept the write.

This is the same job as the Node middleware or `Protocol::verifyPass` in PHP, expressed as an HTTP call. The official agent-calls table also lists the MCP tool `verify_write_pass` for the site's own server, with `site`, `secret`, and `pass`. Do not expose the secret to a browser or to a public client. Keep it in the environment. The server docs say the secret should be at least 16 characters. Do not commit it.

On WordPress the issuer routes live under `/wp-json/attackfee/v1/`. Built-in forms are checked for you when the matching option is on. For a theme form, `attackfee_wp_verify_request` is the usual check. If the pass store is down, fail closed with 503.

People never pay money. The check does not read the form body.

## Where Attackfee fits

Use middleware or the PHP helper when you can. Use `/v1/siteverify` when your stack needs the HTTP API. See [How to check writes on your own server](/learn/concepts/how-to-check-writes-on-your-server), [Why checks run on your server](/learn/concepts/why-checks-run-on-your-server), and [agent calls](/docs/ask).
