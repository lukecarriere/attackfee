---
title: What credential stuffing is on a login form
description: Credential stuffing is automated sign-in attempts that try many username and password pairs, often leaked from elsewhere. Attackfee prices the login POST. It does not replace lockouts or a second factor.
hub: write-surfaces
slug: what-credential-stuffing-is-on-a-login-form
type: background
order: 220
related:
  - /learn/write-surfaces/how-to-protect-a-login-form
  - /learn/write-surfaces/login-and-password-reset
  - /learn/write-surfaces/a-login-page-under-volume
  - /learn/write-surfaces/why-writes-cost-the-site-owner
  - /learn/limits/what-attackfee-is-not-for
  - /learn/limits/funded-attackers
  - /learn/wordpress/wordpress-comments-and-login
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does Attackfee know whether a password is right?"
    a: "No. It only checks that the login POST has a valid pass. Your sign-in code still decides whether the credentials work."
  - q: "Will a person on a shared network be blocked?"
    a: "Attackfee does not block by network address. People and programs use the same form. A person is not refused because someone else on the same address is also posting."
  - q: "Does a work pass replace a lockout or a second factor?"
    a: "No. Those remain your account tools. Attackfee prices the write. It does not identify the caller."
  - q: "Do people pay to sign in?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# What credential stuffing is on a login form

Credential stuffing is automated sign-in attempts that try many username and password pairs, often reused from a leak on another site. Each attempt is a POST to your login route. That route already costs you something to run, and a burst of attempts can lock accounts or flood logs. Attackfee treats the login POST as a write. It does not decide whether the password is right, and it does not replace your account lockouts or a second factor.

A visitor's browser earns a work pass in the background, good for 20 actions for 15 minutes. People never pay money. An automated client has to keep earning passes, or, on a site that takes payment, can pay per write. Ten thousand login attempts means earning 500 work passes. A funded operator can still pay that cost. Attackfee does not claim to stop one, and it does not block by network address.

Password reset is also a write when it changes state or sends mail. Reading the login page stays free. Do not gate the GET.

## Where Attackfee fits

Mark the login POST, and the reset POST if you use one, and check them on your own server. Keep the account tools you already rely on. See [How to protect a login form from automated stuffing](/learn/write-surfaces/how-to-protect-a-login-form) and [Protecting login and password reset](/learn/write-surfaces/login-and-password-reset). On WordPress, the login form is covered by default; lost password is an option.
