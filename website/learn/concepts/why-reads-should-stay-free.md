---
title: Why reading should stay free
description: Page views, docs, and other GET requests should stay free so people, crawlers, and agents can find you. Attackfee prices the write half and leaves the read half alone.
hub: concepts
slug: why-reads-should-stay-free
type: background
order: 160
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/open-to-read-priced-to-write
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /learn/agents/how-to-let-agents-discover-your-site
  - /docs
  - /learn/limits/what-attackfee-is-not-for
audience: both
status: published
schema: WebPage
faq:
  - q: "Does Attackfee block crawlers?"
    a: "No. It does not block crawlers and does not charge for reading."
  - q: "Are the well-known files free?"
    a: "Yes. /.well-known/attackfee.json and /.well-known/agents.json are unchecked GET requests."
  - q: "What about an expensive GET?"
    a: "Prefer caching, or change it to a POST and mark that route. Gating page views hides you from new readers and from answer engines."
  - q: "Does the WordPress plugin ever gate a GET?"
    a: "No. The edge worker does not either."
  - q: "Are these learning pages priced?"
    a: "No. This library and the docs stay free to read."
---

# Why reading should stay free

A public site is meant to be found. Pages, docs, and GET APIs can be cached and crawled. Agents reading that half is how people reach you. Attackfee leaves that half free and puts a cost only on the routes that change something.

The product is built that way. Every GET, HEAD, or OPTIONS request is a read unless you deliberately mark the route otherwise. The Node server refuses a config that gates page views unless a confirm setting is on, and you should leave that off. The edge worker and the WordPress plugin never gate a GET. Crawlers are not blocked. The well-known files are free and unchecked.

Gating a page view would hide the site from new readers and from answer engines. If a GET is costly to compute, prefer caching, or change it to a real write method and mark that route.

## Where Attackfee fits

Keep docs, marketing pages, and APIs that only return data in the open. Mark comments, signups, logins, posted search, and write APIs. See [What is a write surface?](/learn/concepts/what-is-a-write-surface) and [How to let agents discover how to write](/learn/agents/how-to-let-agents-discover-your-site).
