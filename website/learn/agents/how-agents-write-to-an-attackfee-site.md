---
title: How agents write to an Attackfee site
description: An automated client reads /.well-known/attackfee.json, sends Attackfee-Client: agent, and on a priced write gets a 402 or does the work. Reading the site stays free.
hub: agents
slug: how-agents-write-to-an-attackfee-site
type: how-to
order: 10
related:
  - /learn
  - /learn/agents/well-known-attackfee-json
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/what-is-http-402
  - /docs/agent
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Can an agent just do the work and never pay?"
    a: "Yes. Work is always an allowed path on a correctly configured issuer. Payment is an alternative, when the site has turned it on."
  - q: "What if the client cannot run the work?"
    a: "On a site with payments on, pay the 402 offer. On a work-only site, the write will not go through until the work is done."
  - q: "Does Attackfee block agents from reading?"
    a: "No. GET, docs, and the well-known file stay free. Attackfee does not block crawlers."
  - q: "Is there a hosted agent endpoint I should call?"
    a: "Call the site you are writing to. The api field in that site's well-known file is the origin to use. attackfee.dev is one example, not a proxy for other sites."
  - q: "Do I need an API key from Attackfee?"
    a: "No. There is no third-party API key for this path. You talk to the site's own issuer."
---

# How agents write to an Attackfee site

An automated client reads the site's `/.well-known/attackfee.json`, sends `Attackfee-Client: agent` on a write, and follows the JSON it gets back. Reading the site, including docs, stays free. A priced write needs a pass, earned with the same work a browser does, or, on attackfee.dev, paid over HTTP 402.

## The path

- Fetch `/.well-known/attackfee.json`. It is free and not checked. It tells you the API origin, that reads are free, the action classes, and, when payments are on, how to pay.
- Send writes with `Attackfee-Client: agent`. Without that header you get a 403, not a 402.
- If the write is priced and you have no pass, you get HTTP 402 and a JSON body with offers and a `challenge_url`. Do the work at that URL, or pay an offer when payments are on, then retry with `Authorization: Attackfee <pass>`.
- A work pass covers 20 actions for 15 minutes. A paid pass covers one write and lasts at most 60 seconds.

`GET /v1/price` returns the current price for an action. Do not hardcode a dollar figure.

The `@attackfee/agent` and `@attackfee/mcp` packages walk this path for you. They are not on a public package registry yet; install them from a clone. `@attackfee/agent` does the work and retries once. A runnable payment example is in the project's examples directory. The MCP package exposes tools against a site that already has Attackfee on it.

On a typical self-hosted install, only the work path is live. A self-hosted server uses a stub backend by default.

## What not to do

Do not treat a 403 as a payment offer. Do not scrape a payment flow from a browser page. People never pay money; that path is for clients that opt into the agent header. Do not assume every Attackfee site accepts payment. Check the well-known file.

## Where Attackfee fits

Agents can already read the site. This page is only about writes. See [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json) and the [agent docs](/docs/agent).
