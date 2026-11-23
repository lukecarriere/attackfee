---
title: What is a write surface?
description: A write surface is a route that changes something on your site, such as a comment form, a signup, a login, a posted search query, or a write API. Reads are not write surfaces.
hub: concepts
slug: what-is-a-write-surface
type: concept
order: 30
related:
  - /learn
  - /docs/quick-start
  - /demo
  - /learn/concepts/what-is-attackfee
  - /learn/write-surfaces/how-to-protect-a-comment-form
  - /learn/write-surfaces/what-is-write-surface-abuse
  - /learn/write-surfaces/how-to-protect-a-write-api
audience: both
status: published
schema: WebPage
faq:
  - q: "Is a search box really a write?"
    a: "If the query is sent as a GET that only reads a local index, you may choose to leave it as a read. If the query is posted, or if each query calls a paid backend, treat it as a search-class write. Attackfee's search class exists for that case."
  - q: "Are docs a write surface?"
    a: "No. Documentation should stay a free read, including for agents and crawlers."
  - q: "What about webhooks or admin tools?"
    a: "Admin actions can use the admin class, which asks for the most work. Only mark routes you intend to protect. Leave internal routes that are already authenticated the way you already protect them, or mark them if they are reachable without that."
  - q: "Does the hosted demo include every write surface?"
    a: "No. The hosted demo has one contact form, protected as a write. A comment thread and a posted search box ship in the local demo."
  - q: "Can I gate a page view?"
    a: "The Node server refuses a config that gates page views unless a separate setting confirms you meant it. The edge worker and the WordPress plugin never gate a GET. The product is built so that reading stays free."
---

# What is a write surface?

A write surface is a route that changes something on your site, or that costs you something real to run, when a client sends a request. A comment form, a signup form, a login page, a search box that posts its query, and a write endpoint in an API are write surfaces. A page view is not.

A visitor's browser can earn a pass that covers 20 actions for 15 minutes. A write without a valid pass is refused: a browser gets a 403, and a client that sends `Attackfee-Client: agent` gets a 402. Reading this page, the [docs](/docs/quick-start), and the [demo](/demo) page itself stays free.

## Why the distinction matters

A site has two halves. The read half serves pages, docs, and API responses. It is built to be cached and crawled. An agent reading it is how people find you.

The write half is small and expensive for you. Each request can create a row, send mail, call a paid search backend, or lock an account. If those routes cost the sender nothing, volume is cheap for the sender.

Calling that half a write surface is Attackfee's own name for this split. It is not a formal standard. The useful test is practical: does this request change state, create work for you, or bill you per call? If it does, treat it as a write.

## Common write surfaces

- Comment forms and other public posts.
- Contact forms.
- Signup and registration.
- Login and password reset.
- A search box that sends its query as a form post.
- Write APIs, and any POST, PUT, PATCH, or DELETE you have not mapped.

A GET, HEAD, or OPTIONS request is a read by default. If you have a GET that changes something, that is an unusual design. Attackfee will not treat it as a write unless you mark the route that way, and some deployments never gate a GET. Prefer a real write method for anything that changes state.

## How Attackfee classes them

You assign a class when you mark the route:

- Search, for a posted search query. 1x work.
- Write, for comments, contact forms, votes, and other posts. 4x work. Any unmapped POST counts as a write.
- Account, for signup, login, and password reset. 8x work.
- Admin, for staff actions. 16x work.

A heavier pass covers the lighter classes.

## Where Attackfee fits

Mark the write surfaces and leave the rest open. The hosted [demo](/demo) protects one contact form as a write. The local demo, started with `npm run demo`, also has a comment thread and a search box that posts its query.
