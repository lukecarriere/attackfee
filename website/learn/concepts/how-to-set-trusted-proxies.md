---
title: How to set trusted proxies
description: If Attackfee sits behind a reverse proxy, list that proxy in ATTACKFEE_TRUSTED_PROXIES. Attackfee does not read the framework's proxy setting, including Express trust proxy.
hub: concepts
slug: how-to-set-trusted-proxies
type: how-to
order: 390
related:
  - /learn/limits/what-a-429-on-a-challenge-means
  - /learn/limits/network-floods-vs-request-pricing
  - /learn/concepts/node-server-and-express
  - /learn/concepts/self-hosting-attackfee
  - /learn/wordpress/wordpress-what-is-covered
  - /docs/server
  - /docs/self-hosting
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does Attackfee honor Express trust proxy?"
    a: "No. List the proxy in the ATTACKFEE_TRUSTED_PROXIES environment variable. Attackfee does not read the framework's proxy setting."
  - q: "What goes in that variable?"
    a: "Comma-separated addresses and ranges for the proxies that sit in front of the issuer."
  - q: "How do I set this on WordPress?"
    a: "List the proxies in wp-config.php as ATTACKFEE_TRUSTED_PROXIES. There is no settings field for it on the Attackfee screen."
  - q: "Does the challenge rate limit use the forwarded address on WordPress?"
    a: "No. On the WordPress plugin, the challenge rate limit always uses REMOTE_ADDR."
---

# How to set trusted proxies

If your Attackfee issuer sits behind a reverse proxy, list that proxy explicitly. On Node, set the `ATTACKFEE_TRUSTED_PROXIES` environment variable to a comma-separated list of addresses and ranges. Attackfee does not read the framework's proxy setting. It does not honor Express `trust proxy`. If you only set the framework flag and leave this variable empty, Attackfee will not treat the proxy as trusted.

On WordPress, define `ATTACKFEE_TRUSTED_PROXIES` in `wp-config.php`, as a comma-separated list of addresses and CIDR ranges. There is no field for this on the Settings, Attackfee screen. For requests that actually come from a listed proxy, the plugin may read `X-Forwarded-For` from the right, skip listed proxies, and use the first other entry as the visitor network for load pricing. If that entry is missing or not a plain address, no network is sent and the visitor gets the base price. It does not fall back to `REMOTE_ADDR` or to an entry further left. The challenge rate limit always uses `REMOTE_ADDR`.

Get this right if you care about challenge rate limits or load pricing behind a proxy. Get it wrong, and the issuer may see every visitor as the proxy. People never pay money. Reads stay free.

## Where Attackfee fits

Set the list when a proxy terminates TLS or forwards traffic to the issuer. See the [server docs](/docs/server), [What a 429 on a challenge means](/learn/limits/what-a-429-on-a-challenge-means), and [How to run the Node server and Express middleware](/learn/concepts/node-server-and-express).
