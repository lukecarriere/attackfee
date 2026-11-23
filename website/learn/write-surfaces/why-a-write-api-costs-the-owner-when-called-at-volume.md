---
title: Why a write API costs the owner when called at volume
description: Each call to a write API can mean compute, storage, or a downstream job. When those calls are free for the sender, volume is cheap for them and expensive for you.
hub: write-surfaces
slug: why-a-write-api-costs-the-owner-when-called-at-volume
type: background
order: 230
related:
  - /learn/write-surfaces/public-write-apis
  - /learn/write-surfaces/how-to-protect-a-write-api
  - /learn/write-surfaces/why-writes-cost-the-site-owner
  - /learn/write-surfaces/posted-search-is-a-write
  - /learn/write-surfaces/a-search-box-and-a-paid-backend
  - /learn/concepts/volume-should-cost-volume
  - /learn/agents/agent-builders-writing-to-sites
audience: both
status: published
schema: WebPage
faq:
  - q: "Does this apply to a GET API?"
    a: "No. GET, HEAD, and OPTIONS stay free unless you deliberately mark a route otherwise. Leave reads open."
  - q: "What if the POST only runs a search?"
    a: "If the search is sent as a POST, or it calls a backend that costs you something to run, it is a write. Price it as search or as write, depending on the action."
  - q: "Can an automated client pay per call?"
    a: "On attackfee.dev, yes, over HTTP 402. Current prices are at /v1/price. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself."
  - q: "Do people pay to call the API from a form?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# Why a write API costs the owner when called at volume

A write API is a route that changes something, or that costs you something real to run: storage, compute, mail, or a downstream job you pay for. When that route is free for the sender, an automated client can call it as often as it likes. Volume is then cheap for them and expensive for you. That is why a write API is a write surface, even when the response looks like a search result.

Attackfee prices the action, not the caller. You mark the route and check each write on your own server. A work pass covers 20 actions for 15 minutes. People never pay money. An automated client does the work, or, on attackfee.dev, can pay per write over HTTP 402. A paid pass is one write and at most 60 seconds. Reads on the same API, including docs, stay free.

This does not stop a funded caller who keeps paying the cost, and it does not filter a network flood. It changes the price of accepted volume.

## Where Attackfee fits

Map the POST, PUT, PATCH, or DELETE route to a class, serve discovery so agents can read the rules, and leave GET open. See [Protecting public write APIs](/learn/write-surfaces/public-write-apis), [How to protect a write API](/learn/write-surfaces/how-to-protect-a-write-api), and [Volume should cost volume](/learn/concepts/volume-should-cost-volume).
