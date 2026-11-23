---
title: Why Attackfee treats people and programs the same
description: Attackfee prices the action, not the caller. People and programs use the same form and the same pass check. The difference is only how the pass is earned: background work for people, work or a paid path for automated clients.
hub: concepts
slug: why-attackfee-treats-people-and-programs-the-same
type: philosophy
order: 320
related:
  - /learn/concepts/price-the-action-not-the-caller
  - /learn/limits/no-bot-score
  - /learn/write-surfaces/people-and-bots-on-the-same-form
  - /learn/concepts/open-to-read-priced-to-write
  - /learn/limits/what-attackfee-is-not-for
  - /learn/comparisons/ip-blocking-vs-pricing-writes
  - /learn/agents/how-agents-write-to-an-attackfee-site
audience: both
status: published
schema: WebPage
faq:
  - q: "Does Attackfee decide whether the caller is a person?"
    a: "No. There is no score and no verdict about identity. The check is only that the write has a valid pass."
  - q: "Why can an automated client pay if people cannot?"
    a: "People never pay money. Their browser earns a work pass. An automated client can do that work too, or, on a site that takes payment, can pay per write over HTTP 402."
  - q: "What about two people on the same network address?"
    a: "Attackfee does not block by network address. A person is not refused because someone else on the same address is also posting."
  - q: "Is a page view treated the same as a write?"
    a: "No. Reads stay free. The same rule applies to people, programs, and crawlers."
---

# Why Attackfee treats people and programs the same

Attackfee prices the action, not the caller. A comment POST is a write whether a person or a program sends it. The form, the class, and the pass check are the same. Attackfee does not score who you are, and it does not block by network address. That is a deliberate choice: a shared network should not decide who can post, and a guess about identity is not the product.

The only difference is how the pass is earned. A person's browser does background work while they read or type, and there is nothing to solve. An automated client does the same work, or, on attackfee.dev, can pay per write over HTTP 402. People never pay money. Reads stay free for both.

A funded program can still get through by paying the cost. Attackfee does not claim to tell you that the caller is a program, and it does not replace moderation.

## Where Attackfee fits

If you want to allow people and programs on the same form without identifying either, price the write and leave reads open. See [Price the action, not the caller](/learn/concepts/price-the-action-not-the-caller), [Why Attackfee does not score who you are](/learn/limits/no-bot-score), and [How people and bots hit the same form](/learn/write-surfaces/people-and-bots-on-the-same-form).
