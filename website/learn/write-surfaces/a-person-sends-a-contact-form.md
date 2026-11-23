---
title: A person sends a contact form
description: Example. A person fills a protected contact form in a browser. The widget earns a work pass in the background. There is nothing to solve, and the person never pays money. Not a customer story.
hub: write-surfaces
slug: a-person-sends-a-contact-form
type: example
order: 250
related:
  - /learn/write-surfaces/contact-forms
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/what-the-visitor-sees-when-work-is-slow
  - /learn/concepts/try-the-demo
  - /learn/limits/javascript-disabled-browsers
  - /learn/wordpress/protecting-contact-form-7
  - /demo
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is this a real customer?"
    a: "No. This is a worked example. It does not invent a name, a quote, or a measured time on a real visit."
  - q: "Does the person pay money?"
    a: "No. People never pay money. The browser earns a work pass in the background."
  - q: "What if JavaScript is off?"
    a: "The form shows This form needs JavaScript. The widget cannot earn a work pass without JavaScript."
  - q: "Does Attackfee send the message body somewhere?"
    a: "No. The check never reads or sends what people type into the form. Your form still posts to your own server."
---

# A person sends a contact form

Example. This is a worked example, not a customer story. It does not invent a name, a quote, or a measured time on a real visit.

A person opens a contact page, types a message, and sends the form. The page already loaded `attackfee.js` from the site's own origin, and the form is marked with `data-attackfee="write"`. While the person reads and types, the browser does the work in the background. There is nothing to solve. When the pass is ready, the widget adds a hidden `attackfee-pass` field, and the cookie `attackfee_pass` is set. The person clicks Send. The site checks the pass on its own server and then handles the message as it always did.

Most visits never show a check. If the work would take longer than 8 seconds, the person would see a "Verify before sending" button instead of waiting. The published benchmark is a desktop median of about 0.2 seconds and an emulated phone median of about 0.4 seconds, with no real phone measured. The form needs JavaScript. With it off, the noscript line is "This form needs JavaScript."

The check never reads or sends what the person typed. People never pay money. You can try this path on the hosted [demo](/demo).

## Where Attackfee fits

This is the person path. Automated clients use the agent header instead. See [Protecting a contact form](/learn/write-surfaces/contact-forms), [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form), and [Walk through the hosted demo](/learn/concepts/try-the-demo).
