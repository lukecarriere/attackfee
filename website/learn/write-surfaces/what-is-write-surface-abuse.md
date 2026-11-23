---
title: What is write-surface abuse?
description: Write-surface abuse is automated volume on the routes that change something: comments, signups, logins, posted search, and write APIs. Reading those same pages is not the problem.
hub: write-surfaces
slug: what-is-write-surface-abuse
type: background
order: 60
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/what-is-write-side-security
  - /learn/write-surfaces/why-writes-cost-the-site-owner
  - /learn/write-surfaces/comment-sections
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is a crawler reading my docs write-surface abuse?"
    a: "No. A GET that only reads is not a write. Attackfee leaves that free and does not block crawlers."
  - q: "Does this include a search box?"
    a: "If the search is posted as a form or a write API, and each query costs you something to run, that post is a write."
  - q: "Does Attackfee read the body to judge abuse?"
    a: "No. It checks that the write has a valid pass. Your own moderation still applies after a pass is accepted."
  - q: "Will this stop a funded attacker?"
    a: "No. Volume has to keep paying the cost, but someone willing to spend can keep going."
---

# What is write-surface abuse?

Write-surface abuse is automated volume on the routes that change something. A public comment box, a signup form, a login, a posted search, or a write API can accept posts as fast as a script can send them. Each accepted write can mean storage, moderation time, a billed backend call, or a new account to review.

Reading those same pages is not the same problem. A crawler or an agent that only GETs docs or a comment thread is using the read half of the site. Attackfee leaves that free.

The product does not try to name the abuse by guessing who is calling. It puts a small cost on the write itself, so volume has to keep earning or paying for passes. It does not moderate the body of the post, and it does not claim to stop a funded attacker.

## Where Attackfee fits

Mark the write surfaces you actually have, and leave reads open. See [What is a write surface?](/learn/concepts/what-is-a-write-surface) and [Why writes cost the site owner](/learn/write-surfaces/why-writes-cost-the-site-owner).
