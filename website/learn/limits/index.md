---
title: Privacy and limits
description: What Attackfee does not do, how it treats privacy, what a funded attacker can still do, and what happens when a check cannot run.
hub: limits
slug: index
type: hub
order: 0
related:
  - /learn
  - /learn/limits/what-attackfee-is-not-for
  - /learn/limits/no-bot-score
  - /learn/limits/funded-attackers
  - /learn/limits/fail-closed-behavior
  - /learn/limits/javascript-disabled-browsers
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /privacy
audience: both
status: published
schema: WebPage
faq:
  - q: "Does Attackfee say who is calling?"
    a: "No. It prices the action. It does not score the caller or say whether the caller is a person or a program."
  - q: "Will it stop a funded attacker?"
    a: "No. Someone willing to keep paying the cost, in work or in money, can still get through."
  - q: "What if the pass store is down?"
    a: "Protected writes fail closed with a 503. Reads stay available."
---

# Privacy and limits

Attackfee prices writes and leaves reads free. It does not identify the caller, does not block crawlers, and does not filter network floods. It does not claim to stop a funded attacker. These pages state those limits, how privacy is handled, and what happens when a check cannot run.

- [What Attackfee is not for](/learn/limits/what-attackfee-is-not-for)
- [Why Attackfee does not score who you are](/learn/limits/no-bot-score)
- [What a funded attacker can still do](/learn/limits/funded-attackers)
- [Why Attackfee does not stop network floods](/learn/limits/network-floods-vs-request-pricing)
- [What happens if the pass store is down?](/learn/limits/fail-closed-behavior)
- [What happens when JavaScript is off](/learn/limits/javascript-disabled-browsers)
- [What GPU grinding means for proof of work](/learn/limits/gpu-grinding)
- [How to keep docs and reads open](/learn/limits/how-to-keep-docs-and-reads-open)
- [What a 429 on a challenge means](/learn/limits/what-a-429-on-a-challenge-means)
- [Why page-view gating should stay off](/learn/limits/why-page-view-gating-should-stay-off)
- [What Attackfee keeps, and what it does not](/learn/limits/what-attackfee-keeps)
- [How to set the challenge rate limit](/learn/limits/how-to-set-the-challenge-rate-limit)

The product privacy statement for the public site is at [/privacy](/privacy).
