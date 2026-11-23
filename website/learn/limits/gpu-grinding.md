---
title: What GPU grinding means for proof of work
description: Proof of work is cheap on rented GPUs, so a funded attacker can still earn passes by grinding. Attackfee does not claim to stop that. Memory-hard mode is opt-in and still not a guarantee.
hub: limits
slug: gpu-grinding
type: edge-case
order: 70
related:
  - /learn
  - /learn/limits/funded-attackers
  - /learn/concepts/memory-hard-mode
  - /learn/concepts/what-is-proof-of-work-for-websites
  - /learn/concepts/volume-should-cost-volume
audience: both
status: published
schema: WebPage
faq:
  - q: "Does memory-hard mode close this?"
    a: "No. It makes the work more expensive to grind, and it is off by default because it is heavier on phones. It does not make the cost infinite."
  - q: "Does the challenge-rate limit stop a GPU?"
    a: "The issuer caps challenges at 60 per minute per network address to protect its own CPU. That is not a general flood filter, and it is not a claim that grinding is impossible."
  - q: "Is paying cheaper than grinding?"
    a: "When payments are on, paying the live price is a legitimate path, not a loophole. Look at /v1/price rather than hardcoding a figure."
  - q: "Should I treat this as a solved limit?"
    a: "No. A funded attacker can still get through. Keep that limit in view."
---

# What GPU grinding means for proof of work

Proof of work is cheap on rented GPUs. A funded attacker can earn work passes by grinding the same check a browser runs in the background. Attackfee does not claim to stop that.

A work pass still covers only 20 actions for 15 minutes, so volume has to keep earning. That raises the cost of unattended posting. It does not make the cost infinite, and it does not identify the caller.

Optional memory-hard mode switches the work to Argon2id. It is off by default, because it is heavier on phones and costs the issuer more to mint. Turn it on only if you are under GPU pressure and you accept that tradeoff. It still does not stop someone who is willing to keep spending.

The issuer also caps challenge minting at 60 requests per minute per network address, to protect its own CPU. That is not a general flood filter.

## Where Attackfee fits

Use Attackfee so casual automated volume is no longer free. Do not treat GPU grinding as solved. See [What a funded attacker can still do](/learn/limits/funded-attackers) and [When to turn on memory-hard work](/learn/concepts/memory-hard-mode).
