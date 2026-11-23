---
title: Attackfee Learning Center
description: Short answers about write-side security. Reads stay free. Writes such as comments, signups, logins, posted search, and write APIs need a pass.
hub: index
slug: index
type: hub
order: 0
related:
  - /docs
  - /docs/quick-start
  - /demo
  - /learn/concepts
  - /learn/write-surfaces
  - /learn/agents
  - /learn/payments
  - /learn/limits
audience: both
status: published
schema: WebPage
faq:
  - q: "Is this the same as the docs?"
    a: "No. Docs are the install path: the page script, the server, the agent client, and the WordPress plugin. This library explains the questions around those steps. When you are ready to install, go to /docs."
  - q: "Do I have to pay to read these pages?"
    a: "No. Attackfee does not gate page views. This library, the docs, and other GET requests stay free to read."
  - q: "Where do I start if I run WordPress?"
    a: "Start with the WordPress hub, then the WordPress docs at /docs/wordpress."
  - q: "Where do I start if I run Node?"
    a: "Start with how to add Attackfee to a form and how to check writes on your own server, then the quick start at /docs/quick-start."
  - q: "Can an automated client pay instead of doing the background work?"
    a: "On attackfee.dev, yes, over HTTP 402. Current prices are at /v1/price. A self-hosted server does not take real payments unless you turn that path on yourself, and it uses a stub backend by default."
---

# Attackfee Learning Center

This library answers questions about writes that cost a site owner something real: comments, signups, logins, posted search, and write APIs. Reading stays free. A visitor's browser earns a pass that covers 20 actions for 15 minutes. A write without a valid pass is refused: a browser gets a 403, and a client that sends the `Attackfee-Client: agent` header gets a 402. The install steps live in the [docs](/docs).

## Concepts

What Attackfee is, what a write surface is, and what a pass is. Start with [What is a write surface?](/learn/concepts/what-is-a-write-surface).

See the [concepts hub](/learn/concepts).

## Write surfaces

How to protect comments, posted search, logins, signups, and write APIs.

See the [write surfaces hub](/learn/write-surfaces).

## Agents

How an automated client reads a site for free, discovers the rules, and writes with a pass.

See the [agents hub](/learn/agents).

## Payments

What HTTP 402 means, how a paid write works, and how an agent chooses a live payment method without assuming every install takes payment.

See the [payments hub](/learn/payments).

## WordPress

How to install the Attackfee WordPress plugin, and what it covers by default. Exact install steps also live in the [WordPress docs](/docs/wordpress).

See the [WordPress hub](/learn/wordpress).

## Comparisons

How pricing a write differs from rate limiting, from blocking by network address, and from interactive challenges.

See the [comparisons hub](/learn/comparisons).

## Privacy and limits

What Attackfee does not do, how it treats privacy, what a funded attacker can still do, and what happens when a check cannot run.

See the [privacy and limits hub](/learn/limits).

The packages are not on a public package registry yet. Work from a clone of the project, or upload the WordPress plugin zip from the [download page](/download). Try a protected form on the [demo](/demo).
