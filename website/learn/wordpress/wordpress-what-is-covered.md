---
title: What the WordPress plugin covers, and what it does not
description: Comments and the login form are on by default. Registration, lost password, classic WooCommerce checkout, and Contact Form 7 are options. Block checkout, XML-RPC, and application passwords are not covered. Page views stay free.
hub: wordpress
slug: wordpress-what-is-covered
type: concept
order: 20
related:
  - /learn
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /docs/wordpress
  - /download
  - /learn/write-surfaces/how-to-protect-a-comment-form
  - /learn/wordpress/wordpress-comments-and-login
  - /learn/wordpress/woocommerce-and-wordpress-gaps
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is registration on by default?"
    a: "No. Comments and login are on by default. Registration and lost password are options on Settings, then Attackfee."
  - q: "Does it cover WooCommerce block checkout?"
    a: "No. Classic checkout is an option. The newer block checkout is not covered."
  - q: "Are application passwords or XML-RPC covered?"
    a: "No."
  - q: "Can a theme form be covered?"
    a: "Yes, if you mark the form and call attackfee_wp_verify_request in the handler. Built-in options do not wrap every theme form automatically."
  - q: "Does it gate page views?"
    a: "No. The plugin never gates a GET."
---

# What the WordPress plugin covers, and what it does not

The Attackfee WordPress plugin covers comments and the `wp-login.php` form by default. Page views stay free. It never gates a GET.

Options on Settings, then Attackfee, off until you turn them on:

- Registration
- Lost password
- Classic WooCommerce checkout
- Contact Form 7

Not covered:

- The newer WooCommerce block checkout
- XML-RPC
- Application passwords

For a theme form the plugin does not already wrap, add `data-attackfee="write"` and call `attackfee_wp_verify_request('write')` before handling the post. The issuer lives under `/wp-json/attackfee/v1/`.

The plugin takes no payments itself. Test mode is work only. It is not listed on wordpress.org. Install the official zip from the [download page](/download).

## Where Attackfee fits

Use the defaults for comments and login, then turn on only the options you need. Exact install steps are in [How to install the Attackfee WordPress plugin](/learn/wordpress/how-to-install-the-wordpress-plugin) and the [WordPress docs](/docs/wordpress).
