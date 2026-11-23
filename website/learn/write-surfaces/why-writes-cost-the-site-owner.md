---
title: Why writes cost the site owner
description: A comment, a signup, a posted search, or a write API call can mean storage, review time, or a billed backend. A page view is usually cheap to serve. That is why Attackfee prices the write and leaves the read free.
hub: write-surfaces
slug: why-writes-cost-the-site-owner
type: background
order: 70
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/why-reads-should-stay-free
  - /learn/write-surfaces/what-is-write-surface-abuse
  - /learn/concepts/volume-should-cost-volume
audience: owners
status: published
schema: WebPage
faq:
  - q: "Why not charge for reading too?"
    a: "A public site is meant to be found. Gating page views hides you from new readers and from answer engines. Reads can also be cached. Writes usually cannot."
  - q: "Does a work pass pay me money?"
    a: "No. A work pass is background work the client does. A payment, when that path is on, is the cost of the write, not a payout product on a typical install."
  - q: "Is posted search really a cost?"
    a: "It can be, if each query hits a billed backend or a heavy search index. A search that is only a GET of a static page is a read."
  - q: "Do people pay money for a comment?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# Why writes cost the site owner

A write is usually more expensive for you than a read. A comment is storage and review time. A signup is a new account to vet. A login attempt can lock or flood an account path. A posted search, or a write API call, can hit a billed backend. A page view, by contrast, is often a cached GET.

That cost asymmetry is why Attackfee prices the write and leaves the read free. The cost to the sender is a short background check for a person, or the same work, or a payment when that path is on, for an automated client. Volume has to keep paying volume. People never pay money.

The product does not try to recoup your exact backend bill, and it does not describe a payout to the site owner on a typical install. It makes unattended volume more expensive than a single genuine post.

## Where Attackfee fits

Mark the routes that cost you something when they run, and keep docs and other GET requests open. See [Why reading should stay free](/learn/concepts/why-reads-should-stay-free) and [Volume should cost volume](/learn/concepts/volume-should-cost-volume).
