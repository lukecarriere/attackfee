---
title: How to leave a search route free
description: A Node route can set cost: 0 to stay free, even if its class is search. Any other cost value is refused. Page views should already be free as a read route.
hub: concepts
slug: how-to-leave-a-search-route-free
type: how-to
order: 480
related:
  - /learn/concepts/how-to-mark-routes
  - /learn/concepts/action-classes
  - /learn/concepts/what-attackfee-yaml-configures
  - /learn/write-surfaces/posted-search-is-a-write
  - /learn/write-surfaces/how-to-protect-a-search-field
  - /learn/limits/why-page-view-gating-should-stay-off
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "What values can cost take?"
    a: "Only 0, which leaves that route free. Leave the key out to use the class default. Any other number is refused."
  - q: "Should I do this for page views?"
    a: "No. Keep / as class read so GET stays free. Do not turn on confirm_page_view_gating."
  - q: "When would I use this?"
    a: "When a posted search should stay free, even though the search class would otherwise price it."
  - q: "Does this change the form attribute?"
    a: "If the route is free, you should not require a pass on that post. Only mark and check the routes you mean to price."
---

# How to leave a search route free

A Node route can stay free even if you mapped it under the `search` class. Set `cost: 0` on that route in `attackfee.yaml`. The example file notes this option on a `/search` rule. Any other `cost` value is refused. If you leave `cost` out, the route uses the class default.

Use this when a posted search should not require a pass. Search is a priced class by default, because a query can cost you per call. If that is not true for a given route, `cost: 0` leaves it free. Do not use this as a way to gate page views. Keep `/` as `class: read`, and leave `confirm_page_view_gating` off.

If the route is free, do not require a pass on the form that posts to it. Mark and check only the routes you mean to price. People never pay money. Reads stay free.

## Where Attackfee fits

This is a route-level exception, not a new class. See [How to mark which routes are writes](/learn/concepts/how-to-mark-routes), [What are Attackfee action classes?](/learn/concepts/action-classes), and [Why a posted search query is a write](/learn/write-surfaces/posted-search-is-a-write).
