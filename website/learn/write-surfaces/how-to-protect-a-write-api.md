---
title: How to protect a write API
description: Mark write endpoints and check a pass on each one. GET responses stay free. An automated client sends Attackfee-Client: agent and does the work, or, on attackfee.dev, pays over HTTP 402.
hub: write-surfaces
slug: how-to-protect-a-write-api
type: how-to
order: 50
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/write-surfaces/public-write-apis
  - /learn/payments/how-does-a-paid-write-work
  - /docs/server
  - /learn/agents/well-known-attackfee-json
audience: both
status: published
schema: WebPage
faq:
  - q: "Should I protect GET endpoints that are expensive to compute?"
    a: "Only if you deliberately choose to. The product is built so GET stays free. Gating page views on Node needs a separate confirm setting. The edge worker and the WordPress plugin never gate a GET. If a GET is costly, prefer caching, or change it to a POST and mark that route."
  - q: "What does an agent get if it forgets the header?"
    a: "A 403 with a work challenge, the same as a browser, not a 402 with offers."
  - q: "Can I charge a different amount for admin APIs?"
    a: "You choose the class, which sets the relative cost. On attackfee.dev, the published prices differ by class. Look at /v1/price rather than hardcoding a number."
  - q: "Are all payment methods listed in a 402 actually wired?"
    a: "No. Trust the live well-known file. If a method is marked stub, it is not wired. See What kinds of payment can an agent use?"
  - q: "Does a paid write pay me?"
    a: "No. A payment, when that path is on, is the cost of the write. Attackfee does not describe a payout to the site owner on this page."
---

# How to protect a write API

Mark the endpoints that change something, and check a pass before your handler runs. GET, HEAD, and OPTIONS stay free unless you deliberately mark them otherwise. An automated client sends the `Attackfee-Client: agent` header, receives JSON, and either does the work or, on attackfee.dev, pays over HTTP 402.

## What to mark

Protect POST, PUT, PATCH, and DELETE routes that create, change, or delete data, and any other endpoint that costs you per call. Unmapped POST requests count as write (4x). Use account or admin when the action is heavier.

Do not mark ordinary read endpoints. Publish how to write at `/.well-known/attackfee.json`, which is served free and unchecked.

## How a client gets through

A browser on a form uses the page script, as in [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form).

An automated client should:

- Read `/.well-known/attackfee.json`.
- Send `Attackfee-Client: agent` on the write.
- If the answer is 402, pay an offer the site lists as live, or fetch the work link and complete the work.
- Retry the write with `Authorization: Attackfee <pass>`.

The `@attackfee/agent` package does the work and retries once. It is not on a public package registry yet; install it from a clone. A runnable payment example lives in the project's examples directory. The package does not, by itself, pay an offer unless you use that example path.

A self-hosted Node issuer uses a stub backend by default. Real payments are on for the attackfee.dev worker. Current prices there are at `/v1/price`. This is not a payout to you.

## Where Attackfee fits

Put the middleware in front of the write handler and leave the read API open. See [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site) and the [agent docs](/docs/agent).
