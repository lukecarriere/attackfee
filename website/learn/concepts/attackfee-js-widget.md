---
title: What does attackfee.js do?
description: attackfee.js is the page script for forms. It earns a work pass in the background and attaches it to the post. It never reads form fields. You serve it from your own origin.
hub: concepts
slug: attackfee-js-widget
type: concept
order: 140
related:
  - /learn
  - /docs/widget
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/what-is-a-write-pass
  - /docs/quick-start
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does the script need a third-party site key?"
    a: "No. It talks to your own issuer."
  - q: "What if JavaScript is off?"
    a: "The browser path needs JavaScript. The noscript line is: This form needs JavaScript."
  - q: "Is there a box in the page?"
    a: "Not by default. A Verify before sending button is off unless you turn it on, or unless the work would run past 8 seconds."
  - q: "Where should I host the file?"
    a: "On your own origin. The Node issuer serves it at /attackfee/v1/attackfee.js."
  - q: "Does it send what people type?"
    a: "No. The check never reads or sends the fields in the form."
---

# What does attackfee.js do?

`attackfee.js` is the page script for forms. It is the `@attackfee/widget` package, version 0.1.0 in the repo. Your server serves the file, and the page loads it from your own origin. While someone reads or types, the script earns a work pass and attaches it to the post. There is nothing to solve.

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

`data-attackfee="write"` marks a write. Use `search`, `account`, or `admin` when that is the class you will check on the server. A page view is not a write and stays free.

The Node issuer serves these files from `Attackfee.router()`:

- `/attackfee/v1/attackfee.js`
- `/attackfee/v1/attackfee.worker.js`
- `/attackfee/v1/attackfee.worker-argon2id.js`
- `/attackfee/v1/LICENSES.txt`

A visible "Verify before sending" button is off by default. If a check would take longer than 8 seconds, the visitor gets that button instead of waiting.

The check never reads or sends what people type into the form. The script is not enough on its own: you still have to check the pass on the server.

## Where Attackfee fits

This is the person-facing half of the setup. The [widget docs](/docs/widget) have the install commands. Continue with [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form) and [How to check writes on your own server](/learn/concepts/how-to-check-writes-on-your-server).
