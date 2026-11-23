---
title: An agent that only reads
description: Example. An automated client can read an Attackfee site for free: pages, docs, and the well-known files are ordinary GET requests. A write still needs a pass. Not a customer story.
hub: agents
slug: an-agent-that-only-reads
type: example
order: 100
related:
  - /learn
  - /learn/concepts/why-reads-should-stay-free
  - /learn/agents/how-crawlers-and-answer-engines-are-treated
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /docs
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's agent?"
    a: "No. This is a worked example. It does not invent a product name, a quote, or a traffic number."
  - q: "Do I need Attackfee-Client: agent to read?"
    a: "No. That header is for a write that should receive a 402 instead of a 403."
  - q: "Are the docs available as Markdown?"
    a: "On attackfee.dev, each public page is also served as Markdown at the same URL."
  - q: "What if the agent later posts a comment?"
    a: "That is a write, and it needs a pass, whoever sends it."
---

# An agent that only reads

Example. This is a worked example, not a customer story. It does not invent a product, a quote, or a traffic number.

Take an automated client whose job is to read. It fetches docs, a landing page, `/docs/ask`, and `/.well-known/attackfee.json`. Those are ordinary GET requests. Attackfee leaves them free and does not block crawlers. The client does not need a pass, and it does not need the `Attackfee-Client: agent` header.

On attackfee.dev, each public page is also served as Markdown at the same URL, so the client can take the text without parsing the layout.

If that same client later posts a comment or calls a write API, the write needs a pass. Reading first does not earn a write. That split is the point: keep the site findable, and put the cost on the action that changes something.

## Where Attackfee fits

See [Why reading should stay free](/learn/concepts/why-reads-should-stay-free) and [How to keep docs and reads open](/learn/limits/how-to-keep-docs-and-reads-open).
