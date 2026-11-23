---
title: Protecting Contact Form 7
description: Contact Form 7 is an option in the Attackfee WordPress plugin. Turn it on under Settings, Attackfee. Comments and login stay on by default. The plugin takes no payments itself.
hub: wordpress
slug: protecting-contact-form-7
type: use-case
order: 50
related:
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/wordpress/how-to-turn-on-contact-form-7-coverage
  - /learn/write-surfaces/contact-forms
  - /learn/wordpress/wordpress-comments-and-login
  - /learn/wordpress/woocommerce-and-wordpress-gaps
  - /docs/wordpress
  - /download
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is Contact Form 7 on by default?"
    a: "No. Comments and the login form are on by default. Contact Form 7 is an option on the Settings, Attackfee screen."
  - q: "Do visitors pay money to send a message?"
    a: "No. People never pay money. The plugin takes no payments itself. Test mode is work only."
  - q: "What if the form fails Contact Form 7's own checks?"
    a: "The pass is used only after the form passes those checks, so a rejected try can be submitted again with the same pass."
  - q: "Are theme forms covered when I turn this on?"
    a: "No. A form in a theme still needs data-attackfee and a check with attackfee_wp_verify_request."
---

# Protecting Contact Form 7

Contact Form 7 is an option in the Attackfee WordPress plugin, not a default. Comments and the login form are already on. If you use Contact Form 7 and want those posts checked, turn the option on under Settings, Attackfee. The plugin takes no payments itself. People never pay money. Test mode is work only.

An automated client that sends `Attackfee-Client: agent` gets JSON on Contact Form 7, including AJAX and no-JavaScript submits, when the option is on. If usage payouts are on, a payment server is chosen, and an address is set, that JSON can be an HTTP 402. Otherwise the agent gets a work-only 403 with a challenge. The pass is used only after Contact Form 7's own checks pass, so a rejected try can be submitted again with the same pass. No mail is sent without a valid pass.

Page views stay free. The plugin never gates a GET. The plugin is not listed on wordpress.org. Install it from the official zip on the [download page](/download).

## Where Attackfee fits

Install the plugin, turn on Contact Form 7 coverage, and keep your usual review of inbound mail. Exact steps also live in the [WordPress docs](/docs/wordpress). See [How to turn on Contact Form 7 coverage](/learn/wordpress/how-to-turn-on-contact-form-7-coverage) and [Protecting a contact form](/learn/write-surfaces/contact-forms).
