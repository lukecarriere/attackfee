---
title: How people and bots hit the same form
description: A public form accepts the same fields from a person and from a program. Shared networks make address-based guesses worse. Attackfee prices the write instead of trying to tell the callers apart.
hub: write-surfaces
slug: people-and-bots-on-the-same-form
type: background
order: 80
related:
  - /learn
  - /learn/concepts/price-the-action-not-the-caller
  - /learn/limits/no-bot-score
  - /learn/comparisons/ip-blocking-vs-pricing-writes
  - /learn/concepts/what-is-a-write-surface
audience: both
status: published
schema: WebPage
faq:
  - q: "Can Attackfee tell a person from a program?"
    a: "No. It does not score the caller. Both can get a pass, one by waiting on the work, the other by doing the same work or by paying when that path is on."
  - q: "What about a shared office or mobile network?"
    a: "Many people can appear to come from one address, and one script can appear to come from many. Attackfee does not block by network address, so a shared network is not treated as a single suspect."
  - q: "Does a new address pay more?"
    a: "No. The cost is on the action, not on whether the address is new."
  - q: "Will this block a person on a VPN?"
    a: "Not by the address. A person still earns a work pass in the background, the same as on any other connection."
  - q: "Is the challenge-rate limit a block list?"
    a: "No. The issuer caps challenges at 60 per minute per network address to protect its own CPU. That is not a general block list."
---

# How people and bots hit the same form

A public form does not know who is calling. A person and a program can post the same fields, from the same kind of request. Tools that guess from a network address have a further problem: many people can share one address, on an office network, a campus, or a mobile carrier, and one script can spread itself across many addresses.

Attackfee does not try to tell those callers apart. It prices the write. A person earns a work pass in the background while they read or type. An automated client does the same work, or pays when that path is on. A new address and a known one are treated the same.

Attackfee does not block by network address. The issuer does cap challenge minting at 60 requests per minute per network address, to protect its own CPU. That is not a block list, and it is not a verdict about the people behind a shared network.

## Where Attackfee fits

If you need a block list, keep the one your host already provides. Use Attackfee on the write itself. See [Price the action, not the caller](/learn/concepts/price-the-action-not-the-caller) and [IP blocking compared with pricing writes](/learn/comparisons/ip-blocking-vs-pricing-writes).
