---
title: Why comment forms attract automated volume
description: A public comment form is cheap to call and expensive to run. Automated clients can post at a volume a person would not, which is why a comment route is a write surface.
hub: write-surfaces
slug: why-comment-forms-attract-automated-volume
type: background
order: 210
related:
  - /learn/write-surfaces/what-is-write-surface-abuse
  - /learn/write-surfaces/comment-sections
  - /learn/write-surfaces/how-to-protect-a-comment-form
  - /learn/write-surfaces/a-comment-thread-overnight
  - /learn/write-surfaces/why-writes-cost-the-site-owner
  - /learn/agents/what-is-an-ai-agent-attack
  - /learn/wordpress/wordpress-comments-and-login
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is every comment from a program a problem?"
    a: "No. A program can post a useful comment. The issue is volume that is cheap for the sender and costly for you to store and review."
  - q: "Does Attackfee read the comment text?"
    a: "No. Form contents never leave the page through Attackfee. The check is only that the write has a valid pass."
  - q: "Does a pass mean the comment is fine to publish?"
    a: "No. A pass means the write paid the cost, in work or, for an automated client on a site that takes payment, in money. Moderation is still your job."
  - q: "Do people pay to comment?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# Why comment forms attract automated volume

A public comment form is easy to find and cheap to call. Each accepted post still costs you something real: a row in a database, a notification, and time to review. That gap, cheap for the sender and costly for you, is why comment forms attract automated volume, and why a comment route is a write surface.

Automated clients can submit faster than a person typing in a browser. They can also keep going overnight, when no one is watching the thread. The posts may be junk, repeated links, or ordinary looking text. Attackfee does not classify the text. It puts a small cost on the write so volume is no longer free for the sender.

A visitor's browser earns a work pass in the background, good for 20 actions for 15 minutes. People never pay money. An automated client does the same work, or, on attackfee.dev, can pay per write over HTTP 402. A write without a valid pass is refused. A funded sender who keeps paying that cost can still get through, and you still moderate what is accepted.

## Where Attackfee fits

If you run a public comment form, mark it as a write and check each post on your own server. Reading the thread stays free. See [Protecting a comment section](/learn/write-surfaces/comment-sections) and [How to protect a comment form from bots](/learn/write-surfaces/how-to-protect-a-comment-form). On WordPress, comments are covered by default; see [WordPress comments and login](/learn/wordpress/wordpress-comments-and-login).
