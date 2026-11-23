---
title: What Attackfee is not for
description: Attackfee does not gate page views, block crawlers, filter network floods, identify the caller, or claim to stop a funded attacker. It prices writes and leaves reads free.
hub: limits
slug: what-attackfee-is-not-for
type: intention
order: 30
related:
  - /learn
  - /learn/limits
  - /learn/limits/no-bot-score
  - /learn/limits/funded-attackers
  - /learn/limits/network-floods-vs-request-pricing
  - /learn/concepts/what-is-attackfee
  - /learn/concepts/what-attackfee-is-for
audience: both
status: published
schema: WebPage
faq:
  - q: "Does it stop every automated write?"
    a: "No. Volume has to keep paying the cost, but someone willing to spend can keep going."
  - q: "Can I use it as a page-view gate?"
    a: "You should not. The product is built so GET stays free. Gating page views hides you from readers and answer engines."
  - q: "Does it replace my host's flood defense?"
    a: "No. It does not filter network floods."
  - q: "Does it moderate comment text?"
    a: "No. It checks the pass, not the body of the post. Your own moderation still applies after a pass is accepted."
  - q: "Does a typical install pay me?"
    a: "No. A payment, when that path is on, is the cost of the write. Self-hosted and WordPress installs do not take that payment themselves."
---

# What Attackfee is not for

Attackfee is write-side security. It is not a bot detector, a crawler block, a flood filter, or a way to gate page views. It does not identify the caller, and it does not claim to stop a funded attacker. Proof of work is cheap on rented GPUs, so someone willing to spend can keep going.

It is also not a comment moderator. It checks that a write has a valid pass. It does not read the body to decide what the post says.

It is not a payout product on a typical install. Payments are on for attackfee.dev. A self-hosted issuer uses a stub backend by default. The WordPress plugin takes no payments itself. People never pay money.

Use it to put a small cost on comments, signups, logins, posted search, and write APIs, and to leave reading free. For the limits in more detail, see [What a funded attacker can still do](/learn/limits/funded-attackers) and [Why Attackfee does not stop network floods](/learn/limits/network-floods-vs-request-pricing).
