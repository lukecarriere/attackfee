---
title: Why HTTP 402 matters for automated clients
description: When an automated client sends Attackfee-Client: agent and has no pass, Attackfee answers with HTTP 402 and JSON that includes offers and a challenge URL. Browsers get 403 instead. People never pay money.
hub: payments
slug: why-http-402-matters-for-automated-clients
type: background
order: 80
related:
  - /learn/payments/what-is-http-402
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/why-a-paid-path-exists
  - /learn/payments/v1-price-endpoint
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/an-agent-that-pays-for-one-write
  - /learn/concepts/what-happens-without-a-pass
audience: agents
status: published
schema: WebPage
faq:
  - q: "Do people ever see HTTP 402?"
    a: "No. A browser-style request without a pass gets 403. People never pay money. Their browser earns a work pass in the background."
  - q: "What does the 402 body contain?"
    a: "JSON with error payment_required, a challenge_url for the work, and offers. Current prices are also at /v1/price. Use only methods that /.well-known/attackfee.json lists as live."
  - q: "Does every Attackfee install take payment?"
    a: "No. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself."
  - q: "Can one payment cover many writes?"
    a: "No. A paid pass is one write and at most 60 seconds."
---

# Why HTTP 402 matters for automated clients

HTTP 402 is the status Attackfee uses when an automated client tries a protected write without a pass. The client sends `Attackfee-Client: agent`. The response is JSON, not a page, so a program can read the next step without parsing HTML. That is why 402 matters for automated clients. A browser-style request without a pass gets 403 instead. People never pay money.

The 402 body includes `error: payment_required`, a `challenge_url` for the work, and `offers`. The client can do the work, or, when payments are on, pay a live offer and redeem a pass. Current prices are at `/v1/price`. Use only methods that `/.well-known/attackfee.json` lists as live. Do not hardcode a dollar figure.

A paid pass covers one write and lasts at most 60 seconds. The work path is always available. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself.

## Where Attackfee fits

If you are building a client, send the agent header, follow the JSON, and present a pass as `Authorization: Attackfee <pass>`. See [What is HTTP 402 Payment Required?](/learn/payments/what-is-http-402), [How does a paid write work?](/learn/payments/how-does-a-paid-write-work), and [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
