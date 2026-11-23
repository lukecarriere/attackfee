---
title: How to read /v1/price
description: /v1/price returns the current check for one write, and the work alternative. It mints nothing. Do not hardcode a dollar figure. Reads stay free.
hub: payments
slug: v1-price-endpoint
type: how-to
order: 40
related:
  - /learn
  - /learn/payments/how-does-a-paid-write-work
  - /learn/agents/well-known-attackfee-json
  - /docs/server
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Does calling /v1/price spend a pass or mint work?"
    a: "No. It returns the current check and the work alternative. It mints nothing."
  - q: "Which action does it default to?"
    a: "Look at the live response and at the well-known file. You can request a class with the action query the site documents. Always trust the live body over an old note."
  - q: "Why is the dollar figure sometimes missing?"
    a: "The converted figure is hidden when the rate is not fresh. The well-known file may list a base amount with the converted field left null. Use /v1/price for the current number."
  - q: "Can I cache it forever?"
    a: "No. Re-fetch when you need a current amount. Do not hardcode a dollar figure in a client."
  - q: "Is this a payout to me?"
    a: "No. It is the cost of one write, when payments are on. A self-hosted issuer may be work-only."
---

# How to read /v1/price

`GET /v1/price` returns the current check for one write, and the work alternative. It mints nothing. On attackfee.dev, this is a public GET. Do not hardcode the dollar figure. It can move, and it is hidden when the rate is not fresh.

The live well-known file can list a price basis per class with the converted figure left null. `/v1/price` is the current figure, with `basis` set to `current` when that path is live. The write class has been under a cent when checked. Point at `/v1/price` in copy and in clients.

A self-hosted issuer may not take payments. In that case the endpoint still describes the work alternative. People never pay money.

## Where Attackfee fits

An automated client should read `/v1/price` and `/.well-known/attackfee.json` before paying or doing the work. See [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json) and [How does a paid write work?](/learn/payments/how-does-a-paid-write-work).
