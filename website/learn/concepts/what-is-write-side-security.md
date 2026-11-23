---
title: What is write-side security?
description: Write-side security puts a cost on the routes that change something, and leaves reading free. Attackfee is built that way: open to read, priced to write.
hub: concepts
slug: what-is-write-side-security
type: background
order: 170
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/open-to-read-priced-to-write
  - /learn/concepts/what-is-attackfee
  - /docs
audience: both
status: published
schema: WebPage
faq:
  - q: "Is this the same as locking down a whole site?"
    a: "No. Write-side security leaves pages, docs, and other GET requests open. The cost sits on the write."
  - q: "Does it identify who is writing?"
    a: "Attackfee does not. It prices the action, not the caller."
  - q: "Does it stop a flood of packets?"
    a: "No. It prices a finished HTTP request after it has reached your server. Keep your host's flood defense."
  - q: "Where does Attackfee fit?"
    a: "On comments, signups, logins, posted search, and write APIs. Reading those same resources stays free."
---

# What is write-side security?

Write-side security is a way to protect a public site by putting a cost on the routes that change something, and leaving the read half open. Pages, docs, and other GET requests stay free to cache and crawl. Comments, signups, logins, posted search, and write APIs need a pass.

Attackfee is built on that split. The tagline is "Open to read. Priced to write." A visitor's browser earns a work pass in the background. An automated client can do the same work, or, on attackfee.dev, pay per write over HTTP 402. The product does not score the caller and does not block crawlers.

This is a different job from a bot score, a block list, or a page-view gate. Those tools try to guess who is calling, or they hide the site from new readers. Write-side security asks whether the write paid its cost.

## Where Attackfee fits

If a route only returns data, leave it unmarked. If a route stores a comment, creates an account, or otherwise changes something, mark it and check the pass on the server. See [What is a write surface?](/learn/concepts/what-is-a-write-surface) and [Open to read, priced to write](/learn/concepts/open-to-read-priced-to-write).
