---
title: How to protect signup and account routes
description: Mark signup, registration, and password reset as account routes. On WordPress, registration and lost password are options, not defaults. Login and comments are on by default.
hub: write-surfaces
slug: how-to-protect-signup-and-account-routes
type: how-to
order: 40
related:
  - /learn
  - /learn/write-surfaces/how-to-protect-a-login-form
  - /learn/concepts/what-is-a-write-surface
  - /learn/write-surfaces/signup-and-registration
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /docs/wordpress
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is registration on by default in the WordPress plugin?"
    a: "No. Comments and login are on by default. Registration and lost password are options on the settings screen."
  - q: "Does this stop disposable email signups?"
    a: "No. Attackfee does not inspect the form fields and does not classify addresses. Your own checks still run after a valid pass."
  - q: "Should password reset be account or write?"
    a: "Account. It is 8x work, the same class as login and signup."
  - q: "What about a checkout form?"
    a: "On WordPress, classic WooCommerce checkout is an option. The block checkout is not covered. On your own site, mark the route you actually post to, and check the pass before you create the order."
  - q: "Will signing up cost the visitor money?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# How to protect signup and account routes

Mark signup, registration, and password reset as account routes so each attempt needs a pass. The account class is 8x work. On WordPress, registration and lost password are options you turn on. They are not on by default. Login and comments are.

## Why these routes attract volume

A public registration form can create accounts you then have to review. A password-reset form can trigger mail. If those posts cost the sender nothing, a script can open a lot of them.

Pricing the attempt does not prove the caller is a person, and it does not replace email verification or the other checks you already run.

## On WordPress

Open Settings, then Attackfee, and turn on Registration and, if you want it, Lost password. The plugin covers the usual WordPress registration and lost-password forms when those options are on. It does not invent a registration form if your site has registration disabled.

WooCommerce classic checkout is a separate option. The newer block checkout is not covered.

## On your own site

Map `/signup`, `/register`, `/password-reset`, and similar routes to the account class. Mark the form with `data-attackfee="account"` and check the pass before you create the account or send reset mail. Leave the pages themselves as free reads.

## Where Attackfee fits

Use the account class for routes that create or recover an account. Use write for ordinary forms. See [How to protect a login form from automated stuffing](/learn/write-surfaces/how-to-protect-a-login-form) for login itself.
