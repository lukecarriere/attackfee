---
title: What a 429 on a challenge means
description: A 429 on /v1/challenge means the issuer has rate limited challenge minting for that network address. The official error is rate_limited. Wait for retry-after, which is 60 seconds. This is not a site-wide flood filter.
hub: limits
slug: what-a-429-on-a-challenge-means
type: edge-case
order: 90
related:
  - /learn/limits/network-floods-vs-request-pricing
  - /learn/payments/how-to-request-a-work-challenge
  - /learn/comparisons/rate-limiting-vs-pricing-writes
  - /learn/limits/gpu-grinding
  - /learn/concepts/what-attackfee-http-statuses-mean
  - /docs/ask
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "What should a client do after a 429?"
    a: "Wait for retry-after, which is 60 seconds, then request a challenge again if you still need one."
  - q: "Is this a general rate limit for the whole site?"
    a: "No. It caps challenge minting at 60 requests per minute per network address, to protect the issuer's CPU. It does not filter a network flood on other routes."
  - q: "Does a 429 mean the caller is blocked?"
    a: "No. Attackfee does not identify the caller and does not pitch itself as blocking by network address. The limit is on challenge issuance."
  - q: "Do people hit this on a contact form?"
    a: "A person using the widget rarely mints at that rate. People never pay money. Their browser earns a work pass in the background."
---

# What a 429 on a challenge means

If `GET /v1/challenge` returns HTTP 429, the issuer has rate limited challenge minting for that network address. The official agent-calls table names the error `rate_limited` and says to wait for `retry-after`, which is 60 seconds. Then you can request a challenge again if you still need one.

The default cap is 60 challenges per minute per network address. That limit exists to protect the issuer's CPU. Minting a challenge costs work on the server, and it costs more in memory-hard mode. The cap is a narrow defense for the issuer. It is not a general flood filter, and it is not a block list. Attackfee does not identify the caller. Keep your existing network flood defense in front of the site.

People never pay money. A visitor's browser earns a work pass in the background and does not usually mint challenges at this rate. Automated clients that retry in a tight loop will see 429 first.

## Where Attackfee fits

Treat 429 as a cue to wait, not as a verdict about the caller. See [Why Attackfee does not stop network floods](/learn/limits/network-floods-vs-request-pricing), [How to request a work challenge](/learn/payments/how-to-request-a-work-challenge), and [What Attackfee HTTP statuses mean](/learn/concepts/what-attackfee-http-statuses-mean).
