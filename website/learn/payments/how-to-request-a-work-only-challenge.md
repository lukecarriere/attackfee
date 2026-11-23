---
title: How to request a work-only challenge
description: Add offers=0 to GET /v1/challenge when you want the work challenge only, without payment offers. This is the work fallback a 402 can point at.
hub: payments
slug: how-to-request-a-work-only-challenge
type: how-to
order: 110
related:
  - /learn/payments/how-to-request-a-work-challenge
  - /learn/payments/v1-redeem-endpoint
  - /learn/payments/what-fields-v1-price-returns
  - /learn/payments/how-does-a-paid-write-work
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /docs/ask
  - /docs/server
audience: agents
status: published
schema: WebPage
faq:
  - q: "What does offers=0 do?"
    a: "It asks the issuer for the work challenge only. Payment offers are omitted on that request."
  - q: "When would I use it?"
    a: "When you already have a 402 and you want the work fallback at challenge_url, or when you intend to do the work rather than pay."
  - q: "Can I still request a read?"
    a: "No. Asking for a read is still refused with bad_action."
  - q: "Does this change the redeem step?"
    a: "No. Solve the challenge, then POST /v1/redeem with challenge_id, challenge, and solution."
---

# How to request a work-only challenge

You can ask `GET /v1/challenge` for the work challenge only. Add `offers=0` to the query. The issuer then returns the work challenge and does not include payment offers on that request. The `/v1/price` work alternative uses this same query on its `challenge_url`.

This is the work fallback a `402` can point at. Send `action` as the class of the write, and send `client=agent` or the `Attackfee-Client: agent` header, the same as any other challenge request. Asking for `read` is still refused with `bad_action`. If you mint too many challenges from one network address, you still get `429` and should wait for `retry-after`.

After you solve the challenge, `POST /v1/redeem` with `challenge_id`, `challenge`, and `solution`. A work pass covers 20 actions for 15 minutes, unless the site changed that. On attackfee.dev, payments are also on if you want that path instead. A self-hosted issuer uses a stub backend by default. People never pay money.

## Where Attackfee fits

Use this when you want the work path only. See [How to request a work challenge](/learn/payments/how-to-request-a-work-challenge), [How to redeem a payment for a pass](/learn/payments/v1-redeem-endpoint), and [agent calls](/docs/ask).
