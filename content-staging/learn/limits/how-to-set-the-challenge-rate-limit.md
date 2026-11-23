---
title: How to set the challenge rate limit
description: rate_limit.challenge_per_min caps how many work challenges the Node issuer will mint per network address per minute. The default is 60. A request over that cap gets 429.
hub: limits
slug: how-to-set-the-challenge-rate-limit
type: how-to
order: 100
related:
  - /learn/limits/what-a-429-on-a-challenge-means
  - /learn/payments/how-to-request-a-work-challenge
  - /learn/concepts/what-attackfee-yaml-configures
  - /learn/concepts/how-to-set-trusted-proxies
  - /learn/limits/network-floods-vs-request-pricing
  - /docs/server
  - /docs/ask
audience: owners
status: published
schema: WebPage
faq:
  - q: "What is the default?"
    a: "60 challenges per minute per network address, if you leave rate_limit.challenge_per_min out of the config."
  - q: "What does a client see when it hits the cap?"
    a: "HTTP 429, error rate_limited, and retry-after of 60 seconds."
  - q: "Does this stop a network flood?"
    a: "No. It is a narrow cap on challenge minting. Keep your existing network flood defense in front of the site."
  - q: "How does WordPress count the address?"
    a: "The plugin's challenge rate limit always uses REMOTE_ADDR. On Node, list trusted proxies if the issuer sits behind one."
---

# How to set the challenge rate limit

The Node issuer caps how many work challenges it will mint for one network address in a minute. Set that cap in `attackfee.yaml` as `rate_limit.challenge_per_min`. If you leave the key out, the default is 60. That is also the figure in `attackfee.example.yaml`.

When a request goes over the cap, `GET /v1/challenge` returns HTTP `429`, the error `rate_limited`, and `retry-after` of 60 seconds. The cap exists to protect the issuer's CPU. Minting a challenge costs work on the server, and it costs more in memory-hard mode. It is not a general flood filter, and it is not a block list. Attackfee does not identify the caller.

Get the visitor address right if the issuer sits behind a reverse proxy. List that proxy in `ATTACKFEE_TRUSTED_PROXIES`. On WordPress, the challenge rate limit always uses `REMOTE_ADDR`. People never pay money. A person's browser earns a work pass in the background and does not usually mint challenges at this rate.

## Where Attackfee fits

Change this only if you have a reason to tighten or loosen challenge minting. See [What a 429 on a challenge means](/learn/limits/what-a-429-on-a-challenge-means), [What attackfee.yaml configures](/learn/concepts/what-attackfee-yaml-configures), and [How to set trusted proxies](/learn/concepts/how-to-set-trusted-proxies).
