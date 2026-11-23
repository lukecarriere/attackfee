---
title: Protecting public write APIs
description: A public API that accepts POST, PUT, PATCH, or DELETE is a write surface. Automated clients should send Attackfee-Client: agent, present a pass, and read /v1/price when they need a current amount.
hub: write-surfaces
slug: public-write-apis
type: use-case
order: 140
related:
  - /learn
  - /learn/write-surfaces/how-to-protect-a-write-api
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/payments/v1-price-endpoint
  - /docs/agent
audience: both
status: published
schema: WebPage
faq:
  - q: "Do GET APIs need a pass?"
    a: "No. GET, HEAD, and OPTIONS stay free unless you have a rare reason to mark them otherwise, and you should not gate page views."
  - q: "How does a client get a 402 instead of a 403?"
    a: "It sends the Attackfee-Client: agent header. Without that header, a missing pass is a 403."
  - q: "Can I charge a different class for an admin API?"
    a: "Yes. Admin is 16x. Map the prefix to that class and check it on the server."
  - q: "Does a self-hosted API take payment by default?"
    a: "No. A self-hosted server uses a stub backend by default. Work-only is the usual local setup."
---

# Protecting public write APIs

A public API that accepts POST, PUT, PATCH, or DELETE is a write surface. If those routes are open and free, an automated client can call them as fast as the network allows. Mark the prefixes, check the pass before the handler runs, and leave GET APIs that only return data unmarked.

Automated clients should send `Attackfee-Client: agent`. Without a valid pass they get a 402, with a `challenge_url` for the work and a price when payments are on. They can read `/v1/price` and `/.well-known/attackfee.json` for the current check. A browser-style client without that header gets a 403.

Pick a class that matches the cost to you: write for ordinary posts, account for account APIs, admin for staff actions. A paid pass, when that path is on, is one write and at most 60 seconds, so volume still pays volume.

Exact wiring is in [How to protect a write API](/learn/write-surfaces/how-to-protect-a-write-api) and [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).

## Where Attackfee fits

This is the machine-facing half of the same rule: reads stay free, writes need a pass.
