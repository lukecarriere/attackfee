---
title: How to let agents discover how to write
description: Publish /.well-known/attackfee.json and /.well-known/agents.json as free, unchecked GET requests. They describe the write check, the work alternative, and how to get a pass, without identifying the caller.
hub: agents
slug: how-to-let-agents-discover-your-site
type: how-to
order: 50
related:
  - /learn
  - /learn/agents/well-known-attackfee-json
  - /learn/payments/v1-price-endpoint
  - /learn/concepts/why-reads-should-stay-free
  - /docs/agent
  - /docs/ask
audience: both
status: published
schema: WebPage
faq:
  - q: "Do I have to write these files by hand?"
    a: "No. The Node issuer and the WordPress plugin serve them. Check that they are reachable as GET requests at the site origin."
  - q: "Are they priced?"
    a: "No. They are free and unchecked."
  - q: "Should I hide docs behind a pass?"
    a: "No. Keep docs and these files in the open so an agent can learn the path before it writes."
  - q: "Where is the live dollar figure?"
    a: "In /v1/price, not as a hardcoded number in the well-known file. The well-known file may list a base amount with the converted figure left null."
  - q: "Does discovery identify the caller?"
    a: "No. The files describe the write check. They do not say who is calling."
---

# How to let agents discover how to write

Publish `/.well-known/attackfee.json` and `/.well-known/agents.json` at the site origin. Both are free, unchecked GET requests. They describe the write check, the work alternative, and how to get a pass. They do not identify the caller.

The Node issuer and the WordPress plugin already serve these files. You should be able to open them in a browser. The live shape on attackfee.dev includes `name`, `description`, `docs`, `api`, `pay`, `reads_free`, `not_for`, and a `tools` object with price and payment fields. Trust the live file over an old note. Some payment methods listed there may be stubs.

Keep `/docs`, `/docs/ask`, and `/v1/price` in the open as well. An automated client should be able to learn the path, read the current check, and then either do the work or pay when that path is on.

Do not gate these files, and do not hide the docs behind a pass. Discovery only works if reading stays free.

## Where Attackfee fits

This is the machine-readable half of leaving the site open to read. See [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json) and [How to read /v1/price](/learn/payments/v1-price-endpoint).
