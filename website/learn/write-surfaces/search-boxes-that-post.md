---
title: Protecting a search box that posts its query
description: On a docs site or anywhere a search box posts its query to a backend, treat that post as a search-class write. Leave the docs pages themselves free to read.
hub: write-surfaces
slug: search-boxes-that-post
type: use-case
order: 120
related:
  - /learn
  - /learn/write-surfaces/posted-search-is-a-write
  - /learn/write-surfaces/how-to-protect-a-search-field
  - /learn/write-surfaces/a-search-box-and-a-paid-backend
  - /docs
audience: owners
status: published
schema: WebPage
faq:
  - q: "Should I gate the docs pages too?"
    a: "No. Keep the docs as free GET requests. Only the posted query is a write."
  - q: "Which attribute do I put on the form?"
    a: "data-attackfee=search, and map that route to the search class on the server."
  - q: "What if search is a live GET to an API?"
    a: "GET stays free. If that GET is costly, prefer caching, or change it to a posted search and mark that route."
  - q: "Does the hosted demo include this?"
    a: "No. Use the local demo, which includes a posted search, or follow the search-field how-to."
---

# Protecting a search box that posts its query

A docs site often has a search box that posts its query to an index or a billed backend. The docs pages should stay free to read, including for crawlers and answer engines. The posted query is the write.

Mark the form with `data-attackfee="search"` and map that route to the search class, which is 1x the unit cost. Check the pass on the server before you run the query. Leave every doc page as an unmarked GET.

This is the same setup on a marketing site or a dashboard, whenever search is a post that costs you to run. It is not for a client-side filter of a page that is already loaded.

Exact steps are in [How to protect a search field from bots](/learn/write-surfaces/how-to-protect-a-search-field). An illustration of a billed backend is in [A search box that calls a paid backend](/learn/write-surfaces/a-search-box-and-a-paid-backend).

## Where Attackfee fits

Keep `/docs` and the rest of the read half open. Price only the posted search. See [Why a posted search query is a write](/learn/write-surfaces/posted-search-is-a-write) and [Why reading should stay free](/learn/concepts/why-reads-should-stay-free).
