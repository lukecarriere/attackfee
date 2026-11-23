---
title: How to run the local demo
description: From a clone, run npm install and npm run demo. The local demo serves a contact form, a comment thread, and a posted search at http://localhost:8787. You need Node 22.18 or newer.
hub: concepts
slug: how-to-run-the-local-demo
type: how-to
order: 280
related:
  - /learn
  - /learn/concepts/try-the-demo
  - /learn/concepts/how-to-test-a-write-without-a-pass
  - /learn/concepts/how-to-read-daily-demo-stats
  - /docs
audience: owners
status: published
schema: WebPage
faq:
  - q: "How is this different from the hosted demo?"
    a: "The hosted demo at /demo is one contact form. The local demo also includes a comment thread and a posted search."
  - q: "Does the local demo take payment?"
    a: "The local demo uses a stub backend by default. It is for trying the work path and the refusal when no pass is sent."
  - q: "What Node version do I need?"
    a: "Node 22.18 or newer."
  - q: "Are the packages on a public registry?"
    a: "No. Work from a clone. Run npm install first."
  - q: "Can I try memory-hard mode?"
    a: "The project README documents an environment variable for that mode. It is off by default, and no real phone has been measured."
---

# How to run the local demo

From a clone of the project, install dependencies and start the local demo. You need Node 22.18 or newer. The packages are not on a public package registry yet.

```sh
npm install
npm run demo
```

The demo listens at `http://localhost:8787`. It includes a contact form, a comment thread, and a posted search. The hosted [demo](/demo) is only the contact form, so use the local demo when you want to try the other two surfaces on your machine.

The local demo uses a stub backend by default. People never pay money. A browser with JavaScript on can send the forms with a work pass. A POST with no pass should be refused: 403 for a browser-style request, or 402 if you send `Attackfee-Client: agent`. On the local demo, the contact path is `/contact`.

To test a write without a pass, see [How to test a write without a pass](/learn/concepts/how-to-test-a-write-without-a-pass). For a walk-through of the hosted contact form, see [Walk through the hosted demo](/learn/concepts/try-the-demo).

## Where Attackfee fits

Use the local demo to see a comment thread and a posted search before you mark those routes on your own site.
