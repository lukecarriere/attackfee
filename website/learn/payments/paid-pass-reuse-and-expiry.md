---
title: Paid pass reuse and expiry
description: A paid pass, when that path is on, covers one write and lasts at most 60 seconds. It is not meant to be reused. A work pass is different: 20 actions for 15 minutes.
hub: payments
slug: paid-pass-reuse-and-expiry
type: edge-case
order: 70
related:
  - /learn
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/v1-redeem-endpoint
  - /learn/concepts/volume-should-cost-volume
audience: both
status: published
schema: WebPage
faq:
  - q: "Can I reuse a paid pass for a second write?"
    a: "No. A paid pass covers one write. A second write needs a new payment, or the work path."
  - q: "What if 60 seconds pass before I send the write?"
    a: "The paid pass is no longer valid. Redeem or earn a new one."
  - q: "Do people get paid passes?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "Is this the same as a work pass?"
    a: "No. A work pass covers 20 actions for 15 minutes. A paid pass is one write and at most 60 seconds."
  - q: "What if redeem fails?"
    a: "No pass is issued, and the write is refused until the client presents a valid pass."
---

# Paid pass reuse and expiry

A paid pass, when that path is on, covers one write and lasts at most 60 seconds. It is not meant to be reused. Paying once does not unlock a session of unbounded volume.

Those limits are the product defaults, and they also appear in the live well-known file's steps. After the pass is spent or expires, the client has to pay again, or do the work instead. If a payment is invalid or does not complete, redeem does not issue a pass, and the write is refused.

People never see this path and never pay money. Their browser earns a work pass, which is different: 20 actions for 15 minutes, whichever comes first.

Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself.

## Where Attackfee fits

See [How long does an Attackfee pass last?](/learn/concepts/how-long-a-pass-lasts) and [How does a paid write work?](/learn/payments/how-does-a-paid-write-work).
