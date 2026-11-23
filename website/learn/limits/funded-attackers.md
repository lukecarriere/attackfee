---
title: What a funded attacker can still do
description: Attackfee does not claim to stop a funded attacker. Someone willing to keep paying the cost, in work or in money, can still get through. Proof of work is cheap on rented GPUs.
hub: limits
slug: funded-attackers
type: edge-case
order: 40
related:
  - /learn
  - /learn/limits
  - /learn/limits/what-attackfee-is-not-for
  - /learn/concepts/volume-should-cost-volume
  - /learn/limits/gpu-grinding
  - /learn/concepts/memory-hard-mode
  - /learn/limits/network-floods-vs-request-pricing
audience: both
status: published
schema: WebPage
faq:
  - q: "Does payment stop a funded attacker?"
    a: "No. Paying the published price, when that path is on, is the intended path for an automated client. Volume still has to pay volume."
  - q: "Does memory-hard work close this?"
    a: "No. It makes the work more expensive to grind, but someone willing to spend can keep going."
  - q: "What does Attackfee change for this attacker?"
    a: "Each write has a cost. It does not make the cost infinite, and it does not identify the caller."
  - q: "Can they reuse one paid pass forever?"
    a: "No. A paid pass is one write and at most 60 seconds. They would have to pay again."
  - q: "Is this the same as a network flood?"
    a: "No. A flood of packets is a different problem. Attackfee does not filter that."
---

# What a funded attacker can still do

Attackfee does not claim to stop a funded attacker. Someone willing to keep paying the cost, in work or in money, can still get through.

That is a stated limit of the design. Proof of work is cheap on rented GPUs. A payment, when that path is on, is also a legitimate way through: the 402 is an offer, not a wall that only people can pass. A paid pass is one write and lasts at most 60 seconds, so volume still has to pay volume. A work pass is 20 actions for 15 minutes, then the client has to earn another.

Memory-hard work, when you turn it on, raises the cost of grinding. It does not make the cost infinite. Attackfee also does not identify the caller, so there is no score to drop them on later.

Keep your host's flood defense and any review you already do on accepted posts. Attackfee only checks that the write paid the cost.

## Where Attackfee fits

Use Attackfee so casual automated volume is no longer free. Do not treat it as a guarantee against a determined spender. See [What Attackfee is not for](/learn/limits/what-attackfee-is-not-for) and [When to turn on memory-hard work](/learn/concepts/memory-hard-mode).
