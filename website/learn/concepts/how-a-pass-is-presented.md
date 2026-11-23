---
title: How a pass is presented
description: A write can present a pass as the attackfee_pass cookie, as a hidden attackfee-pass field, or as Authorization: Attackfee. The cookie is first-party. People never pay money.
hub: concepts
slug: how-a-pass-is-presented
type: how-to
order: 360
related:
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/why-a-pass-is-not-a-login
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/concepts/attackfee-js-widget
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/payments/how-does-a-paid-write-work
  - /privacy
  - /docs/server
audience: both
status: published
schema: WebPage
faq:
  - q: "Which presentation should a browser use?"
    a: "The widget adds a hidden attackfee-pass field. The Node issuer may also set a first-party attackfee_pass cookie after background work from the same origin."
  - q: "Does an automated client use the cookie?"
    a: "Usually no. Send Authorization: Attackfee and the pass. The cookie is not set for a paid or agent pass."
  - q: "What are the cookie's flags?"
    a: "On this site's issuer, the cookie is HttpOnly and SameSite=Lax, and Secure on HTTPS. It holds the work pass and lasts 15 minutes by default. The page script does not set cookies."
  - q: "What if the check comes from another origin?"
    a: "The Node issuer skips the cookie. The pass is sent in a header or a hidden form field instead."
---

# How a pass is presented

A write has to present a valid pass. There are three ways to do that: the first-party `attackfee_pass` cookie, a hidden `attackfee-pass` field on the form, or the `Authorization: Attackfee` header. Your server should accept the presentation the client is using, then check the pass. People never pay money.

In a browser, `attackfee.js` earns a work pass and adds the hidden field. If a write check is running and the visitor finishes the background work from the same origin, the Node issuer may also set the `attackfee_pass` cookie. On attackfee.dev, that cookie is HttpOnly and SameSite=Lax, and Secure on HTTPS. It holds the work pass and lasts 15 minutes by default. Static pages do not set a cookie. The page script does not set cookies.

The cookie is not set for a paid or agent pass. The Node issuer also skips it when the check comes from another origin. Then the pass is sent in the header or the hidden field. Automated clients should send `Authorization: Attackfee <pass>`.

## Where Attackfee fits

Present the pass, then check it on your server. See [What is an Attackfee pass?](/learn/concepts/what-is-a-write-pass), [Why a pass is not a login](/learn/concepts/why-a-pass-is-not-a-login), and the [privacy statement](/privacy).
