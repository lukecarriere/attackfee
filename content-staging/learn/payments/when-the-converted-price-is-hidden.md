---
title: When the converted price is hidden
description: /v1/price hides the converted figure when the rate is not fresh, or when the issuer config hides it. Re-fetch the endpoint. Do not hardcode a dollar figure.
hub: payments
slug: when-the-converted-price-is-hidden
type: edge-case
order: 55
related:
  - /learn/payments/v1-price-endpoint
  - /learn/payments/what-fields-v1-price-returns
  - /learn/agents/well-known-attackfee-json
  - /learn/concepts/what-attackfee-yaml-configures
  - /learn/payments/how-does-a-paid-write-work
  - /docs/ask
  - /docs/server
audience: agents
status: published
schema: WebPage
faq:
  - q: "Why is the converted figure sometimes missing?"
    a: "It is hidden when the rate is not fresh. The well-known file may also list a base amount with the converted field left null. Use /v1/price for the current body."
  - q: "Can I keep using an old number?"
    a: "No. Re-fetch /v1/price when you need a current amount. Do not hardcode a dollar figure."
  - q: "How does a self-hosted issuer choose this?"
    a: "The settlement fx.source setting is public for a live market rate, none to hide the converted figure, or fixed for a test value that is not a market price."
  - q: "Does a hidden figure mean the work path is gone?"
    a: "No. The work alternative is still described. People never pay money."
---

# When the converted price is hidden

`GET /v1/price` can omit the converted figure. That happens when the rate is not fresh. The well-known file may also list a price basis with the converted field left null. This is expected. It is not a broken issuer by itself.

Re-fetch `/v1/price` when you need a current amount. Do not hardcode a dollar figure in a client or in copy. On a self-hosted issuer, `settlement.fx.source` in `attackfee.yaml` controls this display. `public` uses a live market rate. `none` hides the converted figure. `fixed` is a test value, not a market price. The work alternative stays in the body either way, as `work.challenge_url`. People never pay money. A self-hosted issuer uses a stub backend by default.

## Where Attackfee fits

Treat a missing converted figure as a cue to trust the live body, not as a number you invent. See [How to read /v1/price](/learn/payments/v1-price-endpoint), [What fields /v1/price returns](/learn/payments/what-fields-v1-price-returns), and [agent calls](/docs/ask).
