---
title: What happens if a write has no pass?
description: A write without a valid pass is refused. A browser gets a 403 and a fresh challenge. A client that sends Attackfee-Client: agent gets a 402 with a price and a link to the same work.
hub: concepts
slug: what-happens-without-a-pass
type: concept
order: 90
related:
  - /learn
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/how-attackfee-works
  - /learn/payments/what-is-http-402
  - /docs/server
  - /demo
audience: both
status: published
schema: WebPage
faq:
  - q: "Does a 403 include payment offers?"
    a: "No. Payment offers are for clients that send the agent header and receive a 402."
  - q: "What if the pass is expired rather than missing?"
    a: "The write is still refused. The client needs a new pass, the same as if none was sent."
  - q: "What status is used when the store is down?"
    a: "503, and the write is not accepted. That is not the same as a missing pass."
  - q: "Can I try this on the hosted demo?"
    a: "Yes. POST to the demo contact form with no pass. A browser-style request gets 403. A request with Attackfee-Client: agent gets 402."
  - q: "Does a refused write still store the comment?"
    a: "No. The check runs before the handler. A refused write should not be stored."
---

# What happens if a write has no pass?

A write without a valid pass is refused. Nothing is stored. A browser, or any client that does not send `Attackfee-Client: agent`, gets a 403 with a fresh challenge and the error `attackfee_required`. A client that sends that header gets a 402, with a price when payments are on, and a `challenge_url` for the same work.

The hosted [demo](/demo) behaves that way on its contact form. You can send the form from a browser, then call the same route with no pass and see the 403.

If the pass is present but used up, expired, or for the wrong site, the write is also refused. If the store that tracks used challenges is down, protected writes get a 503 instead. Reads are not affected.

## Where Attackfee fits

This is the fail-closed rule for a priced write. See [How does Attackfee work?](/learn/concepts/how-attackfee-works) and [What is HTTP 402 Payment Required?](/learn/payments/what-is-http-402).
