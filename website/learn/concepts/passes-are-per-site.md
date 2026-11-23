---
title: Do passes work across sites?
description: No. An Attackfee pass is for one site. A pass minted on one issuer will not authorize a write on another site.
hub: concepts
slug: passes-are-per-site
type: edge-case
order: 260
related:
  - /learn
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/how-to-check-writes-on-your-server
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "Can I share one pass across my two domains?"
    a: "No. Each site has its own issuer and site id. A pass is checked for that site."
  - q: "Is a pass a login that follows the person?"
    a: "No. A pass only says the cost for a write on that site was paid, in work or in money. It does not identify the caller."
  - q: "What if I copy a pass to another host?"
    a: "The other host should refuse it. The check includes the site."
  - q: "Does the cookie name stay the same?"
    a: "The cookie is attackfee_pass. It still only works for the site that issued it, and it lasts as long as the work pass."
---

# Do passes work across sites?

No. An Attackfee pass is for one site. A pass minted by one issuer will not authorize a write on a different site.

The server check includes the site id. If you run two origins, each one needs its own issuer, its own secret, and its own passes. A visitor who writes on both will earn or pay on each site separately.

A pass is not a login, and it does not identify the caller. It only says the cost for a write on that site was paid, in work or in money. The `attackfee_pass` cookie lasts as long as the work pass, and only for the site that set it.

## Where Attackfee fits

See [What is an Attackfee pass?](/learn/concepts/what-is-a-write-pass) and [How long does an Attackfee pass last?](/learn/concepts/how-long-a-pass-lasts).
