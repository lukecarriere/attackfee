---
title: WordPress theme forms the plugin does not wrap
description: The plugin does not automatically cover a form that lives in your theme. Add data-attackfee to that form and check the post with attackfee_wp_verify_request before you handle it.
hub: wordpress
slug: wordpress-theme-forms-the-plugin-does-not-wrap
type: edge-case
order: 60
related:
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/wordpress/woocommerce-and-wordpress-gaps
  - /learn/wordpress/protecting-contact-form-7
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/how-to-check-writes-on-your-server
  - /docs/wordpress
  - /download
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does turning on Contact Form 7 also cover a theme form?"
    a: "No. Contact Form 7 is its own option. A form in a theme still needs the attribute and a PHP check."
  - q: "What attribute do I add?"
    a: "Add data-attackfee=\"write\" on the form. The attribute is always on: add it to protect that form."
  - q: "How do I check the post?"
    a: "Call attackfee_wp_verify_request('write') before you handle it. The first value is true when the pass is good."
  - q: "Are comments and login already covered?"
    a: "Yes. Comments and the login form are on by default. You do not mark those by hand."
---

# WordPress theme forms the plugin does not wrap

The Attackfee WordPress plugin covers comments and the login form by default. Registration, lost password, classic WooCommerce checkout, and Contact Form 7 are options. A form that lives in your theme is not in that list. The plugin does not wrap it for you. If that form is a write, you add the mark and you check the post yourself.

Add `data-attackfee="write"` on the form. The attribute is always on: add it to protect that form. Before you handle the post, call `attackfee_wp_verify_request('write')`. The first value is true when the pass is good. Include a noscript line, `This form needs JavaScript.`, the same as on any other Attackfee form.

Page views stay free. The plugin never gates a GET. The plugin takes no payments itself. People never pay money. Block checkout, XML-RPC, and application passwords are not covered, and marking a theme form does not change that.

## Where Attackfee fits

Use the plugin's defaults for comments and login, turn on the options you need, and wrap any other theme form by hand. See [What the WordPress plugin covers, and what it does not](/learn/wordpress/wordpress-what-is-covered), [WordPress and WooCommerce gaps](/learn/wordpress/woocommerce-and-wordpress-gaps), and the [WordPress docs](/docs/wordpress).
