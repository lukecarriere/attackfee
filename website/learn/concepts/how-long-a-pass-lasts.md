---
title: How long does an Attackfee pass last?
description: A work pass covers 20 actions for 15 minutes. A paid pass, when that path is on, covers one write and lasts at most 60 seconds. When either limit is hit, the client must earn or pay for a new pass.
hub: concepts
slug: how-long-a-pass-lasts
type: concept
order: 80
related:
  - /learn
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/what-happens-without-a-pass
  - /learn/payments/how-does-a-paid-write-work
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "Which limit hits first on a work pass?"
    a: "Whichever comes first: 20 actions, or 15 minutes from issue."
  - q: "Does using a pass on a comment use up a slot for login?"
    a: "Yes, if it is the same work pass. One work pass covers 20 actions of any class it is allowed to cover."
  - q: "Can I make a paid pass last longer?"
    a: "No, not on the current design. A paid pass is one write and at most 60 seconds."
  - q: "Does the cookie last longer than the pass?"
    a: "No. The attackfee_pass cookie lasts as long as the pass."
  - q: "What happens when it expires mid-form?"
    a: "The next post is refused until a new pass is earned. In a browser, the page script can earn another work pass in the background."
---

# How long does an Attackfee pass last?

A work pass covers 20 actions for 15 minutes, whichever comes first. A paid pass, when that path is on, covers one write and lasts at most 60 seconds. When a pass is used up or expires, the next write needs a new one.

These numbers are the product defaults. They also appear on the Attackfee homepage. The cookie named `attackfee_pass` lasts as long as the work pass. A paid pass is not meant to be reused.

A pass is for one site and does not identify the caller. A heavier class still covers lighter ones until the pass ends.

## Where Attackfee fits

People usually earn one work pass per visit, in the background, and stay inside the 20 actions and 15 minutes. Automated volume has to keep earning or paying. See [What is an Attackfee pass?](/learn/concepts/what-is-a-write-pass) and [What happens if a write has no pass?](/learn/concepts/what-happens-without-a-pass).
