---
title: Price the action, not the caller
description: Attackfee puts a cost on the write itself and does not score who is calling. Pricing the action beats guessing who is a bot, including on shared networks.
hub: concepts
slug: price-the-action-not-the-caller
type: philosophy
order: 190
related:
  - /learn
  - /learn/limits/no-bot-score
  - /learn/write-surfaces/people-and-bots-on-the-same-form
  - /learn/concepts/volume-should-cost-volume
  - /learn/comparisons/ip-blocking-vs-pricing-writes
audience: both
status: published
schema: WebPage
faq:
  - q: "Why not score the caller instead?"
    a: "A score is a claim about identity. Shared networks, new addresses, and clients that look like browsers all make that guess unreliable. Attackfee does not make it."
  - q: "Does a person have to pay more than a program?"
    a: "No. People never pay money. A person earns a work pass in the background. A program can do the same work, or pay when that path is on."
  - q: "Is this the same as a bot score?"
    a: "No. There is no score. A pass only says the cost for the write was paid."
  - q: "What about my own scripts?"
    a: "They use the same path. There is no allow list that skips the cost because you wrote the client."
---

# Price the action, not the caller

Attackfee puts a cost on the write itself and does not ask who is calling. A pass means the cost was paid, in work or in money. It is not a verdict about whether the caller is a person or a program.

Guessing who is a bot has a poor fit on a public form. People and programs can post the same fields. Many people can share one network address. One script can use many addresses. A score, or a block list, has to guess through that. Pricing the action does not.

This is also how privacy is handled: the page script never reads form fields, checks run on the site owner's server, and Attackfee does not identify the caller. The tradeoff is stated in the limits: a funded attacker can still pay the cost and get through.

## Where Attackfee fits

Use Attackfee when you want volume to cost volume, without claiming to know the caller. See [Why Attackfee does not score who you are](/learn/limits/no-bot-score) and [How people and bots hit the same form](/learn/write-surfaces/people-and-bots-on-the-same-form).
