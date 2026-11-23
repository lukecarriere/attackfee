---
title: How to redeem a payment for a pass
description: POST /v1/redeem turns finished work, or a valid payment when that path is on, into a pass. A write still has to present that pass. People never use this path.
hub: payments
slug: v1-redeem-endpoint
type: how-to
order: 50
related:
  - /learn
  - /learn/payments/how-does-a-paid-write-work
  - /learn/concepts/what-is-a-write-pass
  - /docs/server
  - /docs/agent
audience: agents
status: published
schema: WebPage
faq:
  - q: "Can I redeem without doing the work or paying?"
    a: "No. The issuer accepts finished work, or a valid payment when that path is on. Otherwise redeem is refused."
  - q: "Does redeem by itself complete the write?"
    a: "No. Redeem returns a pass. You send that pass on the write, as Authorization: Attackfee, or as the cookie or hidden field a browser would use."
  - q: "How long is a paid pass good for after redeem?"
    a: "One write, and at most 60 seconds."
  - q: "Do people call this endpoint?"
    a: "No. The page script redeems work in the background. People never pay money."
  - q: "What if the store is down?"
    a: "Redeem and protected writes return 503. Nothing is accepted unchecked."
---

# How to redeem a payment for a pass

`POST /v1/redeem` turns finished work into a pass. When payments are on, it can also turn a valid payment for a live offer into a pass. The write itself still has to present that pass, as `Authorization: Attackfee <pass>`, or as the cookie or hidden field a browser would use.

A work pass covers 20 actions for 15 minutes. A paid pass covers one write and lasts at most 60 seconds. If the store that tracks used challenges is down, redeem returns 503 and nothing is accepted unchecked.

People never call this path to pay money. Their browser earns a work pass in the background. The `@attackfee/agent` package does the work and retries once; a runnable payment example lives in the project's examples directory.

On a self-hosted issuer, a stub backend is the default, so redeem is a work path unless you have configured payments yourself.

## Where Attackfee fits

Redeem is the step between a 402 or a work challenge and a usable pass. See [How does a paid write work?](/learn/payments/how-does-a-paid-write-work) and the [server docs](/docs/server).
