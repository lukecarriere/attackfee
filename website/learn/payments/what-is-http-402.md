---
title: What is HTTP 402 Payment Required?
description: HTTP 402 Payment Required is a reserved status code, created for digital cash or micropayments. The web never settled on one use. Attackfee uses 402 for automated clients that opt in.
hub: payments
slug: what-is-http-402
type: concept
order: 10
related:
  - /learn
  - /learn/payments/how-does-a-paid-write-work
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/comparisons/rate-limiting-vs-pricing-writes
  - /docs/agent
audience: both
status: published
schema: WebPage
faq:
  - q: "Is 402 a finished standard for web payments?"
    a: "No. It is reserved. MDN still describes it as reserved and nonstandard. Concrete payment protocols build on it with their own rules."
  - q: "Why does a browser get 403 instead?"
    a: "A browser is expected to complete the background work. Payment offers are for clients that opt into the agent header."
  - q: "Is 402 the same as 429?"
    a: "No. 429 is rate limiting. 402 is payment required. A priced write can also sit behind a challenge-rate limit, but the two statuses mean different things."
  - q: "Does every Attackfee site return 402?"
    a: "A client that sends the agent header should get 402 on a priced write with no pass, when the issuer implements the agent path. The offers inside that 402 are only present when payments are on. Work is still offered through challenge_url."
  - q: "Where is the current price?"
    a: "On attackfee.dev, at /v1/price. Do not hardcode a dollar figure."
---

# What is HTTP 402 Payment Required?

HTTP 402 Payment Required is a reserved status code. The HTTP standard created it for digital cash or micropayments, and the web never settled on one required use. MDN documents it as reserved and nonstandard, checked on 20 Nov 2026.

Attackfee uses 402 for automated clients that send `Attackfee-Client: agent` and then hit a priced write with no valid pass. A browser does not get 402. A browser gets 403 and a work challenge.

## What the reserved code means

MDN's page on 402 says the code is reserved, that no standard convention exists for its use, and that some services use it. That is the whole official picture. Later projects have given 402 a concrete body and headers, including payment offers a client can complete and retry. Those are specifications in their own right, not a single HTTP rule.

HTTP 429 is a different code. 429 means the client has sent too many requests. It can include a Retry-After hint. 402 is about payment (or, in Attackfee, a priced write). They are not interchangeable. See [Rate limiting compared with pricing writes](/learn/comparisons/rate-limiting-vs-pricing-writes).

## How Attackfee uses it

On a write with `Attackfee-Client: agent` and no pass, a live Attackfee issuer on attackfee.dev returns 402 with a JSON body. The body includes offers and a `challenge_url`. The client can pay an offer the site lists as live, or it can do the work at that URL, then retry with a pass.

People never see this status. People never pay money. Their browser earns a work pass and, if they have no pass, receives 403, not 402.

A self-hosted Node issuer does not return a live payment offer unless you have configured that path. A self-hosted issuer uses a stub backend by default. Work remains available.

## Where Attackfee fits

Agents should treat 402 as "this write is priced" and read the body, not as a locked page. See [How does a paid write work?](/learn/payments/how-does-a-paid-write-work) and the [agent docs](/docs/agent).
