---
title: How to install the Attackfee WordPress plugin
description: Download the official zip, upload it in Plugins, then open Settings, then Attackfee. Comments and login are on by default. Page views stay free. The plugin is not listed on wordpress.org.
hub: wordpress
slug: how-to-install-the-wordpress-plugin
type: how-to
order: 10
related:
  - /learn
  - /docs/wordpress
  - /download
  - /learn/write-surfaces/how-to-protect-a-comment-form
  - /learn/write-surfaces/how-to-protect-a-login-form
  - /learn/write-surfaces/how-to-protect-signup-and-account-routes
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is the plugin on wordpress.org?"
    a: "No. Install it from the official zip on the download page."
  - q: "Do I need a payment server to use it?"
    a: "No. The default is work only. People never pay money."
  - q: "Will it block Google from reading my posts?"
    a: "No. It never gates a GET."
  - q: "Can I use it on a form my theme renders?"
    a: "Yes, if you mark the form and call attackfee_wp_verify_request in the handler. The built-in options do not wrap every theme form automatically."
  - q: "The project's README still says the plugin is local only. Is the zip real?"
    a: "Yes. Trust the live download page over that stale README line. The zip and its SHA-256 are published on the download page."
---

# How to install the Attackfee WordPress plugin

Download the official zip from the [download page](/download), upload it under Plugins, then Add Plugin, then Upload Plugin, and open Settings, then Attackfee. Comments and the login form are on by default. Page views stay free. The plugin is not listed on wordpress.org.

## Install

- Get the zip from the [download page](/download). Check the SHA-256 on that page against the file you saved. The published version on 20 Nov 2026 was 0.1.1. If the page shows a newer build, use that one and the hash next to it.
- In WordPress, open Plugins, then Add Plugin, then Upload Plugin, and choose the zip. Activate it.
- Open Settings, then Attackfee. Leave comments and login on unless you have a reason not to.

The plugin is the issuer on your site. It takes no payments itself. Test mode is work only. An optional payment server is a separate piece, off until you add it.

You need WordPress 6.5 or newer and PHP 8.1 or newer, as stated in the plugin header.

## What is covered

On by default:

- Comments
- The `wp-login.php` form

Options on the same settings screen, off until you turn them on:

- Registration
- Lost password
- Classic WooCommerce checkout
- Contact Form 7

Not covered:

- The newer WooCommerce block checkout
- XML-RPC
- Application passwords

For a theme form the plugin does not already wrap, add `data-attackfee="write"` on the form and call `attackfee_wp_verify_request('write')` before you handle the post. The issuer lives under `/wp-json/attackfee/v1/`.

The plugin never gates a GET. Reading stays free, including for agents and crawlers.

## Where Attackfee fits

This is the WordPress install path. The [WordPress docs](/docs/wordpress) have the theme-form example and the option list. If you run Node instead, use the [quick start](/docs/quick-start).
