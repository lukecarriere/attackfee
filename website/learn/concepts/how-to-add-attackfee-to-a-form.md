---
title: How to add Attackfee to a form
description: Serve attackfee.js from your origin and mark the form with data-attackfee. The script earns a pass in the background. You still have to check the pass on the server.
hub: concepts
slug: how-to-add-attackfee-to-a-form
type: how-to
order: 50
related:
  - /learn
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/concepts/what-is-a-write-pass
  - /learn/concepts/attackfee-js-widget
  - /learn/write-surfaces/contact-forms
  - /docs/widget
  - /docs/quick-start
audience: owners
status: published
schema: WebPage
faq:
  - q: "Do I have to add a widget to the layout?"
    a: "No. There is no box in the page by default. The script runs in the background."
  - q: "Can I host the script on a CDN I do not control?"
    a: "You should not. The script should come from your own origin so the pass stays first-party."
  - q: "What if I have several forms on one page?"
    a: "Mark each one with the class that matches the server check. One script start covers all of them."
  - q: "Does the script need a site key from a third party?"
    a: "No. It talks to your own issuer."
  - q: "Will the form work without JavaScript?"
    a: "No. The browser path needs JavaScript. Include the noscript line so that is obvious."
---

# How to add Attackfee to a form

Serve `attackfee.js` from your own origin and mark the form with `data-attackfee`. The script earns a pass in the background while someone reads or types, then attaches it to the post. You still have to check that pass on the server. The packages are not on a public package registry yet, so install from a clone, or use the WordPress plugin zip.

## The markup

On a Node site that already serves the issuer:

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

Use `search`, `write`, `account`, or `admin` as the value, matching the class you will check on the server. The script looks up every form that has the attribute.

Serve the script from your own origin, as the [widget docs](/docs/widget) describe. Do not load it from a host you do not control. The check is first-party.

The script never reads or sends the fields people type into the form. The usual work is PBKDF2-SHA-256. If it would take more than 8 seconds, the page can show a "Verify before sending" button instead of waiting. That button is off by default.

The browser path needs JavaScript. If scripts are off, the form should not pretend it will post. The noscript line above is the copy the project uses.

## After the form is marked

The page script is not enough. A write without a server check will still go through. Continue with [How to check writes on your own server](/learn/concepts/how-to-check-writes-on-your-server). The [quick start](/docs/quick-start) has the install commands.

On WordPress, you do not add this script by hand for the built-in forms. The plugin does that. For a theme form, add `data-attackfee="write"` and call `attackfee_wp_verify_request('write')` before handling the post.

## Where Attackfee fits

This is the person-facing half of the setup. Automated clients do not use the page script. They call `/v1` or pay over HTTP 402. See [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
