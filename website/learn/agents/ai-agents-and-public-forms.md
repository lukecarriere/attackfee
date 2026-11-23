---
title: How AI agents use public forms
description: Agents can already read a public site. A public form is also just an HTTP write. Attackfee leaves the read free and asks for a pass on the post, whether the caller is a person or a program.
hub: agents
slug: ai-agents-and-public-forms
type: background
order: 80
related:
  - /learn
  - /learn/agents/what-is-an-ai-agent-attack
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/concepts/why-reads-should-stay-free
  - /docs/ask
audience: both
status: published
schema: WebPage
faq:
  - q: "Can an agent read my docs without a pass?"
    a: "Yes. GET requests, docs, and the well-known files stay free. Attackfee does not block crawlers."
  - q: "How does an agent write?"
    a: "It sends Attackfee-Client: agent, follows the 402 or the well-known file, and presents a pass earned with work or, on attackfee.dev, with payment."
  - q: "Do I have to whitelist my own scripts?"
    a: "No. There is no allow list for 'good' automation. Your own script uses the same work or payment path as any other client."
  - q: "Should I hide the form from agents?"
    a: "Hiding the read half also hides you from people and from answer engines. Price the write instead."
---

# How AI agents use public forms

Agents can already read a public site: docs, pages, and GET APIs are ordinary HTTP. A public form is also just HTTP. If the post is accepted with no extra cost, an automated client can write as easily as it can read.

Attackfee keeps that read path open and puts a cost on the write. An agent that only reads never needs a pass. An agent that posts a comment, starts an account, or calls a write API needs one. It sends `Attackfee-Client: agent`, reads `/.well-known/attackfee.json`, and either does the work or, on attackfee.dev, pays the live offer.

There is no allow list for your own automation. A script you run against your own form uses the same path. That is intentional: the cost is on the action, not on a guess about who owns the client.

## Where Attackfee fits

Publish the well-known files, leave `/docs/ask` open, and check the pass on the write. See [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site) and [What is an AI agent attack on a website?](/learn/agents/what-is-an-ai-agent-attack).
