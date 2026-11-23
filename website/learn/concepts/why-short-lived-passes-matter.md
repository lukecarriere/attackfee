---
title: Why short-lived passes matter
description: A work pass lasts 15 minutes and covers 20 actions. A paid pass is one write and at most 60 seconds. Short limits keep a stolen or reused pass from covering a long run of writes.
hub: concepts
slug: why-short-lived-passes-matter
type: philosophy
order: 310
related:
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/passes-are-per-site
  - /learn/payments/paid-pass-reuse-and-expiry
  - /learn/concepts/volume-should-cost-volume
  - /learn/limits/funded-attackers
  - /learn/agents/an-agent-that-pays-for-one-write
audience: both
status: published
schema: WebPage
faq:
  - q: "Can I lengthen a paid pass so one payment covers a batch?"
    a: "No. A paid pass is one write and at most 60 seconds. A second write needs a new payment, or the work instead."
  - q: "What happens when a work pass runs out mid-visit?"
    a: "The next write needs a new pass. In a browser, the widget can earn another one in the background."
  - q: "Are challenge ids reusable?"
    a: "No. Each challenge id is single-use. Each pass use is counted so two requests cannot spend the same use."
  - q: "Do people pay when a pass expires?"
    a: "No. People never pay money. Their browser can earn a new work pass."
---

# Why short-lived passes matter

A pass is meant to cover a short stretch of writes, not a long-running session. A work pass lasts 15 minutes and covers 20 actions. A paid pass is one write and at most 60 seconds. Those limits matter because a pass is not tied to a person. If it lasted for hours, or covered an unbounded number of posts, a reused pass could underwrite a long run of writes at no further cost.

Each challenge id is single-use. Each pass use is counted, so two requests cannot spend the same use. When the uses or the time run out, the next write needs a new pass. People never pay money. Their browser can earn another work pass in the background. An automated client does the work again, or pays again when payments are on.

Short limits do not stop a funded attacker who is willing to keep earning or paying. They do keep volume aligned with cost.

## Where Attackfee fits

Leave the defaults in place unless you have a documented reason to change them. See [How long does an Attackfee pass last?](/learn/concepts/how-long-a-pass-lasts), [Paid pass reuse and expiry](/learn/payments/paid-pass-reuse-and-expiry), and [Volume should cost volume](/learn/concepts/volume-should-cost-volume).
