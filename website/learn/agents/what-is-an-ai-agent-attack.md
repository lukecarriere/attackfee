---
title: What is an AI agent attack on a website?
description: In this library, an AI agent attack means automated writes to a public form or write API, at a volume a person would not keep up. Attackfee does not identify agents. It prices the write.
hub: agents
slug: what-is-an-ai-agent-attack
type: background
order: 70
related:
  - /learn
  - /learn/agents/ai-agents-and-public-forms
  - /learn/concepts/what-is-write-side-security
  - /learn/limits/no-bot-score
  - /learn/agents/how-agents-write-to-an-attackfee-site
audience: both
status: published
schema: WebPage
faq:
  - q: "Does Attackfee identify AI agents?"
    a: "No. There is no score and no verdict on whether the caller is a person or a program. Every protected write needs a pass."
  - q: "Is reading docs an attack?"
    a: "No. Attackfee leaves reads free and does not block crawlers. A write, such as posting a comment, still needs a pass."
  - q: "Can an agent still write?"
    a: "Yes. It can do the background work, or, on attackfee.dev, pay per write over HTTP 402."
  - q: "Is this a report of a named incident?"
    a: "No. This page defines the problem in general terms. It does not cite a specific public incident."
---

# What is an AI agent attack on a website?

In this library, an AI agent attack means automated writes to a public form or write API, at a volume a person would not keep up. The caller may be a script, a tool, or an agent following instructions. The form itself often cannot tell the difference, because a person and a program can post the same fields.

This page is a definition, not a report of a named incident.

Attackfee does not identify agents and does not score the caller. It prices the write. A protected post needs a pass, whoever sends it. An automated client that sends `Attackfee-Client: agent` gets a 402 when there is no valid pass, with a way to do the work or, on attackfee.dev, to pay. Reading docs, pages, and comment threads stays free.

A funded attacker can still get through by paying that cost. Attackfee does not claim otherwise.

## Where Attackfee fits

Leave the read half open, including for agents that only read. Put the cost on the write. See [How AI agents use public forms](/learn/agents/ai-agents-and-public-forms) and [Why Attackfee does not score who you are](/learn/limits/no-bot-score).
