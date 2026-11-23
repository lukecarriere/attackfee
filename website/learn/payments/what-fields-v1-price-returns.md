---
title: What fields /v1/price returns
description: GET /v1/price returns the action, a current basis when that path is live, a work challenge URL, and reads_free set to true. Do not hardcode a dollar figure. Trust the live body.
hub: payments
slug: what-fields-v1-price-returns
type: how-to
order: 45
related:
  - /learn/payments/v1-price-endpoint
  - /learn/payments/when-the-converted-price-is-hidden
  - /learn/agents/well-known-attackfee-json
  - /learn/concepts/action-classes
  - /learn/payments/how-to-request-a-work-challenge
  - /docs/ask
  - /docs/server
audience: agents
status: published
schema: WebPage
faq:
  - q: "Which action does it default to?"
    a: "write, if you omit the action query. You can request search, account, or admin. read is refused with bad_action."
  - q: "Does the body say that reads are free?"
    a: "Yes. reads_free is true."
  - q: "Where is the work alternative?"
    a: "In the work object, as challenge_url, which points at /v1/challenge for that action."
  - q: "Should I copy a dollar figure from an old response?"
    a: "No. Re-fetch /v1/price. The converted figure can move, and it is hidden when the rate is not fresh."
---

# What fields /v1/price returns

`GET /v1/price` returns a JSON body for one write class. It mints nothing. Do not hardcode a dollar figure. Trust the live body over an old note.

Ask for a class with the `action` query. If you omit it, the issuer uses `write`. `search`, `account`, and `admin` are also valid. `read` is refused with `400` and `bad_action`. You can also send a `path` query; if you omit it, the path is `/`.

The body includes `action`, `basis` set to `current` when that path is live, `load_multiplier` (null when there is no paid offer), a `work` object with `challenge_url`, and `reads_free` set to `true`. It can also include a status for the payment path and a converted figure. That converted figure is hidden when the rate is not fresh. Point clients at `/v1/price` instead of copying a number into code.

On attackfee.dev this is a public GET. A self-hosted issuer may be work-only; the work alternative is still described. People never pay money. Reads stay free.

## Where Attackfee fits

Read this body before you do the work or pay. See [How to read /v1/price](/learn/payments/v1-price-endpoint), [When the converted price is hidden](/learn/payments/when-the-converted-price-is-hidden), and [agent calls](/docs/ask).
