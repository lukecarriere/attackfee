---
title: Proof of work compared with interactive challenges
description: Attackfee earns a work pass in the background while someone types. There is nothing to solve or click. Interactive challenges interrupt the post and ask the visitor to complete a step in the page.
hub: comparisons
slug: proof-of-work-compared-with-interactive-challenges
type: comparison
order: 20
related:
  - /learn
  - /learn/comparisons
  - /learn/concepts/how-attackfee-works
  - /learn/concepts/attackfee-js-widget
  - /learn/limits/no-bot-score
audience: both
status: published
schema: WebPage
faq:
  - q: "Do people complete a step in the page?"
    a: "Not in the usual path. The work runs in the background. A Verify before sending button appears only if you turn it on, or if the work would run past 8 seconds."
  - q: "Do people pay money?"
    a: "No. People never pay money, and there is no CAPTCHA to solve."
  - q: "Can an agent complete the work without a person?"
    a: "Yes. An automated client can do the same work, or pay when that path is on."
  - q: "Is this a score of who is calling?"
    a: "No. A pass only says the cost was paid."
  - q: "What if JavaScript is off?"
    a: "The browser path needs JavaScript. The noscript line is: This form needs JavaScript. An agent can still use the header and the work or payment path."
---

# Proof of work compared with interactive challenges

Attackfee earns a work pass in the background while someone reads or types. There is nothing to solve or click in the usual path. An interactive challenge interrupts the post and asks the visitor to complete a step in the page before the write is accepted.

Those two approaches are not the same job. An interactive challenge is a gate in the page, often aimed at telling a person from a program. Attackfee does not try to do that. It prices the write. A person and an automated client can both get a pass, one by waiting on the work, the other by doing the same work or by paying when that path is on.

People never pay money, and there is no CAPTCHA to solve.

A "Verify before sending" button is off by default. If the work would run past 8 seconds, the page can show that button instead of waiting. That is still a confirmation of work, not a third-party identity check.

## Where Attackfee fits

If you want a quiet cost on the write and a free read, use Attackfee. If you want a visible step in the page that a person has to complete, that is a different product. See [How does Attackfee work?](/learn/concepts/how-attackfee-works) and [Why Attackfee does not score who you are](/learn/limits/no-bot-score).
