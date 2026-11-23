---
title: Volume should cost volume
description: A work pass covers 20 actions for 15 minutes. A paid pass covers one write and lasts at most 60 seconds. Automated volume has to keep earning or paying. That does not make the cost infinite.
hub: concepts
slug: volume-should-cost-volume
type: philosophy
order: 210
related:
  - /learn
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/price-the-action-not-the-caller
  - /learn/limits/funded-attackers
  - /learn/payments/how-does-a-paid-write-work
audience: both
status: published
schema: WebPage
faq:
  - q: "Why 20 actions and 15 minutes?"
    a: "Those are the product defaults for a work pass, and they also appear on the Attackfee homepage. A person in a thread is usually covered. A script that keeps going has to earn another pass."
  - q: "Why is a paid pass only one write?"
    a: "So paying once does not unlock unbounded volume. Each paid write, when that path is on, needs a new payment, and the pass lasts at most 60 seconds."
  - q: "Does this stop a funded attacker?"
    a: "No. It makes volume cost volume. Someone willing to keep paying can still get through."
  - q: "Do people hit these limits in normal use?"
    a: "A work pass is meant to cover a normal visit. If it expires mid-form, the page script can earn another in the background."
---

# Volume should cost volume

Attackfee is built so that more writes cost more. A work pass covers 20 actions for 15 minutes, whichever comes first. A paid pass, when that path is on, covers one write and lasts at most 60 seconds. After that, the client has to earn or pay again.

Those numbers are the product defaults. They also appear on the Attackfee homepage. A person who is actually using a form is usually inside one work pass. A script that keeps posting has to keep doing the work, or keep paying.

This is not a claim that the cost is infinite. Proof of work is cheap on rented GPUs. A funded attacker can still get through. The design makes unattended volume more expensive than a single genuine post, and it leaves reading free.

## Where Attackfee fits

See [How long does an Attackfee pass last?](/learn/concepts/how-long-a-pass-lasts) and [What a funded attacker can still do](/learn/limits/funded-attackers).
