---
title: What are Attackfee action classes?
description: Attackfee has four priced classes: search, write, account, and admin. The owner assigns each protected route a class, which sets the relative cost. A heavier pass covers lighter classes.
hub: concepts
slug: action-classes
type: concept
order: 70
related:
  - /learn
  - /learn/concepts
  - /learn/concepts/how-attackfee-works
  - /learn/concepts/how-to-mark-routes
  - /learn/concepts/how-to-configure-action-classes
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "What are the four classes?"
    a: "Search is 1x, write is 4x, account is 8x, and admin is 16x. Those multipliers apply to the work, and on attackfee.dev they also set the relative payment price."
  - q: "What if I do not map a route?"
    a: "An unmapped GET, HEAD, or OPTIONS request is a free read. An unmapped POST counts as a write."
  - q: "Does a login pass also cover a comment?"
    a: "Yes. A pass minted for a heavier class covers the lighter ones for the rest of its life."
  - q: "Where do I set the class?"
    a: "In the issuer config, as a route prefix, and on a form with the data-attackfee attribute. See How to mark which routes are writes."
  - q: "Do the money prices differ by class?"
    a: "On attackfee.dev, yes. Look at /v1/price rather than hardcoding a number. A self-hosted issuer may be work-only."
---

# What are Attackfee action classes?

Attackfee has four priced classes: search, write, account, and admin. You assign a class when you mark a route. The class sets the relative cost. Search is 1x, write is 4x, account is 8x, and admin is 16x. A pass earned for a heavier class also covers the lighter ones.

## What each class is for

- Search, for a search box that posts its query, or for a query that costs you per call.
- Write, for comments, contact forms, votes, and other ordinary posts. Any unmapped POST counts as a write.
- Account, for signup, login, and password reset.
- Admin, for staff actions that should cost the most work.

A GET, HEAD, or OPTIONS request is a read by default. Leave those unmarked unless you have a rare reason not to. The Node server will refuse a config that gates page views unless you confirm that setting, and you should leave that off. The edge worker and the WordPress plugin never gate a GET.

On attackfee.dev, each class also has its own published price at `/v1/price`. Do not hardcode the dollar figure. The owner still chooses only the class; the relative cost follows from that choice.

## Where Attackfee fits

Map the routes that change something, pick a class that matches the cost to you, and leave the rest open. See [How does Attackfee work?](/learn/concepts/how-attackfee-works) and [How to mark which routes are writes](/learn/concepts/how-to-mark-routes).
