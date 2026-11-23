---
title: WordPress and WooCommerce gaps
description: Classic WooCommerce checkout is an option in the Attackfee plugin. The newer block checkout is not covered. XML-RPC and application passwords are not covered either. Page views stay free.
hub: wordpress
slug: woocommerce-and-wordpress-gaps
type: edge-case
order: 40
related:
  - /learn
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/limits/what-attackfee-is-not-for
  - /docs/wordpress
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is classic checkout on by default?"
    a: "No. It is an option under Settings, then Attackfee, and is off until you turn it on."
  - q: "Does the plugin take payment at checkout?"
    a: "No. The plugin takes no payments itself. It only checks that the write has a valid pass."
  - q: "Can I mark a checkout form the plugin does not wrap?"
    a: "You can mark a theme form and call attackfee_wp_verify_request in the handler. That does not extend coverage to the block checkout, XML-RPC, or application passwords."
  - q: "Are these gaps going to be described as available?"
    a: "No. They are not covered today. Do not describe them as available."
---

# WordPress and WooCommerce gaps

The Attackfee WordPress plugin does not cover every way something can be posted on a WordPress site. Classic WooCommerce checkout is an option you can turn on. The newer WooCommerce block checkout is not covered today. XML-RPC and application passwords are not covered either.

Those limits are part of the current plugin, not something to paper over. If your checkout uses the block-based flow, Attackfee will not check that write for you today. Keep whatever other defenses you already use on the routes the plugin does not wrap.

For a theme form the plugin does not already wrap, you can add `data-attackfee="write"` and call `attackfee_wp_verify_request('write')` before handling the post. That is for ordinary theme forms. It does not add block checkout, XML-RPC, or application password coverage.

The plugin never gates a GET. It takes no payments itself.

## Where Attackfee fits

See [What the WordPress plugin covers, and what it does not](/learn/wordpress/wordpress-what-is-covered) and [What Attackfee is not for](/learn/limits/what-attackfee-is-not-for).
