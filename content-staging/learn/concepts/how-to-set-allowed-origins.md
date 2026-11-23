---
title: How to set allowed origins
description: allowed_origins is the list of origins that may call the Node issuer from a browser. The default is the issuer public URL. Other origins do not get CORS headers.
hub: concepts
slug: how-to-set-allowed-origins
type: how-to
order: 450
related:
  - /learn/concepts/what-attackfee-yaml-configures
  - /learn/concepts/node-server-and-express
  - /learn/concepts/how-a-pass-is-presented
  - /learn/concepts/attackfee-js-widget
  - /learn/concepts/self-hosting-attackfee
  - /docs/server
  - /docs/widget
audience: owners
status: published
schema: WebPage
faq:
  - q: "What is the default?"
    a: "The origin of issuer_public_url. If you leave allowed_origins out, only that origin is listed."
  - q: "What does a listed origin get?"
    a: "When the request has a matching Origin header, the issuer sets Access-Control-Allow-Origin to that origin, allows credentials, and varies on Origin."
  - q: "Should I load the widget from another host?"
    a: "No. Serve attackfee.js from your own origin so the check stays first-party."
  - q: "Does this replace the secret?"
    a: "No. allowed_origins is only the browser CORS list. The issuer secret stays in the environment."
---

# How to set allowed origins

`allowed_origins` in `attackfee.yaml` is the list of origins that may call the Node issuer from a browser. If you leave the key out, it defaults to the origin of `issuer_public_url`. The example file lists `http://localhost:8787` to match its issuer URL.

When a request includes an `Origin` header that is on that list, the issuer sets `Access-Control-Allow-Origin` to that origin, sets `Access-Control-Allow-Credentials` to `true`, and adds `Vary: Origin`. An origin that is not on the list does not get those headers.

This list does not replace serving `attackfee.js` from your own origin. The page script should come from the site the person is on, so the check stays first-party. `allowed_origins` is for the issuer's CORS reply, not for loading the script from a host you do not control. People never pay money. Reads stay free.

## Where Attackfee fits

Set this when the issuer origin and the site origin need to be listed explicitly. See [What attackfee.yaml configures](/learn/concepts/what-attackfee-yaml-configures), the [server docs](/docs/server), and [How a pass is presented](/learn/concepts/how-a-pass-is-presented).
