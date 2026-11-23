---
title: Why checks run on your server
description: Attackfee checks a write on the server where you installed it. The page script is not enough. Form contents never leave the page through Attackfee, and nothing is sent to us.
hub: concepts
slug: why-checks-run-on-your-server
type: philosophy
order: 350
related:
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/concepts/attackfee-js-widget
  - /learn/limits/what-attackfee-keeps
  - /learn/concepts/how-to-check-a-pass-with-siteverify
  - /docs/self-hosting
  - /docs/server
  - /privacy
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does the page script enforce the check?"
    a: "No. If you mark the form and forget the server check, the post will go through. The server has to refuse a write that has no valid pass."
  - q: "Does Attackfee receive what people type?"
    a: "No. Form contents never leave the page through Attackfee. The check looks at the pass, not the message body."
  - q: "Where do the checks run on a typical install?"
    a: "On your own server, or on your WordPress site if you use the plugin. Self-hosting docs put it this way: nothing is sent to us. Checks run where you installed them."
  - q: "Do people pay money for that check?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# Why checks run on your server

Attackfee only works if the write is checked on the server that accepts it. The page script can earn a work pass and attach it to the post. It cannot refuse the post. If you mark a form and forget the server check, the write goes through. That is why checks run on your server, not in the browser alone.

The check looks at the pass, not at what someone typed. Form contents never leave the page through Attackfee. On a typical install, nothing is sent to us. Checks run where you installed them: the Node issuer on your origin, or the WordPress plugin on your site. You can also call `POST /v1/siteverify` from your own server, with your site secret.

This is a privacy choice and a security choice. A first-party check does not depend on a third-party score, and it does not upload the form body to someone else. People never pay money. Their browser earns a work pass in the background. Reads stay free.

## Where Attackfee fits

Mark the form, then check the pass in front of your handler. See [How to check writes on your own server](/learn/concepts/how-to-check-writes-on-your-server), [How to check a pass with /v1/siteverify](/learn/concepts/how-to-check-a-pass-with-siteverify), and the [self-hosting docs](/docs/self-hosting).
