---
title: How to tell if an Attackfee issuer is up
description: GET /v1/health reports whether the issuer is up. It is a free read. It mints nothing and does not identify the caller.
hub: concepts
slug: how-to-read-v1-health
type: how-to
order: 410
related:
  - /learn/concepts/what-attackfee-http-statuses-mean
  - /learn/payments/v1-price-endpoint
  - /learn/agents/well-known-attackfee-json
  - /learn/concepts/self-hosting-attackfee
  - /docs/server
  - /docs/ask
audience: both
status: published
schema: WebPage
faq:
  - q: "Does calling /v1/health spend a pass?"
    a: "No. It is a free GET. It mints nothing and does not identify the caller."
  - q: "What does a healthy JSON body look like?"
    a: "ok is true, and v is the issuer version. Trust the live body. Other fields describe whether a payment path is configured."
  - q: "Is this the same as /v1/status?"
    a: "No. /v1/status reports whether a pass is still good, without spending a use. /v1/health reports whether the issuer itself is up."
  - q: "Can I open it in a browser?"
    a: "Yes. If the request asks for HTML, the Node issuer can return a short status page. The JSON body is the usual machine-readable answer."
  - q: "Where is this on WordPress?"
    a: "The same route lives under /wp-json/attackfee/v1/health."
---

# How to tell if an Attackfee issuer is up

`GET /v1/health` reports whether the issuer is up. It is a free read. It mints nothing, and it does not identify the caller. The official agent-calls table uses this call to answer "Is Attackfee up on this site?"

The JSON body includes `ok` and a version field `v`. When a payment path is configured, the body can also include fields about that path, such as `settlement`, `settlement_degraded`, and `usd_rate`. On attackfee.dev an `edge` field may also be present. Trust the live body. Do not hardcode those extra values in a client. A self-hosted issuer that is not taking payments reports the payment path as off.

If the `Accept` header includes `text/html`, the Node issuer can return a short HTML status page instead of JSON. Agents should request JSON.

On WordPress the same route lives under `/wp-json/attackfee/v1/health`. People never pay money. Reads stay free.

## Where Attackfee fits

Use `/v1/health` to see whether the issuer answers, then read `/v1/price` or `/.well-known/attackfee.json` for the current write check. See the [server docs](/docs/server), [agent calls](/docs/ask), and [What Attackfee HTTP statuses mean](/learn/concepts/what-attackfee-http-statuses-mean).
