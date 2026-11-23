---
title: What the visitor sees when work is slow
description: The check usually runs in the background. If it would take longer than 8 seconds, the visitor gets a Verify before sending button instead of waiting. That visible check is off by default.
hub: concepts
slug: what-the-visitor-sees-when-work-is-slow
type: edge-case
order: 340
related:
  - /learn/concepts/attackfee-js-widget
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/memory-hard-mode
  - /learn/concepts/what-is-a-write-pass
  - /learn/limits/javascript-disabled-browsers
  - /learn/limits/gpu-grinding
  - /docs/widget
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is the Verify before sending button on by default?"
    a: "No. It appears when a check would take longer than the 8 second limit. You can also show it on a form with data-attackfee-checkbox set to true. Most sites do not need that."
  - q: "How long does the check usually take?"
    a: "The published benchmark is a desktop median of about 0.2 seconds and an emulated phone median of about 0.4 seconds. No real phone was measured."
  - q: "What if JavaScript is off?"
    a: "The form shows This form needs JavaScript. The widget cannot earn a work pass without JavaScript."
  - q: "Does the check read what the visitor typed?"
    a: "No. The check never reads or sends what people type into the form."
---

# What the visitor sees when work is slow

Most visits never show a check. The browser does the work in the background while the person reads or types, and the widget adds a hidden pass field. If a check would take longer than 8 seconds, the visitor gets a "Verify before sending" button instead of waiting. That fallback is the 8 second cap, not the usual path. The published benchmark is a desktop median of about 0.2 seconds and an emulated phone median of about 0.4 seconds. No real phone was measured.

You can also show the button on a form by setting `data-attackfee-checkbox="true"`. That is off by default. Most sites do not need it. Set `data-max-solve-ms` on the script tag to the same number as `max_solve_ms` on the server. The default is 8000.

The official strings are: working, "Checking…"; done after a visible check, "Verified"; the button name, "Verify before sending"; an error, "Couldn't check this form."; the error action, "Try again"; and, with JavaScript off, "This form needs JavaScript." Memory-hard mode is off by default and is heavier on phones.

The check never reads or sends what people type into the form. People never pay money.

## Where Attackfee fits

Leave the invisible check in place unless you have a reason to show the button. See [What does attackfee.js do?](/learn/concepts/attackfee-js-widget), [When to turn on memory-hard work](/learn/concepts/memory-hard-mode), and the [widget docs](/docs/widget).
