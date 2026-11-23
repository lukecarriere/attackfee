---
title: How to protect a login form from automated stuffing
description: Mark login as an account route so each attempt needs a pass. People still sign in as usual, with nothing to solve. A script has to keep earning passes. This does not identify the caller.
hub: write-surfaces
slug: how-to-protect-a-login-form
type: how-to
order: 30
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/write-surfaces/how-to-protect-signup-and-account-routes
  - /learn/write-surfaces/login-and-password-reset
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /docs/wordpress
audience: owners
status: published
schema: WebPage
faq:
  - q: "Will this lock out a person who types the wrong password?"
    a: "A work pass covers 20 actions for 15 minutes. A person retrying a password is usually inside that window. Attackfee does not itself lock the account. Your application still decides what happens after a failed password."
  - q: "Does this replace rate limiting on /login?"
    a: "No. Keep rate limits if you have them. See Rate limiting compared with pricing writes. Attackfee also limits new challenges per network address, 60 a minute by default, to protect the issuer."
  - q: "Is lost-password included by default?"
    a: "On WordPress, no. It is an option on the settings screen. On your own server, mark that route as account if you want it covered."
  - q: "Are WordPress application passwords covered?"
    a: "No. The plugin does not cover application passwords or XML-RPC."
  - q: "Does a successful login tell Attackfee who the user is?"
    a: "No. The pass is checked and the request proceeds. Attackfee does not identify the caller."
---

# How to protect a login form from automated stuffing

Mark the login route as account. Each attempt then needs a valid pass. A person signs in as usual, with the check running in the background. A script that tries many passwords has to earn a new pass every 20 actions. Attackfee does not identify the caller, and it does not replace multi-factor sign-in.

## Why login is heavier than a comment

A failed login can lock an account or pollute your logs. The account class is 8x work, twice a write. A work pass earned for login also covers search and write actions for the rest of its life.

Attackfee still does not claim to stop a funded attacker. Proof of work is cheap on rented GPUs. It makes every try cost something and makes volume slower. Keep your usual account defenses.

## On WordPress

The plugin covers the `wp-login.php` form by default. Upload the zip from the [download page](/download) and leave login on under Settings, then Attackfee. Lost password is a separate option on that screen, off until you turn it on. Application passwords and XML-RPC are not covered.

## On your own site

Map the login route, and the password-reset route if you have one, to the account class. Add `data-attackfee="account"` on the form, or mark the route in your server config, and check the pass before you authenticate. In Node, use middleware with `action: "account"`. Leave the login page itself as a free GET.

## Where Attackfee fits

Use this as a cost on the attempt, alongside rate limits and whatever sign-in checks you already run. It is not a verdict that the caller is a person.
