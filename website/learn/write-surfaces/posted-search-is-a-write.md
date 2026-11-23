---
title: Why a posted search query is a write
description: A search box that posts its query can cost you a backend call or an index lookup on every send. Attackfee treats that post as a write, usually in the search class, and leaves ordinary page views free.
hub: write-surfaces
slug: posted-search-is-a-write
type: background
order: 90
related:
  - /learn
  - /learn/write-surfaces/search-boxes-that-post
  - /learn/write-surfaces/how-to-protect-a-search-field
  - /learn/concepts/action-classes
  - /learn/write-surfaces/why-writes-cost-the-site-owner
audience: owners
status: published
schema: WebPage
faq:
  - q: "What if my search is a GET to a static page?"
    a: "Then it is a read. Attackfee is for a search that is posted, or that otherwise runs as a write you have to serve each time."
  - q: "Which class should I use?"
    a: "Search, the 1x class, for a posted query. Map the route and mark the form with data-attackfee=search."
  - q: "Is the hosted demo a search box?"
    a: "No. The hosted demo is a contact form. The local demo includes a posted search."
  - q: "Will this stop a flood of GET searches?"
    a: "No. GET stays free. If the expensive work is on GET, prefer caching, or change that search to a real write method and mark it."
---

# Why a posted search query is a write

A search box that posts its query is a write when each send costs you something to run: a billed backend, a heavy index, or another service that charges per call. It looks like a search box to the visitor. To your server, it is a POST that changes or spends something.

Attackfee treats that post as the search class, which is 1x the unit cost. Mark the form with `data-attackfee="search"` and map the route to search on the server. Ordinary page views, including a docs page that is only read, stay free.

A search that is a GET of a static result list is a read, not a write. Do not gate that GET. If an expensive lookup is still on GET, prefer caching, or change it to a posted search and mark that route.

The hosted demo does not include a search box. The local demo, started with `npm run demo`, does.

## Where Attackfee fits

See [Protecting a search box that posts its query](/learn/write-surfaces/search-boxes-that-post) and [How to protect a search field from bots](/learn/write-surfaces/how-to-protect-a-search-field).
