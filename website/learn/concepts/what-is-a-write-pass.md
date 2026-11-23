---
title: What is an Attackfee pass?
description: A pass is a short-lived token that lets a client complete a priced write. A browser earns a work pass with background work. A paid pass, when that path is on, covers one write.
hub: concepts
slug: what-is-a-write-pass
type: concept
order: 40
related:
  - /learn
  - /learn/concepts/how-attackfee-works
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/payments/how-does-a-paid-write-work
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "Is the pass a login?"
    a: "No. It only says that the cost for a write was paid, in work or in money. It does not say who the caller is."
  - q: "Does a pass work on another site?"
    a: "No. A pass is issued for one site and is checked by that site's server."
  - q: "How long does a work pass last?"
    a: "Fifteen minutes, or until its 20 actions are used, whichever comes first."
  - q: "How long does a paid pass last?"
    a: "At most 60 seconds, and it is good for one write."
  - q: "Do people ever see a payment pass?"
    a: "No. People never see the payment path and never pay money. Their browser earns a work pass in the background."
---

# What is an Attackfee pass?

A pass is a short-lived token from your server that authorizes a priced write. The server issues it after background work, or, when payments are on, after a valid payment. A write without a valid pass is refused.

## Two kinds of pass

A work pass is what a browser earns. The page script does background work, your server checks that work, and it issues a pass. One work pass covers 20 actions for 15 minutes. It is sent as a first-party cookie named `attackfee_pass`, as the hidden form field `attackfee-pass`, or as `Authorization: Attackfee <pass>`. The cookie lasts as long as the pass. The script never reads form fields to get one.

A paid pass is what an automated client can receive after paying the offer in an HTTP 402, on a site where that path is on. It covers one write and lasts at most 60 seconds. An agent writing 20 times therefore pays 20 times, or it can earn one work pass instead and reuse it for those 20 actions.

A pass minted for a heavier action class also covers lighter ones. A pass is for one site. It is not a login, and it does not identify the caller.

## What happens without one

A browser, or any client that does not send `Attackfee-Client: agent`, gets a 403 with a fresh challenge. An automated client that sends that header gets a 402 with a price and a link to the same work. In both cases the write does not go through.

If the store that tracks used challenges is down, protected writes get a 503.

## Where Attackfee fits

You do not ask visitors to manage a pass. The page script gets one in the background and attaches it to the post. Automated clients get a pass from `/v1/redeem` after work or payment, then send it on the write. See [How to check writes on your own server](/learn/concepts/how-to-check-writes-on-your-server) and [How does a paid write work?](/learn/payments/how-does-a-paid-write-work).
