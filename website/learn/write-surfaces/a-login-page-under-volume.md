---
title: A login page under volume
description: Example. A generic public login page facing automated volume, using only Attackfee's public product numbers. Not a customer story, and not a report of a real incident.
hub: write-surfaces
slug: a-login-page-under-volume
type: example
order: 190
related:
  - /learn
  - /learn/write-surfaces/login-and-password-reset
  - /learn/write-surfaces/how-to-protect-a-login-form
  - /learn/concepts/volume-should-cost-volume
  - /learn/limits/funded-attackers
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is this a real incident?"
    a: "No. It is a worked example. It does not name a site, quote a person, or invent a traffic number."
  - q: "Which numbers on this page are real?"
    a: "Only the public product defaults: a work pass covers 20 actions for 15 minutes, and login is an account-class write at 8x."
  - q: "Does a pass replace my account lockout?"
    a: "No. The pass only says the write paid its cost. Your own lockout and rate limits still apply."
  - q: "Will this stop a funded attacker?"
    a: "No. Someone willing to keep paying the cost can still get through."
---

# A login page under volume

Example. This is not a customer story, and it is not a report of a real incident. It describes a generic public login page, and it uses only the public product numbers already on the Attackfee homepage.

Imagine a login form that is free to post. An automated client can submit password after password, or request reset after reset, at the cost of a single HTTP request. The page is still there to read. The cost is in the account handler, in locked accounts, and in review time.

Now imagine the same form with Attackfee on the post, in the account class. A person who is actually logging in earns a work pass in the background. That pass covers 20 actions for 15 minutes. Volume that keeps going has to earn another pass, or pay when that path is on. The login page itself stays free to read.

This does not replace a lockout or a rate limit on the handler, and it does not stop a funded attacker. It changes the price of leaving the form open to unattended volume.

## Where Attackfee fits

See [Protecting login and password reset](/learn/write-surfaces/login-and-password-reset) and [Volume should cost volume](/learn/concepts/volume-should-cost-volume).
