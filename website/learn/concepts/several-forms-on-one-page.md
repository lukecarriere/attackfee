---
title: Several forms on one page
description: Each form you want protected needs its own data-attackfee mark. A work pass is per site, so one pass can cover more than one form on the same site until its uses or time run out.
hub: concepts
slug: several-forms-on-one-page
type: edge-case
order: 330
related:
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/attackfee-js-widget
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/passes-are-per-site
  - /learn/concepts/action-classes
  - /learn/write-surfaces/contact-forms
audience: owners
status: published
schema: WebPage
faq:
  - q: "Can one script tag cover every form on the page?"
    a: "You serve attackfee.js once from your own origin. Each form you want protected still needs a data-attackfee attribute."
  - q: "Does each form need its own work pass?"
    a: "No. A work pass is per site, not per form. It covers 20 actions for 15 minutes across marked writes on that site."
  - q: "What if the forms use different action classes?"
    a: "A heavier pass covers a lighter class. A search pass does not cover a write. Map each form to the class that matches the action."
  - q: "What about a paid pass?"
    a: "A paid pass is one write and at most 60 seconds. It does not cover a second form post."
---

# Several forms on one page

A page can have more than one form: a comment box and a contact form, or a search box next to a signup. Attackfee does not wrap the page as a whole. You serve `attackfee.js` once from your own origin, and you mark each form you want protected with `data-attackfee`. A form without the attribute is not checked by the widget.

A work pass is per site, not per form. Once the browser has a valid work pass, as the `attackfee_pass` cookie and as a hidden `attackfee-pass` field, it can be used on other marked forms on the same site until the 20 uses or the 15 minutes run out. A heavier pass covers a lighter class. A paid pass is different: it is one write and at most 60 seconds.

Use `data-attackfee="write"` for a write and `data-attackfee="search"` for a search that is sent as a form post. Each form still needs a noscript line: `This form needs JavaScript.`

## Where Attackfee fits

Mark every form that is a write, check those posts on your own server, and leave reads free. See [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form), [What does attackfee.js do?](/learn/concepts/attackfee-js-widget), and [Do passes work across sites?](/learn/concepts/passes-are-per-site).
