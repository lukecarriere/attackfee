---
title: How does a paid write work?
description: On attackfee.dev, an automated client that sends Attackfee-Client: agent can pay the offer in an HTTP 402, or do the work instead. A paid pass covers one write. People never pay money.
hub: payments
slug: how-does-a-paid-write-work
type: how-to
order: 20
related:
  - /learn
  - /learn/payments/what-is-http-402
  - /learn/payments/why-a-paid-path-exists
  - /learn/payments/what-kinds-of-payment-can-an-agent-use
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/well-known-attackfee-json
  - /docs/agent
audience: agents
status: published
schema: WebPage
faq:
  - q: "Do people ever pay this price?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "What if I self-host and never configure payments?"
    a: "Agents can still write by doing the work. There is no live payment offer."
  - q: "How long does a paid pass last?"
    a: "At most 60 seconds, and it is good for one write."
  - q: "Where do I see the amount?"
    a: "At /v1/price on attackfee.dev, and in the 402 body. Do not hardcode it."
  - q: "Does a payment mean the site owner gets paid?"
    a: "Not as a claim this page makes. A payment, when the path is on, is what settles the write. Typical self-hosted and WordPress installs do not take that payment themselves."
---

# How does a paid write work?

On attackfee.dev, an automated client that sends `Attackfee-Client: agent` can pay the offer in an HTTP 402, or it can do the background work instead. A paid pass covers one write and lasts at most 60 seconds. People never see this path and never pay money.

## What is live, and what is not

Payments are on for the attackfee.dev worker. A POST to a protected write with the agent header and no pass returns 402, with offers and a `challenge_url`. Current prices are at `/v1/price`. The dollar figure can move. The write class has been under a cent. Do not ship a hardcoded amount.

A self-hosted Node issuer uses a stub backend by default. You can run work-only. If you turn payments on, you configure that yourself. The WordPress plugin takes no payments itself. Its test mode is work only. An optional payment server is a separate piece.

This is the cost of a write, paid by the client to complete the request. It is not a payout to the site owner, and this page does not describe a payout to the site owner.

## The client steps

- Read `/.well-known/attackfee.json` and `/v1/price`.
- POST the write with `Attackfee-Client: agent`.
- On 402, either pay an offer that the site lists as live, or complete the work at `challenge_url`.
- Retry with `Authorization: Attackfee <pass>`.

A work pass still covers 20 actions for 15 minutes. Paying 20 times is what happens if you choose the paid pass for 20 writes. You can choose work instead.

The `@attackfee/agent` package does the work path and retries once. A runnable payment example is in the project's examples directory. Install from a clone; the packages are not on a public package registry yet.

## Where Attackfee fits

Use this when an automated client should pay for a write on a site that has payments on. Browsers keep using work. See [What kinds of payment can an agent use?](/learn/payments/what-kinds-of-payment-can-an-agent-use) and [What is HTTP 402 Payment Required?](/learn/payments/what-is-http-402).
