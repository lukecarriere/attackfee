---
title: How to mark which routes are writes
description: Map route prefixes to a class in the issuer config, mark forms with data-attackfee, and check the pass on the server. Leave GET, HEAD, and OPTIONS as free reads.
hub: concepts
slug: how-to-mark-routes
type: how-to
order: 150
related:
  - /learn
  - /learn/concepts/action-classes
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/concepts/how-to-check-writes-on-your-server
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "Do I have to mark every route?"
    a: "No. Mark the ones that change something. Unmapped GET, HEAD, and OPTIONS stay free reads. An unmapped POST counts as a write."
  - q: "What if the form attribute and the server class disagree?"
    a: "The server check is what counts. The attribute tells the page script which class of work to earn. Keep them the same."
  - q: "Can I gate a page view?"
    a: "The product is built so GET stays free. Node will refuse a config that gates page views unless a confirm setting is on, and you should leave that off. The edge worker and the WordPress plugin never gate a GET."
  - q: "How do I mark a posted search box?"
    a: "Use data-attackfee=search on the form, and map that route to the search class on the server."
  - q: "Does marking a route on the page protect it by itself?"
    a: "No. The server still has to check the pass."
---

# How to mark which routes are writes

Map the routes that change something to a class, mark the forms that post to them, and check the pass on the server. Leave ordinary GET, HEAD, and OPTIONS requests unmarked so they stay free reads.

In a Node config, the route list starts with a read prefix for `/`, then the prefixes you want to protect:

```yaml
routes:
  - { prefix: "/", class: read }
  - { prefix: "/search", class: search }
  - { prefix: "/contact", class: write }
  - { prefix: "/login", class: account }
```

On the page, use the same class in `data-attackfee`:

```html
<form method="post" action="/contact" data-attackfee="write">
```

The attribute tells the page script which class of work to earn. The middleware, or `attackfee_wp_verify_request` on WordPress, is what actually refuses a write without a valid pass.

Search is 1x, write is 4x, account is 8x, and admin is 16x. See [What are Attackfee action classes?](/learn/concepts/action-classes) for what each class is for.

## Where Attackfee fits

Mark only the write surfaces. The [server docs](/docs/server) have the full config. For the form itself, see [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form).
