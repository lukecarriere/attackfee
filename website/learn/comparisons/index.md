---
title: Comparisons
description: How pricing a write differs from rate limiting, and when to use both. They are not the same control.
hub: comparisons
slug: index
type: hub
order: 0
related:
  - /learn
  - /learn/comparisons/rate-limiting-vs-pricing-writes
  - /learn/comparisons/ip-blocking-vs-pricing-writes
  - /learn/comparisons/proof-of-work-compared-with-interactive-challenges
  - /learn/concepts/how-attackfee-works
  - /learn/payments/what-is-http-402
  - /docs
audience: both
status: published
schema: WebPage
faq:
  - q: "Is HTTP 402 a rate limit?"
    a: "No. HTTP 402 means payment is required. HTTP 429 means too many requests."
  - q: "Should I drop my existing rate limits?"
    a: "No. Keep a ceiling if you need one. A valid pass is not a license to flood the handler."
  - q: "Does pricing writes stop a flood of GET traffic?"
    a: "No. Reads stay free, and Attackfee does not filter network floods."
---

# Comparisons

Pricing a write and rate limiting solve different problems. You can use both.

- [Rate limiting compared with pricing writes](/learn/comparisons/rate-limiting-vs-pricing-writes)
- [IP blocking compared with pricing writes](/learn/comparisons/ip-blocking-vs-pricing-writes)
- [Proof of work compared with interactive challenges](/learn/comparisons/proof-of-work-compared-with-interactive-challenges)

For the mechanism itself, see [How does Attackfee work?](/learn/concepts/how-attackfee-works).
