---
title: An agent posts a comment
description: Example. An automated client can read the rules for free, send Attackfee-Client: agent, and present a pass for one comment. Not a customer story.
hub: agents
slug: an-agent-posts-a-comment
type: example
order: 130
related:
  - /learn/agents/agents-posting-comments
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/an-agent-that-pays-for-one-write
  - /learn/agents/well-known-attackfee-json
  - /learn/write-surfaces/comment-sections
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/why-http-402-matters-for-automated-clients
audience: agents
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's agent?"
    a: "No. This is a worked example. It does not invent a product name, a quote, or a dollar amount."
  - q: "Can one payment post a whole thread?"
    a: "No. A paid pass is one write and at most 60 seconds. A second comment needs a new payment, or the work instead."
  - q: "Do people follow these steps to comment?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "What if payments are off?"
    a: "Do the work. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself."
---

# An agent posts a comment

Example. This is a worked example, not a customer story. It does not invent a product, a quote, or a dollar amount.

Take an automated client that wants to leave one comment on a site that uses Attackfee. It first reads `/.well-known/attackfee.json`, the docs, and the comment page. Those reads stay free and need no pass. Then it POSTs the comment with `Attackfee-Client: agent` and no pass. The site answers with HTTP 402, including a `challenge_url` and, when payments are on, offers.

The client can do the work and retry with the pass, or, on attackfee.dev, pay a live offer, redeem a pass, and send `Authorization: Attackfee <pass>`. That paid pass covers one comment and lasts at most 60 seconds. A second comment needs a new payment, or the work instead. If the site does not take payment, the work is the path. A self-hosted server uses a stub backend by default.

A valid pass does not mean the comment is published. The site can still hold it for review.

## Where Attackfee fits

This path is for automated clients. People never pay money. See [Agents posting comments](/learn/agents/agents-posting-comments), [An agent that pays for one write](/learn/agents/an-agent-that-pays-for-one-write), and [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
