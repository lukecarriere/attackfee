---
title: How to require a pass for POST requests
description: Mark each POST that is a write, check the pass on your own server, and refuse the request when the pass is missing or invalid. People never pay money. Leave GET requests free.
hub: write-surfaces
slug: how-to-require-a-pass-for-post-requests
type: how-to
order: 260
related:
  - /learn/concepts/how-to-mark-routes
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/write-surfaces/how-to-protect-a-write-api
  - /learn/concepts/what-happens-without-a-pass
  - /learn/payments/why-http-402-matters-for-automated-clients
  - /learn/limits/fail-closed-behavior
  - /docs
audience: owners
status: published
schema: WebPage
faq:
  - q: "Should I also require a pass on GET?"
    a: "No. GET, HEAD, and OPTIONS stay free unless you have a documented reason to mark a route otherwise. The WordPress plugin and the edge worker never gate a GET."
  - q: "Do people pay money when they POST a form?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "What status should an unpaid automated client get?"
    a: "When the client sends Attackfee-Client: agent, respond with HTTP 402 and JSON that includes a challenge_url. A browser-style request gets 403."
  - q: "What if the pass store is down?"
    a: "Protected writes should fail closed with 503. Do not accept a write you cannot check."
---

# How to require a pass for POST requests

To require a pass for a POST, mark that route as a write, put `attackfee.js` on the form if people will use it, and check the pass on your own server before you handle the body. If the pass is missing or invalid, refuse the request. Do not require a pass on GET. Reads stay free. People never pay money.

On a site you self-host, map the POST to a class and check it with the Node middleware or the PHP library. On a form, add `data-attackfee="write"` (or `search` if the post is a search). The official install steps live in the [docs](/docs). A browser-style POST without a pass should get 403. A client that sends `Attackfee-Client: agent` should get 402, with a `challenge_url` and, when payments are on, offers. If the pass store is down, protected writes should get 503.

Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself. Do not hardcode a dollar figure. Current prices, when you need them, are at `/v1/price`.

## Where Attackfee fits

This is the same pattern on comments, contact forms, logins, and write APIs: price the POST, leave the GET open. See [How to mark which routes are writes](/learn/concepts/how-to-mark-routes), [How to check writes on your own server](/learn/concepts/how-to-check-writes-on-your-server), and [What happens if a write has no pass?](/learn/concepts/what-happens-without-a-pass).
