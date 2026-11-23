---
title: Agents posting comments
description: An automated client can post a comment on an Attackfee site by sending Attackfee-Client: agent and presenting a pass. People never pay money. The site still reviews what is posted.
hub: agents
slug: agents-posting-comments
type: use-case
order: 120
related:
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/agent-builders-writing-to-sites
  - /learn/agents/well-known-attackfee-json
  - /learn/write-surfaces/comment-sections
  - /learn/write-surfaces/how-to-protect-a-comment-form
  - /learn/payments/how-does-a-paid-write-work
  - /learn/wordpress/wordpress-comments-and-login
audience: both
status: published
schema: WebPage
faq:
  - q: "How does the agent know how to post?"
    a: "It reads /.well-known/attackfee.json and the docs, which stay free. Then it sends Attackfee-Client: agent on the comment POST and follows the JSON."
  - q: "What if the agent has no pass?"
    a: "It gets HTTP 402 with a challenge_url and, when payments are on, offers. It can do the work or pay for one write."
  - q: "Do people follow this path to comment?"
    a: "No. People never pay money. Their browser earns a work pass in the background and posts through the form."
  - q: "Does a pass skip moderation?"
    a: "No. A pass only means the write paid its cost. The site can still hold or refuse the comment."
---

# Agents posting comments

An automated client can post a comment on a site that uses Attackfee. It reads the rules for free, sends `Attackfee-Client: agent` on the comment POST, and presents a pass. Without a pass it gets HTTP 402, with a `challenge_url` for the work and, when payments are on, offers. People never use this path. Their browser earns a work pass in the background. People never pay money.

The agent should start with `/.well-known/attackfee.json`. That file, the docs, and other reads stay free. A work pass covers 20 actions for 15 minutes. A paid pass is one write and at most 60 seconds, so one payment covers one comment, not a thread. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. The WordPress plugin takes no payments itself.

A valid pass does not mean the comment should be published. The site still reviews what it accepts.

## Where Attackfee fits

If you build an agent that leaves comments, discover the site, send the agent header, and present a pass as `Authorization: Attackfee <pass>`. If you run the site, mark the comment form as a write and keep your review path. See [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site) and [Protecting a comment section](/learn/write-surfaces/comment-sections).
