---
title: Protecting a comment section
description: A public comment box is a write surface. Mark the post, let the page script earn a pass, and check it before you store the comment. Reading the thread stays free, including on a static page that posts to your own server.
hub: write-surfaces
slug: comment-sections
type: use-case
order: 100
related:
  - /learn
  - /learn/write-surfaces/how-to-protect-a-comment-form
  - /learn/write-surfaces/a-comment-thread-overnight
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/concepts/how-to-add-attackfee-to-a-form
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does this moderate comment text?"
    a: "No. Attackfee checks the pass, not the body. Your own moderation still applies after a pass is accepted."
  - q: "Can I use this on a static site?"
    a: "You can put attackfee.js on a static HTML page and mark the form. The post still has to hit a server you control that checks the pass. There is no hosted comment service in Attackfee today."
  - q: "Is this on by default in WordPress?"
    a: "Yes. The plugin covers comments by default. Page views stay free."
  - q: "Is the hosted demo a comment thread?"
    a: "No. It is a contact form. The local demo includes a comment thread."
---

# Protecting a comment section

A public comment box is a write surface. Each accepted post is storage and review time. Mark the comment route as a write, let the page script earn a pass in the background, and refuse a post that has no valid pass. People still read the thread for free.

On WordPress, the official plugin covers comments by default. On your own site, serve `attackfee.js` from your origin, mark the form with `data-attackfee="write"`, and check the pass before you store the comment.

That same pattern works on a static HTML page. The script and the form can live in static files. The post still has to go to a server you run, such as the Node issuer or a small handler that verifies the pass. Attackfee does not provide a hosted comment service today.

Exact markup is in [How to protect a comment form from bots](/learn/write-surfaces/how-to-protect-a-comment-form) and [How to add Attackfee to a form](/learn/concepts/how-to-add-attackfee-to-a-form).

## Where Attackfee fits

This is an ordinary write: 4x work, with one work pass covering 20 actions for 15 minutes. An illustration of the same surface is in [A comment thread overnight](/learn/write-surfaces/a-comment-thread-overnight).
