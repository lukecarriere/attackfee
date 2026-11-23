---
title: Protecting a waitlist or newsletter form
description: A waitlist or newsletter form stores an address, so it is a write. Mark the form, add the page script to the HTML, and check the pass before you save the address. There is no separate newsletter integration in Attackfee today.
hub: write-surfaces
slug: waitlist-and-newsletter-forms
type: use-case
order: 150
related:
  - /learn
  - /learn/write-surfaces/contact-forms
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/attackfee-js-widget
  - /docs/widget
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is there a special waitlist class?"
    a: "No. Treat it as a write, or as account if the form also creates a login. There is no separate newsletter package in Attackfee today."
  - q: "Can this live on a plain HTML landing page?"
    a: "Yes. Load attackfee.js from your origin, mark the form, and check the pass on the server that stores the address."
  - q: "Does the WordPress plugin wrap every newsletter plugin?"
    a: "No. If the plugin does not already wrap that form, mark it yourself and call attackfee_wp_verify_request in the handler."
  - q: "Do subscribers pay money?"
    a: "No. People never pay money."
---

# Protecting a waitlist or newsletter form

A waitlist or newsletter form stores an address, so it is a write. Automated volume can fill a list with junk addresses as easily as it can fill a contact form. Mark the form, let the page script earn a pass, and check the pass before you save the address.

Treat it as the write class unless the form also creates a login, in which case use account. There is no separate newsletter integration, and no special waitlist class, in Attackfee today.

On a plain HTML landing page, load `attackfee.js` from your own origin and mark the form with `data-attackfee="write"`:

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/waitlist" data-attackfee="write">
  <button type="submit">Join the waitlist</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

The server that receives the post still has to check the pass. The script never reads the address field.

On WordPress, if the built-in options do not wrap your form, add the attribute and call `attackfee_wp_verify_request('write')` before you store the address.

## Where Attackfee fits

This is the same pattern as a contact form. See [Protecting a contact form](/learn/write-surfaces/contact-forms) and [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form).
