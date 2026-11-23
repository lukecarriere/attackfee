---
title: How to protect a search field from bots
description: If a search box posts its query, or each query bills you, mark that route as search. Page views stay free. Posted search carries a cost.
hub: write-surfaces
slug: how-to-protect-a-search-field
type: how-to
order: 20
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/write-surfaces/search-boxes-that-post
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/comparisons/rate-limiting-vs-pricing-writes
  - /docs/widget
audience: owners
status: published
schema: WebPage
faq:
  - q: "Should every site search box be priced?"
    a: "No. If search is a cheap GET against your own index, you may leave it a read. Price it when the request is posted or when each query bills you."
  - q: "Why is search cheaper than a comment post?"
    a: "Search is the lightest class (1x). A comment is a write (4x). You can still give a route a heavier class if it costs you more."
  - q: "Does the WordPress plugin cover site search?"
    a: "Not as a built-in option. Comments and login are on by default. A theme search form can use data-attackfee=search or data-attackfee=write, and your theme must check the pass with attackfee_wp_verify_request before running the query."
  - q: "Is search protected on the hosted demo?"
    a: "No. The hosted demo protects /demo/contact as a write only. Use the local demo to try posted search."
  - q: "Will pricing search block crawlers from my pages?"
    a: "No. Crawlers reading pages are GET requests. Attackfee does not block crawlers and does not charge for reading."
---

# How to protect a search field from bots

If your search box sends its query as a form post, or if each query calls a backend you pay for, mark that route as search. The search class is the lightest priced class. Page views stay free. A flood of posted queries has to earn passes.

## When a search box is a write

A search field is not always a write surface. A GET that only reads a local index may be fine as a read. Treat it as search when:

- The box posts the query (a form POST), or
- Each query calls a paid search backend, or otherwise costs you per request.

Attackfee's search class exists for that case. It is 1x work, and a pass earned for a heavier class still covers it.

The hosted demo at attackfee.dev does not include a search box. It has one contact form, protected as a write. A search box that posts its query is in the local demo, started with `npm run demo`.

## How to mark it

On the page, use `data-attackfee="search"` on the form that posts the query:

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/search" data-attackfee="search">
  <button type="submit">Search</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

On the server, map that route to the search class and check the pass before you run the query. In a Node config, that is a route prefix with `class: search` and middleware with `action: "search"`. Leave ordinary page GETs unmarked.

This is not a substitute for rate limits on a paid API key, and it does not stop network floods. It prices the posted query.

## Where Attackfee fits

Mark posted search when it costs you. Leave documentation, navigation, and other reads open. See [What is a write surface?](/learn/concepts/what-is-a-write-surface) and [Rate limiting compared with pricing writes](/learn/comparisons/rate-limiting-vs-pricing-writes).
