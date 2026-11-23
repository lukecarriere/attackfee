---
title: What Attackfee error codes mean
description: Attackfee JSON errors are a specific next step, not a generic failure. attackfee_required, rate_limited, bad_action, and the siteverify error-codes list are the ones clients see most often.
hub: concepts
slug: what-attackfee-error-codes-mean
type: how-to
order: 430
related:
  - /learn/concepts/what-attackfee-http-statuses-mean
  - /learn/concepts/how-to-check-a-pass-with-siteverify
  - /learn/limits/what-a-429-on-a-challenge-means
  - /learn/payments/how-to-request-a-work-challenge
  - /learn/payments/v1-redeem-endpoint
  - /docs/ask
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "Is the error in the HTTP status or in the body?"
    a: "Both matter. The status is the first signal. The JSON error field, or error-codes on siteverify, names the case."
  - q: "What does siteverify return when the pass is no longer good?"
    a: "HTTP 200 with success false and error-codes including timeout-or-duplicate or invalid-input-response. Get a new pass."
  - q: "What is bad_action?"
    a: "read is not a priced action. Use write, search, account, or admin."
  - q: "What is malformed on redeem?"
    a: "The body needs challenge_id and a solution object. Include the challenge you were given. If the issuer no longer has that challenge, you get 401 and unknown_challenge."
---

# What Attackfee error codes mean

Attackfee JSON errors tell you what to do next. Read the HTTP status first, then the `error` field on `/v1` responses, or the `error-codes` list on `/v1/siteverify`. The official agent-calls table names the cases below.

A browser-style write with no pass returns `403` and `attackfee_required`, plus a fresh challenge when one can be minted. A client that sent `Attackfee-Client: agent` gets `402` and `payment_required` only when there is a payment offer. That body includes `challenge_url` for the work fallback, and the offers. If there is no offer, the agent path also returns `403` and `attackfee_required`. `GET /v1/challenge` can return `429` with `rate_limited`. Wait for `retry-after`, which is 60 seconds.

`400` with `bad_action` means you asked for `read`, which is not a priced action. Use `write`, `search`, `account`, or `admin`. `400` with `malformed` on `/v1/redeem` means the body is missing `challenge_id` or a solution object, or the challenge could not be used as sent. If the issuer no longer has that challenge, redeem returns `401` and `unknown_challenge`. A challenge or redeem can also fail with `unsupported` or `wrong_action`, which the Node issuer also maps to `400`. If the pass store is down, protected writes return `503` and the error is `unavailable`. Fail closed. A wrong HTTP method on a `/v1` route can return `405` and `method_not_allowed`. An unknown `/v1` path returns `404` and `not_found`.

`POST /v1/siteverify` is different. It returns HTTP 200 even when the check fails, with `success` set to false and an `error-codes` list. `invalid-input-secret` means the site secret did not match. `timeout-or-duplicate` means the pass expired, was used up, or was sent again. `invalid-input-response` means the pass or solution could not be checked. When the check succeeds, `success` is true and the body includes the action, the issuer hostname, and `challenge_ts`.

People never pay money. Reads stay free.

## Where Attackfee fits

Use this list with [What Attackfee HTTP statuses mean](/learn/concepts/what-attackfee-http-statuses-mean) and [agent calls](/docs/ask). For the site-owner check, see [How to check a pass with /v1/siteverify](/learn/concepts/how-to-check-a-pass-with-siteverify).
