---
title: How to turn on Contact Form 7 coverage
description: Install the Attackfee WordPress plugin from the official zip, then turn on the Contact Form 7 option under Settings, Attackfee. Comments and login are already on. The plugin takes no payments itself.
hub: wordpress
slug: how-to-turn-on-contact-form-7-coverage
type: how-to
order: 70
related:
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/wordpress/protecting-contact-form-7
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/write-surfaces/contact-forms
  - /docs/wordpress
  - /download
  - /learn/wordpress/wordpress-theme-forms-the-plugin-does-not-wrap
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is the plugin on wordpress.org?"
    a: "No. Install it from the official zip on the download page."
  - q: "Is Contact Form 7 on after a fresh install?"
    a: "No. Comments and the login form are on by default. Open Settings, Attackfee and turn on Contact Form 7."
  - q: "Do people pay to send a Contact Form 7 message?"
    a: "No. People never pay money. The plugin takes no payments itself. Test mode is work only."
  - q: "Will this cover a form in my theme?"
    a: "No. A theme form still needs data-attackfee and attackfee_wp_verify_request."
---

# How to turn on Contact Form 7 coverage

Install the Attackfee WordPress plugin from the official zip on the [download page](/download), then open Settings, Attackfee and turn on Contact Form 7. That option is off by default. Comments and the login form are already on. The plugin is not listed on wordpress.org. Exact install steps also live in the [WordPress docs](/docs/wordpress).

The plugin requires WordPress 6.5 and PHP 8.1. After the option is on, Contact Form 7 posts are checked for a pass. The pass is used only after Contact Form 7's own checks pass, so a rejected try can be submitted again with the same pass. No mail is sent without a valid pass. People never pay money. The plugin takes no payments itself. Test mode is work only.

An automated client that sends `Attackfee-Client: agent` gets JSON on those forms. If usage payouts are on, a payment server is chosen, and an address is set, that can be HTTP 402. Otherwise the client gets a work-only 403. Page views stay free.

A form in a theme is not covered by this option. Mark that form yourself.

## Where Attackfee fits

Use this when your contact form is Contact Form 7. For the broader contact-form case, see [Protecting a contact form](/learn/write-surfaces/contact-forms). For a theme form, see [WordPress theme forms the plugin does not wrap](/learn/wordpress/wordpress-theme-forms-the-plugin-does-not-wrap).
