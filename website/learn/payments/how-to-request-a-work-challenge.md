---
title: How to request a work challenge
description: GET /v1/challenge returns a challenge for a write. Asking for a read is refused. A request that is rate limited gets 429. On WordPress the same route lives under /wp-json/attackfee/v1/.
hub: payments
slug: how-to-request-a-work-challenge
type: how-to
order: 100
related:
  - /learn/payments/v1-redeem-endpoint
  - /learn/limits/what-a-429-on-a-challenge-means
  - /learn/payments/how-does-a-paid-write-work
  - /learn/concepts/what-happens-without-a-pass
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /docs/ask
  - /docs/server
audience: agents
status: published
schema: WebPage
faq:
  - q: "Can I request a challenge for a read?"
    a: "No. Asking for a read is refused. A 400 with bad_action means read is not a priced action. Use write, search, account, or admin."
  - q: "How does an agent ask for a challenge?"
    a: "GET /v1/challenge with action set to the write class, and client=agent, or send Attackfee-Client: agent. A 402 response also includes a challenge_url."
  - q: "What if I get a 429?"
    a: "The issuer is rate limited. The official table says to wait for retry-after, which is 60 seconds."
  - q: "Does this mint a payment offer for a browser?"
    a: "People never pay money. Their browser uses the widget, not this call, to earn a work pass."
---

# How to request a work challenge

An automated client that needs a work pass can request a challenge with `GET /v1/challenge`. Set `action` to the class of the write, such as `write`, and send `client=agent` or the `Attackfee-Client: agent` header. The response is a challenge to solve, and, when the site takes payment, it may also include offers. Asking for a read is refused. A 400 with `bad_action` means `read` is not a priced action.

A 402 from a refused write also includes a `challenge_url` that points at this endpoint. After you solve the challenge, `POST /v1/redeem` with the challenge id, the challenge, and the solution. That is how you get a work pass. A work pass covers 20 actions for 15 minutes. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default.

If you mint too many challenges from one network address, `/v1/challenge` returns 429. Wait for `retry-after`, which is 60 seconds. On WordPress the same routes live under `/wp-json/attackfee/v1/`. People never pay money.

## Where Attackfee fits

Request a challenge only for a write, solve it, redeem a pass, then present the pass. See [How to redeem a payment for a pass](/learn/payments/v1-redeem-endpoint), [What a 429 on a challenge means](/learn/limits/what-a-429-on-a-challenge-means), and [agent calls](/docs/ask).
