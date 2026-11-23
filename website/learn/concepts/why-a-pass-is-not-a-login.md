---
title: Why a pass is not a login
description: An Attackfee pass only proves that work, or a payment, was accepted for a write. It does not identify the caller, and it does not sign anyone in.
hub: concepts
slug: why-a-pass-is-not-a-login
type: philosophy
order: 300
related:
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/passes-are-per-site
  - /learn/concepts/price-the-action-not-the-caller
  - /learn/limits/no-bot-score
  - /learn/write-surfaces/login-and-password-reset
  - /learn/payments/paid-pass-reuse-and-expiry
audience: both
status: published
schema: WebPage
faq:
  - q: "Does the pass cookie log the visitor in?"
    a: "No. The cookie holds a pass for writes. It is not an account session. Your login route still creates its own signed-in state."
  - q: "Can a pass be used on another site?"
    a: "No. Passes are issued per site. A pass from one issuer is not valid on another."
  - q: "Does Attackfee know who used the pass?"
    a: "No. Attackfee does not identify the caller. It checks that the pass is valid for the action."
  - q: "How long does a pass last?"
    a: "A work pass lasts 15 minutes and covers 20 actions. A paid pass is one write and at most 60 seconds."
---

# Why a pass is not a login

An Attackfee pass only proves that the write already paid its cost, in background work or, for an automated client on a site that takes payment, in money. It does not say who the caller is, and it does not sign anyone in. Treat it as a short-lived ticket for a class of writes, not as an account session.

The browser stores a work pass as the `attackfee_pass` cookie and as a hidden `attackfee-pass` field. An automated client can send `Authorization: Attackfee <pass>`. None of those mechanisms creates a logged-in user. Your login form still has its own session, and a pass on a login POST does not mean the password was right.

Passes are per site. A work pass lasts 15 minutes and covers 20 actions. A paid pass is one write and at most 60 seconds. Attackfee does not score the caller and does not block by network address.

## Where Attackfee fits

Use a pass to protect writes. Use your own login, cookies, and permissions to represent a person. See [What is an Attackfee pass?](/learn/concepts/what-is-a-write-pass), [Why Attackfee does not score who you are](/learn/limits/no-bot-score), and [Do passes work across sites?](/learn/concepts/passes-are-per-site).
