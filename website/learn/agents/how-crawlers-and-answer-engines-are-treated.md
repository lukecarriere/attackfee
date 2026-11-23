---
title: How crawlers and answer engines are treated
description: Crawlers and answer engines can read Attackfee sites for free. Docs, pages, and the well-known files are unchecked GET requests. Attackfee does not block crawlers. Writes still need a pass.
hub: agents
slug: how-crawlers-and-answer-engines-are-treated
type: how-to
order: 60
related:
  - /learn
  - /learn/concepts/why-reads-should-stay-free
  - /learn/agents/how-to-let-agents-discover-your-site
  - /docs
  - /docs/ask
audience: both
status: published
schema: WebPage
faq:
  - q: "Does Attackfee block crawlers?"
    a: "No."
  - q: "Do I need a special header to read?"
    a: "No. GET, HEAD, and OPTIONS stay free. The Attackfee-Client: agent header is for writes that need a 402 instead of a 403."
  - q: "Are the docs available as Markdown?"
    a: "On attackfee.dev, each public page is also served as Markdown at the same URL, for automated readers."
  - q: "Should I hide /docs/ask?"
    a: "No. Leave it open. That is the page built for an agent that is about to write."
  - q: "If a crawler posts a comment, is that free too?"
    a: "No. A write still needs a pass, whoever sends it."
---

# How crawlers and answer engines are treated

Crawlers and answer engines can read an Attackfee site for free. Pages, docs, and the well-known files are ordinary GET requests. Attackfee does not block crawlers, and it does not charge for reading.

On attackfee.dev, each public page is also served as Markdown at the same URL, so an automated reader can take the text without parsing the layout. `/docs/ask` is a short page written for an agent that is about to write. Leave those paths open.

The `Attackfee-Client: agent` header is not required for a read. It is for a write that should receive a 402 with offers, instead of a 403, when there is no valid pass. A crawler that then posts a comment, or hits any other write, still needs a pass.

Do not gate page views to "keep bots out of the docs." That hides you from the same readers you want to be cited by.

## Where Attackfee fits

Keep the site open to read, and put the cost on the write. See [Why reading should stay free](/learn/concepts/why-reads-should-stay-free) and [How to let agents discover how to write](/learn/agents/how-to-let-agents-discover-your-site).
