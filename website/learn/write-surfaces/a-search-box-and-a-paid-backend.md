---
title: A search box that calls a paid backend
description: Example. A generic docs-site search box that posts each query to a billed backend. No invented customer, quote, or dollar amount. The posted query is a write; the docs stay free to read.
hub: write-surfaces
slug: a-search-box-and-a-paid-backend
type: example
order: 170
related:
  - /learn
  - /learn/write-surfaces/search-boxes-that-post
  - /learn/write-surfaces/posted-search-is-a-write
  - /learn/write-surfaces/why-writes-cost-the-site-owner
  - /learn/write-surfaces/how-to-protect-a-search-field
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's bill?"
    a: "No. This is a worked example. It does not invent a company, a quote, or a dollar amount."
  - q: "Why is the search a write if the docs are free?"
    a: "Each posted query can cost you a backend call. The doc pages themselves are GET requests and should stay free."
  - q: "Which class should that search use?"
    a: "Search, the 1x class."
  - q: "Where can I see a posted search running?"
    a: "Not on the hosted demo. The local demo, started with npm run demo, includes a posted search."
---

# A search box that calls a paid backend

Example. This is a worked example, not a customer story. It does not invent a company, a quote, or a dollar amount.

Take a docs site that is meant to be read for free. Alongside the pages is a search box. Each time someone submits a query, your server calls a billed search backend or a heavy index. The docs are cheap to serve. The posted query is not.

If that box is a free POST, an automated client can spend your backend budget as fast as it can send queries, without ever reading a page. If you react by gating the docs, you also hide the site from the readers and answer engines you wanted to reach.

Attackfee leaves the docs as free GET requests and treats the posted query as a search-class write. The form uses `data-attackfee="search"`. The server checks the pass before it runs the backend call. A person typing a query earns a work pass in the background. Volume has to keep earning, or pay when that path is on.

This page does not claim a specific savings figure. The current write price, when you need a number for a paid path, is at `/v1/price`, not in this example.

## Where Attackfee fits

See [Protecting a search box that posts its query](/learn/write-surfaces/search-boxes-that-post) and [Why a posted search query is a write](/learn/write-surfaces/posted-search-is-a-write).
