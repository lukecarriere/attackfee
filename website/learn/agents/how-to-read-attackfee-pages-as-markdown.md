---
title: How to read Attackfee pages as Markdown
description: Public Attackfee pages also serve a Markdown twin. Add .md to the same path, for example /learn.md or /docs.md. Those GET requests stay free and need no pass.
hub: agents
slug: how-to-read-attackfee-pages-as-markdown
type: how-to
order: 150
related:
  - /learn/agents/an-agent-that-only-reads
  - /learn/agents/how-crawlers-and-answer-engines-are-treated
  - /learn/agents/well-known-attackfee-json
  - /learn/limits/how-to-keep-docs-and-reads-open
  - /learn/concepts/why-reads-should-stay-free
  - /learn/agents/a-docs-site-open-to-crawlers
  - /docs
  - /learn
audience: agents
status: published
schema: WebPage
faq:
  - q: "Do I need a pass to read the Markdown?"
    a: "No. These are GET requests. Reads stay free."
  - q: "What is the URL shape?"
    a: "Use the same path as the HTML page, with .md added. The Learning Center index is /learn.md. A guide is /learn/concepts/what-is-attackfee.md. Docs are /docs.md."
  - q: "Where is the list of Learning Center pages?"
    a: "The catalog is /llms-learn.txt. /llms.txt is a short hub index and points at that catalog."
  - q: "Is the well-known file Markdown too?"
    a: "The well-known file is JSON at /.well-known/attackfee.json. It is free and unchecked."
---

# How to read Attackfee pages as Markdown

Public pages on attackfee.dev also serve a Markdown twin at the same path with `.md` added. Those are GET requests, so they stay free and need no pass. This is the easiest way for an automated client to read the docs and the Learning Center without parsing the HTML.

Use `/learn.md` for the Learning Center index, `/learn/concepts/what-is-attackfee.md` for a guide, and `/docs.md` for the docs index. The same shape works for other docs and Learning Center URLs. The Learning Center catalog is `/llms-learn.txt`. `/llms.txt` is a short hub index and points at that catalog. Discovery remains `/.well-known/attackfee.json`, which is JSON, free, and unchecked.

Do not send a write to these URLs. Markdown twins are for reading. A contact POST or another write still needs a pass, and an agent that posts without one gets 402 when it sends `Attackfee-Client: agent`.

## Where Attackfee fits

Read first, write second, and keep reads free. See [An agent that only reads](/learn/agents/an-agent-that-only-reads), [How crawlers and answer engines are treated](/learn/agents/how-crawlers-and-answer-engines-are-treated), and [How to keep docs and reads open](/learn/limits/how-to-keep-docs-and-reads-open).
