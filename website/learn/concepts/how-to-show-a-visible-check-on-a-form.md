---
title: How to show a visible check on a form
description: A Verify before sending button is off by default. Set data-attackfee-checkbox to true to show it, or leave it off unless a check would run past the max solve time.
hub: concepts
slug: how-to-show-a-visible-check-on-a-form
type: how-to
order: 460
related:
  - /learn/concepts/what-the-visitor-sees-when-work-is-slow
  - /learn/concepts/attackfee-js-widget
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/what-attackfee-yaml-configures
  - /docs/widget
  - /docs/quick-start
audience: owners
status: published
schema: WebPage
faq:
  - q: "Do most sites need the button?"
    a: "No. It is off by default. Most sites can leave the check invisible."
  - q: "When does it appear on its own?"
    a: "When a check would take longer than the max solve time. The default is 8000 milliseconds."
  - q: "How do I turn it on for one form?"
    a: "Add data-attackfee-checkbox="true" on that form."
  - q: "How do I keep the script and the server in sync?"
    a: "Set data-max-solve-ms on the script tag to the same number as max_solve_ms in the issuer config."
---

# How to show a visible check on a form

A "Verify before sending" button is off by default. Most sites can leave the check invisible. The page script still earns a work pass in the background.

To show the button on one form, add `data-attackfee-checkbox="true"` to that form. The widget docs call this a visible check. If you do not set the attribute, the button still appears when a check would take longer than the max solve time, so the visitor is not left waiting. The default limit is 8000 milliseconds.

Keep the script and the server on the same limit. Set `data-max-solve-ms` on the script tag to the same number as `max_solve_ms` in `attackfee.yaml`. The visitor-facing strings are fixed: "Checking…", "Verified", "Verify before sending", "Couldn't check this form.", and "Try again". The check never reads or sends what people type into the form. People never pay money.

## Where Attackfee fits

Leave the button off unless you have a reason to show it. See [What the visitor sees when work is slow](/learn/concepts/what-the-visitor-sees-when-work-is-slow), [What does attackfee.js do?](/learn/concepts/attackfee-js-widget), and the [widget docs](/docs/widget).
