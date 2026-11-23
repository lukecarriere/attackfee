---
title: How to turn on WordPress registration and lost-password coverage
description: Registration and lost password are options in the Attackfee WordPress plugin. They are off by default. Turn them on under Settings, Attackfee. Comments and login are already covered.
hub: wordpress
slug: how-to-turn-on-wordpress-registration-and-lost-password
type: how-to
order: 90
related:
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/write-surfaces/signup-and-registration
  - /learn/write-surfaces/login-and-password-reset
  - /learn/wordpress/wordpress-test-mode-is-work-only
  - /docs/wordpress
  - /download
audience: owners
status: published
schema: WebPage
faq:
  - q: "Are registration and lost password on after a fresh install?"
    a: "No. Comments and the login form are on by default. Open Settings, Attackfee and turn on the options you need."
  - q: "Do people pay money to register or reset a password?"
    a: "No. People never pay money. The plugin takes no payments itself. Test mode is work only."
  - q: "Does this cover a custom theme signup form?"
    a: "No. A theme form still needs data-attackfee and attackfee_wp_verify_request."
  - q: "Is the plugin on wordpress.org?"
    a: "No. Install it from the official zip on the download page."
---

# How to turn on WordPress registration and lost-password coverage

Install the Attackfee WordPress plugin from the official zip on the [download page](/download), then open Settings, Attackfee and turn on registration, lost password, or both. Those options are off by default. Comments and the login form are already on. The plugin requires WordPress 6.5 and PHP 8.1. It is not listed on wordpress.org. Exact install steps also live in the [WordPress docs](/docs/wordpress).

After an option is on, that form is checked for a pass. People never pay money. The plugin takes no payments itself. Test mode is work only. An automated client that sends `Attackfee-Client: agent` gets JSON on the wp-login.php forms when those options are on. Page views stay free. The plugin never gates a GET.

A signup or reset form that lives in your theme is not covered by these options. Mark that form yourself and check the post in PHP.

## Where Attackfee fits

Use these options when your sign-up or reset flow is the standard WordPress form. For the broader case, see [Protecting signup and registration](/learn/write-surfaces/signup-and-registration) and [Protecting login and password reset](/learn/write-surfaces/login-and-password-reset).
