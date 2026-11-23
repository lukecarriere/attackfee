---
title: Protecting signup and registration
description: A signup form creates an account, so it is an account-class write. Mark the route, let the page script earn a pass, and check the pass before you create the account. Page views stay free.
hub: write-surfaces
slug: signup-and-registration
type: use-case
order: 130
related:
  - /learn
  - /learn/write-surfaces/how-to-protect-signup-and-account-routes
  - /learn/concepts/action-classes
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/concepts/how-to-add-attackfee-to-a-form
audience: owners
status: published
schema: WebPage
faq:
  - q: "Which class should I use?"
    a: "Account, the 8x class, for signup, and usually for login and password reset as well."
  - q: "Is registration on by default in the WordPress plugin?"
    a: "No. Comments and login are on by default. Registration and lost password are options you turn on."
  - q: "Does a signup pass also cover a later comment?"
    a: "Yes, for the rest of that work pass. A heavier class covers the lighter ones until the pass ends."
  - q: "Do new users pay money?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# Protecting signup and registration

A signup form creates an account, so it is a write in the account class, which is 8x the unit cost. Mark the route, let the page script earn a pass in the background, and check the pass before you create the account. The signup page itself stays free to read.

On WordPress, registration is an option under Settings, then Attackfee, and is off until you turn it on. On your own site, use `data-attackfee="account"` and check that class on the server.

A work pass earned for account also covers lighter classes, such as write or search, for the rest of its life: 20 actions or 15 minutes. An automated client that keeps opening accounts has to keep earning or paying.

Exact route steps are in [How to protect signup and account routes](/learn/write-surfaces/how-to-protect-signup-and-account-routes).

## Where Attackfee fits

Use this on registration, and pair it with login and password reset if those are public. See [What are Attackfee action classes?](/learn/concepts/action-classes).
