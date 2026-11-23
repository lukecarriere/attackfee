---
title: How does Attackfee work?
description: You mark the routes that change something. A browser earns a short-lived pass with background work. A write without a valid pass is refused. Reads stay free.
hub: concepts
slug: how-attackfee-works
type: concept
order: 20
related:
  - /learn
  - /learn/concepts/what-is-attackfee
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/action-classes
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/how-to-check-writes-on-your-server
  - /docs/quick-start
audience: both
status: published
schema: WebPage
faq:
  - q: "What does a person see?"
    a: "Usually nothing. The check runs in the background. If it would take too long, the page can show a Verify before sending button. That button is off by default."
  - q: "What if JavaScript is off?"
    a: "The browser path needs JavaScript. The sample form includes a noscript line: This form needs JavaScript. An automated client does not use the page script. It calls the /v1 API or pays over HTTP 402."
  - q: "Why do browsers get 403 and agents get 402?"
    a: "A browser is expected to complete the background work. An automated client that sends Attackfee-Client: agent is expected to read a machine-readable 402, then pay or do the work. A 403 to a browser does not include payment offers."
  - q: "Do the four classes change the money price too?"
    a: "On attackfee.dev, each class has its own price, published at /v1/price and in /.well-known/attackfee.json. The owner chooses the class, which sets the relative cost. Do not hardcode a dollar figure. It can move."
  - q: "What happens when the pass store is down?"
    a: "Protected writes fail closed with a 503. Reads are unaffected."
---

# How does Attackfee work?

You mark the routes that change something. A visitor's browser does a little background work, trades that work with your server for a pass, and sends the pass with the post. A write without a valid pass is refused. Reads stay free.

## The steps

- You mark the routes that change something: comments, contact forms, signups, logins, posted search, and write APIs. Each route gets a class: search, write, account, or admin. A heavier class asks for more work. Search is 1x, write is 4x, account is 8x, and admin is 16x. An unmapped POST counts as a write. A pass earned for a heavier class also covers the lighter ones. Anything you leave unmarked that is a GET, HEAD, or OPTIONS request stays a free read.
- A visitor's browser does a little background work. While someone reads or types, the page script runs a short proof of work and trades it with your server for a pass. There is nothing to solve and nothing to click. The script never reads or sends what people type into your forms.
- The pass rides along with the post. Pressing Send just sends. One work pass covers 20 actions for 15 minutes, so a person pays about once per visit, in work, not in money.
- A write without a valid pass is refused. A browser gets a 403 and a fresh challenge. A client that sends the `Attackfee-Client: agent` header gets a 402 with a price and a link to the same work, or it can do the work instead.
- Volume pays again and again. A script has to earn a new work pass every 20 actions. A paid pass, when that path is on, covers one write and lasts at most 60 seconds.

In the project's benchmark the median check on a desktop took about 0.2 seconds, and about 0.4 seconds on an emulated phone. No real phone has been measured yet. If the work ever runs past 8 seconds, the page shows a "Verify before sending" button instead of waiting.

The usual work is a PBKDF2-SHA-256 partial-hash search that browsers can run in WebCrypto. An optional memory-hard mode is off by default because it is heavier on phones.

## What stays open

Every GET, HEAD, and OPTIONS request is a free read unless you deliberately mark that route otherwise. Attackfee does not block crawlers. Each site also serves a machine-readable description at `/.well-known/attackfee.json`, free and unchecked.

Your server does limit how often one network address can ask for new challenges, 60 a minute by default, to protect itself. That is not a substitute for flood defense at the network layer.

If the store that tracks used challenges is down, protected writes get a 503. Nothing gets through unchecked.

## Where Attackfee fits

Add the page script, mark the forms, and check writes on your own server. The [quick start](/docs/quick-start) is the install path. [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site) covers automated clients.
