---
title: Why Attackfee does not stop network floods
description: Attackfee prices a finished HTTP request after it has reached your server. It does not filter packet floods, and it is not a substitute for your host's flood defense.
hub: limits
slug: network-floods-vs-request-pricing
type: edge-case
order: 50
related:
  - /learn
  - /learn/limits
  - /learn/comparisons/ip-blocking-vs-pricing-writes
  - /learn/comparisons/rate-limiting-vs-pricing-writes
  - /learn/limits/fail-closed-behavior
audience: owners
status: published
schema: WebPage
faq:
  - q: "Why mention a challenge-rate limit at all?"
    a: "The issuer caps challenges at 60 per minute per network address so minting work cannot run up your CPU. That is a defense for the issuer, not a flood filter for the rest of the site."
  - q: "Does pricing a write stop a flood of GET traffic?"
    a: "No. GET stays free. A flood of reads is a host and cache problem."
  - q: "Should I drop my existing rate limits?"
    a: "No. Keep them. Pricing a write and limiting a flood do different jobs."
  - q: "Is a 402 a flood defense?"
    a: "No. A 402 is a priced write offer. It arrives after the request has already reached your issuer."
  - q: "What if the store is down during a flood?"
    a: "Protected writes still fail closed with a 503. That does not absorb the flood."
---

# Why Attackfee does not stop network floods

Attackfee prices a finished HTTP request after it has reached your server. It does not filter a flood of packets, and it is not a substitute for your host's flood defense.

GET, HEAD, and OPTIONS stay free, so a flood of reads is also outside the product. Keep caching and the defenses your host already provides.

The issuer does cap challenge minting at 60 requests per minute per network address, to protect its own CPU. That is a narrow limit on challenge issuance. It is not a general flood filter, and it is not a block list. Attackfee does not identify the caller and does not pitch itself as blocking by network address.

## Where Attackfee fits

Use Attackfee on the write after the request has arrived. Keep existing flood defense in front of it. See [IP blocking compared with pricing writes](/learn/comparisons/ip-blocking-vs-pricing-writes) and [Rate limiting compared with pricing writes](/learn/comparisons/rate-limiting-vs-pricing-writes).
