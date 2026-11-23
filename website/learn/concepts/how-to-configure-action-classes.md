---
title: How to choose action classes
description: Assign each protected route a class: search 1x, write 4x, account 8x, or admin 16x. Map the prefixes in the issuer config, mark forms with the same class, and leave GET requests as free reads.
hub: concepts
slug: how-to-configure-action-classes
type: how-to
order: 270
related:
  - /learn
  - /learn/concepts/action-classes
  - /learn/concepts/how-to-mark-routes
  - /learn/concepts/how-to-check-writes-on-your-server
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "What if I pick the wrong class?"
    a: "The relative cost will be too low or too high for the route. You can change the mapping. Keep the form attribute and the server class the same."
  - q: "What should I use for a contact form?"
    a: "Write, the 4x class, unless the form also creates an account."
  - q: "What should I use for posted search?"
    a: "Search, the 1x class."
  - q: "Do I have to set a dollar price per class?"
    a: "No. You choose the class. On attackfee.dev, look at /v1/price for the current amount. A self-hosted server uses a stub backend by default."
  - q: "Does a heavier pass cover a lighter class?"
    a: "Yes, until that pass ends."
---

# How to choose action classes

Pick a class that matches what the route costs you, then use that class in both the issuer config and the form attribute. Search is 1x, write is 4x, account is 8x, and admin is 16x. A heavier pass covers the lighter classes until it ends.

- Search, for a search box that posts its query.
- Write, for comments, contact forms, waitlists, and other ordinary posts. An unmapped POST counts as a write.
- Account, for signup, login, and password reset.
- Admin, for staff actions that should cost the most work.

In a Node config, start with a read prefix for `/`, then the prefixes you want to protect:

```yaml
routes:
  - { prefix: "/", class: read }
  - { prefix: "/search", class: search }
  - { prefix: "/contact", class: write }
  - { prefix: "/login", class: account }
```

On the page, use the same class in `data-attackfee`. The server check is what counts. Leave GET, HEAD, and OPTIONS unmarked. Do not turn on the confirm setting that allows gating page views.

On attackfee.dev, each class also has a published price at `/v1/price`. Do not hardcode the dollar figure. A self-hosted server uses a stub backend by default.

## Where Attackfee fits

See [What are Attackfee action classes?](/learn/concepts/action-classes) and [How to mark which routes are writes](/learn/concepts/how-to-mark-routes).
