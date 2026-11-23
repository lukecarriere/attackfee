---
title: What kinds of payment can an agent use?
description: An agent should use only the payment methods a site lists as live in /.well-known/attackfee.json. Methods marked stub are not wired. Work is always an allowed alternative. People never pay money.
hub: payments
slug: what-kinds-of-payment-can-an-agent-use
type: concept
order: 30
related:
  - /learn
  - /learn/payments/how-does-a-paid-write-work
  - /learn/agents/well-known-attackfee-json
  - /learn/payments/what-is-http-402
  - /docs/agent
audience: agents
status: published
schema: WebPage
faq:
  - q: "How do I know which methods a site accepts?"
    a: "Read that site's /.well-known/attackfee.json. The payment object lists live methods and marks others as stub. Trust the live file over a blog post or an old page."
  - q: "What should I do with a method marked stub?"
    a: "Do not send it. It is not wired. Use a live method, or do the work at challenge_url."
  - q: "Is work still allowed when payments are on?"
    a: "Yes. Work is always an allowed path on a correctly configured issuer."
  - q: "Do visitors pick a payment method?"
    a: "No. People never pay money. Only an automated client that opts into the agent header sees this path."
  - q: "Does the WordPress plugin take these payments?"
    a: "No. The plugin takes no payments itself. Test mode is work only."
---

# What kinds of payment can an agent use?

An automated client should use only the payment methods a site lists as live. The list lives in that site's `/.well-known/attackfee.json`. Methods marked stub are not wired and should not be sent. Work at `challenge_url` is always an allowed alternative. People never pay money.

## Read the file, then send only what is live

On attackfee.dev, the well-known file (checked on 20 Nov 2026) includes a `payment` object with the methods that are actually on, and it marks at least one method as stub. A 402 on a priced write lists offers for the live methods. Send one of those, or complete the work, then retry with a pass.

Do not assume another Attackfee site offers the same methods. A self-hosted issuer often has no live payment method at all. A self-hosted issuer uses a stub backend by default. The WordPress plugin takes no payments itself.

This page does not name the live methods. Method names change, and some names are reserved for the site's own discovery file. If a name is not in the live file, do not send it.

Current prices are at `/v1/price`. The write class has been under a cent. Do not hardcode the figure. A payment, when the path is on, is the cost of the write, not a payout this page promises to the site owner.

## Where Attackfee fits

If you are writing an automated client, treat the well-known file as the catalog, HTTP 402 as the signal, and work as the fallback. See [How does a paid write work?](/learn/payments/how-does-a-paid-write-work) and [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json).
