---
title: What is Attackfee?
description: Attackfee is write-side security for websites and APIs. It puts a small cost on writes such as comments, signups, logins and write APIs, and leaves reading free.
hub: concepts
slug: what-is-attackfee
type: concept
order: 10
related:
  - /learn
  - /learn/concepts
  - /learn/concepts/how-attackfee-works
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/what-is-a-write-pass
  - /learn/limits/what-attackfee-is-not-for
  - /learn/concepts/what-attackfee-is-for
  - /docs
audience: both
status: published
schema: WebPage
faq:
  - q: "Do people have to pay or solve anything?"
    a: "No. People never pay money, and there is nothing to solve. Their browser does a short background check while they read or type."
  - q: "Are page views gated?"
    a: "No. Page views, docs, and other reads stay free unless you deliberately mark a route otherwise. The WordPress plugin and the edge worker never gate a GET."
  - q: "Does Attackfee identify bots?"
    a: "No. It prices the action. It does not score the caller or say whether the caller is a person or a program."
  - q: "Can an automated client pay instead of doing the work?"
    a: "On attackfee.dev, yes, over HTTP 402. Current prices are at /v1/price. A self-hosted issuer uses a stub backend by default. Attackfee does not pay site owners out, and this page does not describe a payout to the site owner."
  - q: "Where do I try it?"
    a: "The hosted demo is a contact form protected as a write. Send it from a browser, then call the same endpoint with no pass and you get a 403."
---

# What is Attackfee?

Attackfee is write-side security for websites and APIs. It puts a small cost on the routes that change something, like comments, signups, logins, posted search and write APIs, and leaves reads free.

A visitor's browser covers that cost with a short burst of background work and gets a pass that covers 20 actions for 15 minutes. People never pay money and have nothing to solve. An automated client does the same work, or, on attackfee.dev, can pay per write over HTTP 402 instead. Checks run on the site owner's server. Attackfee does not identify the caller, does not block crawlers, and does not filter network floods.

## The problem it addresses

Most of a public site is meant to be read. Pages, docs, and GET APIs can be cached and crawled. Agents reading that half is how people find you.

The write half is smaller and more expensive for you. A comment is a row in a database and a minute of moderation. A signup is an account to review. A login attempt can lock someone out. A posted search query can call a paid backend. On many sites those routes cost the sender nothing, so volume is cheap for the sender and expensive for you.

Attackfee changes the price of the write half and leaves the read half alone.

## What it is not

It does not tell you whether a caller is a person. There is no score and no verdict about identity. It does not stop a funded attacker who is willing to keep paying the cost, in work or in money. It does not replace your host's defenses against network floods.

The packages are not on a public package registry yet. You install them from a clone of the project, or you upload the WordPress plugin zip from the [download page](/download).

## Where Attackfee fits

If you run a public site or API with comments, forms, logins, posted search, or write endpoints, you mark those routes and check each write on your own server. Reading, including this page, stays free.

See [How does Attackfee work?](/learn/concepts/how-attackfee-works) for the steps, and the [docs](/docs) to install it.
