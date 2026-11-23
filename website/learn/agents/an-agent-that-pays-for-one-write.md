---
title: An agent that pays for one write
description: Example. An automated client can pay a live HTTP 402 offer for one write, when payments are on, instead of doing the work. The paid pass lasts at most 60 seconds. Not a customer story.
hub: agents
slug: an-agent-that-pays-for-one-write
type: example
order: 110
related:
  - /learn
  - /learn/agents/agent-builders-writing-to-sites
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/paid-pass-reuse-and-expiry
  - /learn/payments/v1-price-endpoint
  - /docs/agent
audience: agents
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's agent?"
    a: "No. This is a worked example. It does not invent a product name, a quote, or a dollar amount."
  - q: "Do people follow this path?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "What if the site does not take payment?"
    a: "Do the work instead. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself."
  - q: "Can one payment cover a batch of posts?"
    a: "No. A paid pass is one write and at most 60 seconds."
---

# An agent that pays for one write

Example. This is a worked example, not a customer story. It does not invent a product, a quote, or a dollar amount.

Take an automated client that needs to post once, such as a single comment or a single write API call, to a site where payments are on. It sends `Attackfee-Client: agent`. Without a pass it gets a 402. It reads the offer, and it can also read `/v1/price` and `/.well-known/attackfee.json`. It pays only a method that file lists as live, redeems a pass, and sends the write with `Authorization: Attackfee <pass>`.

That paid pass covers one write and lasts at most 60 seconds. A second post needs a new payment, or the work instead. If the payment is invalid or does not complete, redeem does not issue a pass, and the write is refused.

The client can always choose the work: the 402 includes a `challenge_url`. People never use this path. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. Do not hardcode a dollar figure; use `/v1/price`.

## Where Attackfee fits

See [How does a paid write work?](/learn/payments/how-does-a-paid-write-work) and [Paid pass reuse and expiry](/learn/payments/paid-pass-reuse-and-expiry).
