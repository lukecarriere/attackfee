---
title: What Attackfee HTTP statuses mean
description: A browser-style write with no pass gets 403. An automated client that sends Attackfee-Client: agent gets 402. A rate limited challenge gets 429. If the pass store is down, protected writes get 503.
hub: concepts
slug: what-attackfee-http-statuses-mean
type: how-to
order: 400
related:
  - /learn/concepts/what-happens-without-a-pass
  - /learn/limits/fail-closed-behavior
  - /learn/limits/what-a-429-on-a-challenge-means
  - /learn/payments/what-is-http-402
  - /learn/payments/how-to-request-a-work-challenge
  - /docs/ask
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "Why did a form post get 403?"
    a: "A caller with no pass gets 403 and attackfee_required, plus a fresh challenge, unless it sent Attackfee-Client: agent. Then it gets 402."
  - q: "Why did an agent get 402?"
    a: "The client sent the agent header and had no pass. The JSON includes a payment offer when payments are on, and a link to the work challenge."
  - q: "Why a 400 from /v1/challenge or /v1/redeem?"
    a: "bad_action means you asked for a read. malformed on redeem means the body needs challenge_id, challenge, and solution for the challenge you got."
  - q: "Why a 503?"
    a: "The pass store is down. Protected writes fail closed. Do not accept the write."
---

# What Attackfee HTTP statuses mean

Attackfee uses a small set of HTTP statuses on priced writes and on the `/v1` API. They are easier to handle if you treat each one as a specific next step, not as a generic failure.

A browser-style write with no pass gets `403` and `attackfee_required`, with a fresh challenge. A client that sends `Attackfee-Client: agent` and has no pass gets `402`, with a way to do the work and, when payments are on, offers. If `GET /v1/challenge` is rate limited, the status is `429` and the error is `rate_limited`. Wait for `retry-after`, which is 60 seconds. If the pass store is down, protected writes get `503`. Fail closed. Do not accept the write.

A `400` with `bad_action` means you asked for a read on a challenge. Use `write`, `search`, `account`, or `admin`. A `400` with `malformed` from `/v1/redeem` means the body needs `challenge_id`, `challenge`, and `solution` for the challenge you got. `POST /v1/siteverify` may say `timeout-or-duplicate` when the pass expired, was used up, or was sent again.

People never pay money. Reads, including `GET /v1/health` and `GET /v1/price`, stay free.

## Where Attackfee fits

Match the status to the next step, then present a valid pass on the write. See [What happens if a write has no pass?](/learn/concepts/what-happens-without-a-pass), [What happens if the pass store is down?](/learn/limits/fail-closed-behavior), and [agent calls](/docs/ask).
