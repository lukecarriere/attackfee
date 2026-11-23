---
title: How to protect a comment form from bots
description: Mark the comment route as a write, let the page script earn a pass in the background, and refuse a post that has no valid pass. Reading the thread stays free.
hub: write-surfaces
slug: how-to-protect-a-comment-form
type: how-to
order: 10
related:
  - /learn
  - /learn/concepts/what-is-a-write-surface
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/write-surfaces/comment-sections
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /docs/quick-start
  - /docs/wordpress
audience: owners
status: published
schema: WebPage
faq:
  - q: "Will readers have to click anything to comment?"
    a: "No. The check runs in the background while they read or type. There is nothing to solve."
  - q: "Does this moderate the text of a comment?"
    a: "No. Attackfee checks that the post has a valid pass. It does not read the comment body to decide what the comment says. Your own moderation still applies after a pass is accepted."
  - q: "Can I leave comments readable by agents?"
    a: "Yes. Reading the thread is a GET. Attackfee does not charge for that."
  - q: "What if someone posts 20 comments in a row?"
    a: "A work pass covers 20 actions for 15 minutes, so a person who is actually in the thread is covered. A script that continues past that has to earn another pass."
  - q: "Is the hosted demo a comment form?"
    a: "No. The hosted demo is a contact form protected as a write. Use the local demo if you want a comment thread to try."
---

# How to protect a comment form from bots

Mark the comment post as a write, let a visitor's browser earn a pass in the background, and refuse a comment that arrives with no valid pass. People still read the thread for free. Volume has to keep earning passes.

## Why comment forms take the hit

A public comment box is easy to post to and costly to clean up. Each accepted post is storage and moderation time. If posting costs the sender nothing, a script can fill the queue faster than a person can read it.

Attackfee does not try to guess who is writing. It puts a small cost on the post itself.

## On WordPress

The Attackfee plugin covers comments by default. Upload the zip from the [download page](/download), open Settings, then Attackfee, and leave comments on. Page views stay free. The plugin is the issuer: it checks the post on your own site. See [How to install the Attackfee WordPress plugin](/learn/wordpress/how-to-install-the-wordpress-plugin) and the [WordPress docs](/docs/wordpress).

## On your own site

- Serve `attackfee.js` from your own origin and mark the form with `data-attackfee="write"`.
- On the server, check the pass before you store the comment. In Node, use the server middleware on the comment route as a write. In PHP, verify the pass or, on a WordPress theme form, call `attackfee_wp_verify_request('write')` before handling the post.
- Leave the thread itself, and every GET, as a free read.

The [quick start](/docs/quick-start) shows the form markup and the Node install from a clone. The packages are not on a public package registry yet.

The hosted demo is a contact form, not a comment thread. A comment thread is included in the local demo, started with `npm run demo`.

## Where Attackfee fits

This is the default write class: 4x work, and one work pass still covers 20 actions for 15 minutes. An automated client can send `Attackfee-Client: agent` and do the same work, or, on attackfee.dev, pay per write over HTTP 402.
