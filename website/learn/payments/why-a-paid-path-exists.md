---
title: Why a paid path exists alongside background work
description: Background work is how a browser earns a pass. A paid path exists so an automated client can pay per write over HTTP 402 instead of doing that work, when payments are on. People never use this path.
hub: payments
slug: why-a-paid-path-exists
type: intention
order: 60
related:
  - /learn
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/what-is-http-402
  - /learn/concepts/volume-should-cost-volume
  - /docs/agent
audience: both
status: published
schema: WebPage
faq:
  - q: "Do people ever pay money?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "Does every install take payment?"
    a: "No. Payments are on for attackfee.dev. A self-hosted issuer uses a stub backend by default. The WordPress plugin takes no payments itself."
  - q: "What if a payment is invalid or does not complete?"
    a: "Redeem does not issue a pass. The write is refused until the client presents a valid pass, earned with work or with a valid payment. The public product does not document a refund path."
  - q: "Can an agent still choose the work?"
    a: "Yes. The 402 includes a challenge_url for the work alternative."
  - q: "How long is a paid pass good for?"
    a: "One write, and at most 60 seconds."
---

# Why a paid path exists alongside background work

Background work is how a person's browser earns a pass, and it is a path an automated client can use too. A paid path exists so an agent that writes often can pay per action over HTTP 402 instead of spending CPU on the work, when payments are on.

People never see this path and never pay money. Payments are on for attackfee.dev. A self-hosted issuer uses a stub backend by default. The WordPress plugin takes no payments itself.

A paid pass covers one write and lasts at most 60 seconds, so paying once does not unlock unbounded volume. If a payment is invalid or does not complete, redeem does not issue a pass, and the write is refused. The public product does not document a refund path. An agent can still choose the work: the 402 includes a `challenge_url`.

Current prices are at `/v1/price`. Do not hardcode a dollar figure.

## Where Attackfee fits

See [How does a paid write work?](/learn/payments/how-does-a-paid-write-work) and [What is HTTP 402 Payment Required?](/learn/payments/what-is-http-402).
