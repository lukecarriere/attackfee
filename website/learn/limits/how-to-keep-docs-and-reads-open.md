---
title: How to keep docs and reads open
description: Leave pages, docs, well-known files, and other GET requests unmarked so people, crawlers, and agents can find you. Put the cost on the write. Do not gate page views.
hub: limits
slug: how-to-keep-docs-and-reads-open
type: how-to
order: 80
related:
  - /learn
  - /learn/concepts/why-reads-should-stay-free
  - /learn/agents/how-crawlers-and-answer-engines-are-treated
  - /learn/agents/an-agent-that-only-reads
  - /docs
  - /docs/ask
audience: owners
status: published
schema: WebPage
faq:
  - q: "Should I hide /docs/ask?"
    a: "No. Leave it open. That is the page built for an agent that is about to write."
  - q: "Are the well-known files free?"
    a: "Yes. /.well-known/attackfee.json and /.well-known/agents.json are unchecked GET requests."
  - q: "What if a GET is expensive to compute?"
    a: "Prefer caching, or change a mutation to a real write method and mark that route. Do not gate page views."
  - q: "Does Attackfee block crawlers?"
    a: "No."
  - q: "Are these learning pages priced?"
    a: "No. This library and the docs stay free to read."
---

# How to keep docs and reads open

Leave pages, docs, well-known files, and other GET, HEAD, or OPTIONS requests unmarked. That is how people, crawlers, and answer engines find you. Attackfee puts the cost on the write, not on the read.

On a Node issuer, start the route list with a `/` prefix in the read class, and leave the confirm setting that allows gating page views off. The edge worker and the WordPress plugin never gate a GET.

Keep `/docs`, `/docs/ask`, `/.well-known/attackfee.json`, and `/.well-known/agents.json` reachable without a pass. On attackfee.dev, each public page is also served as Markdown at the same URL. Do not hide those twins behind a check.

If a GET is costly to compute, prefer caching. If a GET changes something, change that action to a write method and mark the write. Do not turn a docs site into a page-view gate to keep agents out. Agents that only read are using the site as designed.

## Where Attackfee fits

See [Why reading should stay free](/learn/concepts/why-reads-should-stay-free) and [How crawlers and answer engines are treated](/learn/agents/how-crawlers-and-answer-engines-are-treated).
