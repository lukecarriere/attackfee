---
title: A docs site open to crawlers
description: Example. A documentation site can leave GET, docs, and Markdown twins free for crawlers and agents, while a contact form or write API still needs a pass. Not a customer story.
hub: agents
slug: a-docs-site-open-to-crawlers
type: example
order: 140
related:
  - /learn/agents/an-agent-that-only-reads
  - /learn/agents/how-crawlers-and-answer-engines-are-treated
  - /learn/concepts/why-reads-should-stay-free
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /learn/concepts/open-to-read-priced-to-write
  - /learn/write-surfaces/contact-forms
  - /learn/agents/well-known-attackfee-json
audience: both
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's docs site?"
    a: "No. This is a worked example. It does not invent a product name, a quote, or a crawl count."
  - q: "Do crawlers need a pass to read docs?"
    a: "No. GET, HEAD, and OPTIONS stay free. Attackfee does not block crawlers."
  - q: "Can an agent also read the Markdown?"
    a: "Yes, when the site serves a Markdown twin at the same path with .md added. That GET stays free too."
  - q: "What if the docs site has a contact form?"
    a: "Mark the contact POST as a write and check it. Reading the docs stays free."
---

# A docs site open to crawlers

Example. This is a worked example, not a customer story. It does not invent a product, a quote, or a crawl count.

Take a public documentation site. Agents and crawlers need to read the guides, the sitemap, and, when the site serves them, Markdown twins at the same paths with `.md` added. Those are GET requests. On an Attackfee site they stay free. The well-known file stays free too. Attackfee does not block crawlers, and you should not turn on page-view gating.

The same site may still have a contact form, a posted search box, or a write API. Those routes are writes. The browser earns a work pass in the background. An automated client presents a pass, or gets 402 when it sends the agent header without one. People never pay money. Reading the docs never needs a pass.

This is the same split as the rest of Attackfee: open to read, priced to write.

## Where Attackfee fits

Leave docs, Markdown twins, and discovery open. Mark only the writes. See [How crawlers and answer engines are treated](/learn/agents/how-crawlers-and-answer-engines-are-treated), [How to keep docs and reads open](/learn/limits/how-to-keep-docs-and-reads-open), and [An agent that only reads](/learn/agents/an-agent-that-only-reads).
