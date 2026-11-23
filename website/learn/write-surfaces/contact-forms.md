---
title: Protecting a contact form
description: A contact or support form is a write. Add attackfee.js to the HTML page, mark the form, and check the pass on the server before you store or forward the message. The hosted demo is this case.
hub: write-surfaces
slug: contact-forms
type: use-case
order: 110
related:
  - /learn
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/try-the-demo
  - /learn/concepts/attackfee-js-widget
  - /demo
  - /docs/widget
audience: owners
status: published
schema: WebPage
faq:
  - q: "Can I add this to a plain HTML page?"
    a: "Yes. Load attackfee.js from your own origin, add data-attackfee=write on the form, and include the noscript line. You still have to check the pass on the server that receives the post."
  - q: "Does the script read the message?"
    a: "No. It never reads or sends the fields in the form."
  - q: "Is Contact Form 7 covered?"
    a: "On WordPress, Contact Form 7 is an option you can turn on. It is off until you do."
  - q: "Where can I try this without installing?"
    a: "The hosted demo at /demo is a contact form protected as a write."
  - q: "What if JavaScript is off?"
    a: "The browser path needs JavaScript. The noscript line is: This form needs JavaScript."
---

# Protecting a contact form

A contact or support form is a write: it stores or forwards a message. Mark it, let the page script earn a pass while someone types, and check the pass before you accept the send. People never pay money.

You can add this to a plain HTML page:

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

Serve that script from your own origin. The Node issuer can serve it at `/attackfee/v1/attackfee.js`. The script is not enough on its own: the server that receives the post still has to check the pass.

The hosted [demo](/demo) is this case: one contact form, protected as a write. A POST with no pass gets a 403 in a browser, or a 402 if the client sends `Attackfee-Client: agent`.

On WordPress, Contact Form 7 is an option under Settings, then Attackfee, and is off until you turn it on. A theme form uses `data-attackfee` and `attackfee_wp_verify_request('write')`.

## Where Attackfee fits

See [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form) and [Walk through the hosted demo](/learn/concepts/try-the-demo).
