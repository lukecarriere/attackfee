---
title: Payments
description: What HTTP 402 means for a priced write, how a paid write works, and how an agent uses only the methods a site lists as live.
hub: payments
slug: index
type: hub
order: 0
related:
  - /learn
  - /learn/payments/what-is-http-402
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/what-kinds-of-payment-can-an-agent-use
  - /learn/payments/v1-price-endpoint
  - /learn/payments/v1-redeem-endpoint
  - /learn/payments/why-a-paid-path-exists
  - /docs/agent
audience: both
status: published
schema: WebPage
faq:
  - q: "Do people pay money?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "Does every Attackfee install take payment?"
    a: "No. On attackfee.dev, payments are on. A self-hosted issuer uses a stub backend by default. The WordPress plugin takes no payments itself."
  - q: "Where is the current price?"
    a: "On attackfee.dev, at /v1/price. Do not hardcode a dollar figure."
---

# Payments

These pages explain HTTP 402 and the paid path for automated clients. People never see this path and never pay money. Current prices, when you need them, are at `/v1/price`.

- [What is HTTP 402 Payment Required?](/learn/payments/what-is-http-402)
- [How does a paid write work?](/learn/payments/how-does-a-paid-write-work)
- [What kinds of payment can an agent use?](/learn/payments/what-kinds-of-payment-can-an-agent-use)
- [How to read /v1/price](/learn/payments/v1-price-endpoint)
- [How to redeem a payment for a pass](/learn/payments/v1-redeem-endpoint)
- [Why a paid path exists alongside background work](/learn/payments/why-a-paid-path-exists)
- [Paid pass reuse and expiry](/learn/payments/paid-pass-reuse-and-expiry)
- [Why HTTP 402 matters for automated clients](/learn/payments/why-http-402-matters-for-automated-clients)
- [How to test an agent 402 on the demo](/learn/payments/how-to-test-an-agent-402-on-the-demo)
- [How to request a work challenge](/learn/payments/how-to-request-a-work-challenge)

A client should also read [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json) and use only methods that file lists as live.
