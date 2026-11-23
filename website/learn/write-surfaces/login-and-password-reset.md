---
title: Protecting login and password reset
description: Login and password reset are account-class writes. Mark the routes, let the page script earn a pass, and check the pass before you accept the post. The login page itself stays free to read.
hub: write-surfaces
slug: login-and-password-reset
type: use-case
order: 180
related:
  - /learn
  - /learn/write-surfaces/how-to-protect-a-login-form
  - /learn/write-surfaces/signup-and-registration
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/write-surfaces/a-login-page-under-volume
audience: owners
status: published
schema: WebPage
faq:
  - q: "Which class should I use?"
    a: "Account, the 8x class, for login and for password reset."
  - q: "Is WordPress login covered by default?"
    a: "Yes. The plugin covers the wp-login.php form by default. Lost password is an option you turn on."
  - q: "Will this block a person who types the wrong password?"
    a: "No. A person earns a work pass in the background. A failed password is still your account logic. The pass only says the write paid its cost."
  - q: "Does this replace a rate limit on login?"
    a: "No. Keep a ceiling if you need one. A valid pass is not a license to flood the handler."
  - q: "Do people pay money to log in?"
    a: "No. People never pay money."
---

# Protecting login and password reset

Login and password reset are writes in the account class, which is 8x the unit cost. Automated volume can try many passwords, or request many resets, as cheaply as it can post a comment if those routes are free. Mark the routes, let the page script earn a pass in the background, and check the pass before you accept the post. The login page itself stays free to read.

On WordPress, the official plugin covers the `wp-login.php` form by default. Lost password is an option under Settings, then Attackfee, and is off until you turn it on. On your own site, use `data-attackfee="account"` and check that class on the server.

A work pass covers 20 actions for 15 minutes, and an account-class pass also covers lighter classes for the rest of its life. A script that keeps going has to earn or pay again. This does not replace your own lockout or rate limit on the account handler.

Exact markup is in [How to protect a login form from automated stuffing](/learn/write-surfaces/how-to-protect-a-login-form). An illustration of volume on this surface is in [A login page under volume](/learn/write-surfaces/a-login-page-under-volume).

## Where Attackfee fits

Use this on public login and reset routes, and pair it with signup if that form is public too. See [Protecting signup and registration](/learn/write-surfaces/signup-and-registration).
