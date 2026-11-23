---
title: Two requests cannot share a pass use
description: Each pass use is counted so two requests cannot spend the same use. A challenge id is single-use. If siteverify says timeout-or-duplicate, the pass expired, was used up, or was sent again.
hub: concepts
slug: two-requests-cannot-share-a-pass-use
type: edge-case
order: 410
related:
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/why-short-lived-passes-matter
  - /learn/concepts/how-to-check-a-pass-with-siteverify
  - /learn/concepts/several-forms-on-one-page
  - /learn/payments/paid-pass-reuse-and-expiry
  - /learn/concepts/what-is-a-write-pass
  - /docs/ask
audience: both
status: published
schema: WebPage
faq:
  - q: "What if two tabs submit the same form at once?"
    a: "Each pass use is counted so two requests cannot spend the same use. One of them will need a new pass if the last use was already spent."
  - q: "Does a status check spend a use?"
    a: "No. GET /v1/status does not spend a use. POST /v1/siteverify does."
  - q: "Can I reuse a challenge id?"
    a: "No. Each challenge id is single-use."
  - q: "What about a paid pass?"
    a: "A paid pass is one write and at most 60 seconds. A second write needs a new payment, or the work instead."
---

# Two requests cannot share a pass use

A pass is spent per write, not per browser window. Each pass use is counted so two requests cannot spend the same use. If two tabs, or two automated clients, present the same remaining use at the same time, only one write gets it. The other request is refused. Each challenge id is single-use too.

If you check a pass with `POST /v1/siteverify` and the result is `timeout-or-duplicate`, the official meaning is that the pass expired, was used up, or was sent again. Get a new pass. `GET /v1/status` can tell you how many uses are left without spending one.

A work pass covers 20 actions for 15 minutes, so this usually shows up at the last use, or when two posts race. A paid pass is one write and at most 60 seconds, so there is no pool of leftover uses to share. People never pay money.

## Where Attackfee fits

Expect a new pass when uses run out, including after a race between two requests. See [How long does an Attackfee pass last?](/learn/concepts/how-long-a-pass-lasts), [Why short-lived passes matter](/learn/concepts/why-short-lived-passes-matter), and [How to check a pass with /v1/siteverify](/learn/concepts/how-to-check-a-pass-with-siteverify).
