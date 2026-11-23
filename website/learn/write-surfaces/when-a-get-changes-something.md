---
title: What if a GET changes something?
description: Attackfee leaves GET, HEAD, and OPTIONS as free reads. If a GET changes something, do not gate that page view. Change the action to a real write method, then mark and check that route.
hub: write-surfaces
slug: when-a-get-changes-something
type: edge-case
order: 200
related:
  - /learn
  - /learn/concepts/why-reads-should-stay-free
  - /learn/concepts/how-to-mark-routes
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "Can I mark a GET as a write?"
    a: "You should not. The product is built so GET stays free. Gating page views hides you from readers and from answer engines."
  - q: "What does the Node server do if I try?"
    a: "It will refuse a config that gates page views unless a confirm setting is on, and you should leave that off. The edge worker and the WordPress plugin never gate a GET."
  - q: "What should I do instead?"
    a: "Change the action that changes something to POST, PUT, PATCH, or DELETE, then mark that route and check the pass."
  - q: "What about an expensive GET that only reads?"
    a: "Prefer caching. It is still a read, and it should stay free."
---

# What if a GET changes something?

Attackfee leaves GET, HEAD, and OPTIONS as free reads. If a GET on your site changes something, such as confirming an action or incrementing a counter, do not solve that by gating the page view.

The product is built so GET stays free. The Node server will refuse a config that gates page views unless a confirm setting is on, and you should leave that off. The edge worker and the WordPress plugin never gate a GET. Crawlers and answer engines depend on that.

Change the action that mutates state to a real write method, such as POST, then mark that route with a class and check the pass on the server. Leave the GET that only displays the page unmarked.

An expensive GET that only returns data is still a read. Prefer caching, and do not turn it into a page-view gate.

## Where Attackfee fits

See [How to mark which routes are writes](/learn/concepts/how-to-mark-routes) and [How to keep docs and reads open](/learn/limits/how-to-keep-docs-and-reads-open).
