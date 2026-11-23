---
title: Why page-view gating should stay off
description: Attackfee is for writes. Page views stay free. The Node server will refuse a config that gates page views unless a confirm setting is on, and you should leave that off. The WordPress plugin and the edge worker never gate a GET.
hub: limits
slug: why-page-view-gating-should-stay-off
type: philosophy
order: 110
related:
  - /learn/concepts/why-reads-should-stay-free
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /learn/write-surfaces/when-a-get-changes-something
  - /learn/agents/how-crawlers-and-answer-engines-are-treated
  - /learn/limits/what-attackfee-is-not-for
  - /learn/concepts/how-to-mark-routes
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "Can I turn on page-view gating on Node?"
    a: "The Node server will refuse a config that gates page views unless a confirm setting is on. You should leave that off."
  - q: "Can the WordPress plugin gate a GET?"
    a: "No. The WordPress plugin and the edge worker never gate a GET."
  - q: "What if a GET changes something?"
    a: "Change that action to a write method and mark the write. Do not turn the GET into a page-view gate."
  - q: "What if a GET is expensive to compute?"
    a: "Prefer caching. An expensive GET that only returns data is still a read."
---

# Why page-view gating should stay off

Attackfee prices writes and leaves reads free. A page view is a GET. If you gate it, you hide the site from new readers, including crawlers and agents that only need the docs. That is not what Attackfee is for. Page-view gating should stay off.

On Node, the server will refuse a config that gates page views unless a confirm setting is on, and you should leave that off. The WordPress plugin and the edge worker never gate a GET. Discovery files, docs, and Markdown twins stay free. Attackfee does not block crawlers.

If a GET changes something, change that action to a write method and mark the write. If a GET is costly to compute, prefer caching. Do not turn a docs site into a page-view gate to keep agents out. People never pay money. Reading never needs a pass.

## Where Attackfee fits

Mark the POST, leave the GET open. See [Why reading should stay free](/learn/concepts/why-reads-should-stay-free), [How to keep docs and reads open](/learn/limits/how-to-keep-docs-and-reads-open), and [What if a GET changes something?](/learn/write-surfaces/when-a-get-changes-something).
