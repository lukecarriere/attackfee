---
title: Walk through the hosted demo
description: Example. The hosted demo is one contact form protected as a write. You can send it from a browser, then send the same route with no pass and see a 403, or a 402 with the agent header.
hub: concepts
slug: try-the-demo
type: example
order: 240
related:
  - /learn
  - /demo
  - /learn/write-surfaces/contact-forms
  - /learn/concepts/how-to-test-a-write-without-a-pass
  - /learn/concepts/how-to-run-the-local-demo
  - /learn/concepts/what-happens-without-a-pass
audience: both
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's form?"
    a: "No. This is a worked example on the public Attackfee demo. It is not a customer story."
  - q: "What does the hosted demo include?"
    a: "One contact form, protected as a write. It does not include a search box or a comment thread."
  - q: "Where are the demo stats?"
    a: "Plain counts, with no personal data, are at /demo/stats and /demo/stats/daily. This page does not quote those totals, because they change."
  - q: "How do I try a comment thread?"
    a: "Run the local demo from a clone with npm run demo. That includes a contact form, a comment thread, and a posted search."
  - q: "Does the demo take my money if I use a browser?"
    a: "No. People never pay money. The browser earns a work pass in the background."
---

# Walk through the hosted demo

Example. This is a walk-through of the public Attackfee demo, not a customer story, and it does not invent traffic numbers.

Open [/demo](/demo). You should see one contact form, protected as a write. Page views of the demo stay free. Fill the form in a browser with JavaScript on, and send it. The page script earns a work pass in the background and attaches it to the post. There is nothing to solve.

The form posts to `/demo/contact`. Then test that route without a pass, as in [How to test a write without a pass](/learn/concepts/how-to-test-a-write-without-a-pass). A browser-style POST should get a 403 with `attackfee_required`. A POST that sends `Attackfee-Client: agent` should get a 402, with a way to do the work or to pay when that path is on.

Plain counts for the demo, with no personal data, are at `/demo/stats` and `/demo/stats/daily`. This page does not quote those totals, because they change.

The hosted demo does not include a search box or a comment thread. From a clone, `npm run demo` starts a local server at `http://localhost:8787` with a contact form, a comment thread, and a posted search. You need Node 22.18 or newer. The local demo uses a stub backend by default.

## Where Attackfee fits

Use the hosted demo to see a protected contact form. Use the local demo when you want a comment thread or a posted search on your machine.
