---
title: Why Attackfee does not score who you are
description: Attackfee prices the action and does not score the caller. It does not say whether a visitor is a person or a program. Checks run on the site owner's server, and the page script never reads form fields.
hub: limits
slug: no-bot-score
type: philosophy
order: 20
related:
  - /learn
  - /learn/limits
  - /learn/limits/what-attackfee-is-not-for
  - /learn/concepts/price-the-action-not-the-caller
  - /privacy
  - /learn/comparisons/rate-limiting-vs-pricing-writes
audience: both
status: published
schema: WebPage
faq:
  - q: "Does Attackfee detect bots or AI?"
    a: "No. There is no bot score and no verdict on who is a person. Every protected write needs a pass, whoever sends it."
  - q: "Does the page script read the form?"
    a: "No. It never reads or sends what people type into the form. It only adds a pass."
  - q: "Are checks sent to a third party?"
    a: "No. Checks run on the site owner's server. There are no third-party cookies and no tracking pixels from Attackfee."
  - q: "Does it block by network address?"
    a: "No. Attackfee does not block by network address. A challenge-rate limit protects the issuer, and that is not the product pitch."
  - q: "Is a pass a login?"
    a: "No. It only says the cost for a write was paid, in work or in money."
---

# Why Attackfee does not score who you are

Attackfee prices the action, not the caller. There is no score, and no verdict about whether a visitor is a person or a program. A protected write needs a pass, whoever sends it.

That is also how privacy is handled in the product:

- The page script never reads or sends form field values.
- Checks run on the site owner's server.
- There are no third-party cookies and no tracking pixels from Attackfee.
- Attackfee does not block by network address, and it does not identify the caller.
- A pass is not a login.

The public Attackfee site itself is static files with no analytics and no tracking scripts. The local MCP server runs on your computer and stores no data about the caller. The product privacy statement is at [/privacy](/privacy).

A score would be a claim about identity. Attackfee does not make that claim. A funded attacker can still get through by paying the cost. Those limits are part of the design, not gaps to paper over.

## Where Attackfee fits

If you need a vendor score or a block list, that is a different product. Attackfee sits on the write and asks for a pass. See [What Attackfee is not for](/learn/limits/what-attackfee-is-not-for).
