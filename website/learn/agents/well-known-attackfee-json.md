---
title: What is /.well-known/attackfee.json?
description: /.well-known/attackfee.json is a free, unchecked file that describes how a site uses Attackfee, including that reads are free, the API origin, action prices, and payment methods when they are on.
hub: agents
slug: well-known-attackfee-json
type: concept
order: 20
related:
  - /learn
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/payments/what-kinds-of-payment-can-an-agent-use
  - /learn/agents/how-to-let-agents-discover-your-site
  - /learn/payments/v1-price-endpoint
  - /learn/write-surfaces/how-to-protect-a-write-api
  - /docs/agent
audience: agents
status: published
schema: WebPage
faq:
  - q: "Is this file checked or priced?"
    a: "No. It is a free GET, like the docs."
  - q: "Who should fetch it, a person or a program?"
    a: "It is written for programs. People can read it too. The human explanation is this page and the docs."
  - q: "What if the file is missing?"
    a: "The site may still be running Attackfee without publishing the file, but a well-behaved agent will have a harder time discovering the API origin and the methods in use. Publish it."
  - q: "Does the file include a live dollar price?"
    a: "It can include a price basis per class. On attackfee.dev that basis has been published as a base amount, with the converted figure served from /v1/price. Always check /v1/price for the current number."
  - q: "Can I cache it?"
    a: "Yes, as you would any well-known file, and re-fetch when a write starts failing or when you need a current method list. Do not cache /v1/price as if it never changes."
---

# What is /.well-known/attackfee.json?

`/.well-known/attackfee.json` is a machine-readable description of how a site uses Attackfee. It is served as a free, unchecked GET. An automated client should read it before writing.

## What it contains

The live file on attackfee.dev, checked on 20 Nov 2026, includes:

- `name`, `description`, and a `docs` link.
- `api`, the origin of the site's `/v1` API, and `pay`, a helper path for a demo agent payment.
- `reads_free: true`.
- `not_for`, which on attackfee.dev lists page views, crawler blocking, and citation licensing.
- `tools`, with endpoints for price, challenge, and pass verification.
- Inside each tool, a `price` object with a `basis` (on this file, `base`, and `usd` left null) and a `by_action` map for search, write, account, and admin.
- A `payment` object: the live methods, any method marked stub, a redeem URL, and steps that include a paid pass lasting 60 seconds.

A site may also serve `/.well-known/agents.json`. In the packaged server, the WordPress plugin, and the edge worker, that file is a pointer to the Attackfee file. Both are free to fetch.

Treat the live file as the source of truth for that site. If a method is listed as stub, it is not wired. Do not send that method.

Current prices, including a converted dollar figure when the rate is fresh, are at `/v1/price`. That endpoint uses `basis: "current"`. Do not hardcode the figure.

## Where Attackfee fits

A self-hosted issuer should serve its own well-known file from its origin, via the packaged server. That file will match what that install actually offers, which may be work only. Clients should not assume attackfee.dev's file applies to another site. See [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
