---
title: Rate limiting compared with pricing writes
description: Rate limiting caps how many requests one client can send in a window. Pricing a write charges work, or a payment, for each attempt. They solve different problems and can be used together.
hub: comparisons
slug: rate-limiting-vs-pricing-writes
type: comparison
order: 10
related:
  - /learn
  - /learn/payments/what-is-http-402
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/how-attackfee-works
  - /learn/comparisons/ip-blocking-vs-pricing-writes
  - /learn/limits/network-floods-vs-request-pricing
  - /docs
audience: both
status: published
schema: WebPage
faq:
  - q: "Is a 402 a rate limit?"
    a: "No. HTTP 402 means payment is required. HTTP 429 means too many requests. Attackfee uses 402 for automated clients on a priced write, and 403 for a browser that still needs a work pass."
  - q: "Does Attackfee replace my API rate limit?"
    a: "No. Keep a ceiling if you need one. A valid pass is not a license to flood the handler."
  - q: "Why does Attackfee also rate-limit challenges?"
    a: "To protect the issuer from being used as a free compute loop. The product you present to visitors is the priced write, not that ceiling."
  - q: "Will pricing writes stop a flood of GET traffic?"
    a: "No. Reads stay free, and Attackfee does not filter network floods. That is a job for your host."
  - q: "Can a client get around a price by opening many connections?"
    a: "They can try. Each write still needs a valid pass, and each pass still costs work or a payment. That is the point of pricing the action, and it is also why a funded attacker is not claimed to be blocked."
---

# Rate limiting compared with pricing writes

Rate limiting caps how many requests one client can send in a window. Pricing a write charges a small cost, in work or in a payment, for each attempt that changes something. They are not the same control. You can use both.

## What rate limiting does

A rate limiter counts requests from a key, often a network address or an API token, and refuses the ones that exceed a budget. HTTP 429 Too Many Requests is the usual status, and the response can include Retry-After. MDN documents 429 that way, checked on 20 Nov 2026.

That is a good fit when you want a ceiling: no more than N tries per minute from this key. It is a weaker fit when a sender can rotate keys, or when a modest number of requests is still expensive for you, as a comment, a signup, or a paid search query can be.

A rate limiter also does not say anything about reads compared with writes unless you build that split yourself. Many default limits apply to every request on a route.

## What pricing a write does

Attackfee leaves reads free and charges for the write. A person pays in a short burst of background work and gets a pass for 20 actions in 15 minutes. An automated client does the same work, or, on attackfee.dev, can pay per write. Volume has to keep paying that cost. A funded attacker can still get through. The product does not identify the caller and does not stop a network flood.

Attackfee's issuer also limits new challenges to 60 per minute per network address. That limit protects the issuer. It is not the product pitch, and it is not a replacement for flood defense at the network layer.

## When to use which

- Use a rate limit when you need a hard ceiling on a key, including after a valid pass.
- Use a priced write when the problem is that a single accepted comment, signup, login try, or posted query costs you, and you want that cost to sit on the sender.
- Use both when you want the write to be priced and you still want a ceiling.

Pricing a write is also a different idea from a challenge box in the page. Attackfee does not ask a person to solve anything. The check runs in the background.

## Where Attackfee fits

Mark write surfaces, check passes, and keep whatever rate limits you already have on login and APIs. See [What is HTTP 402 Payment Required?](/learn/payments/what-is-http-402) and [What is a write surface?](/learn/concepts/what-is-a-write-surface).
