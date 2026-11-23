---
title: Who Attackfee is for
description: Attackfee is for site owners who have public write surfaces, and for people building agents that need to write to those sites. It is not a bot-scoring product, and it has no allow list for your own scripts.
hub: concepts
slug: who-attackfee-is-for
type: intention
order: 230
related:
  - /learn
  - /learn/concepts/what-attackfee-is-for
  - /learn/limits/what-attackfee-is-not-for
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /docs
audience: both
status: published
schema: WebPage
faq:
  - q: "I only have a brochure site with no forms. Do I need this?"
    a: "Not until you add a write surface. Pages that are only read stay free, and there is nothing to mark."
  - q: "I run WordPress comments and login. Is that in scope?"
    a: "Yes. The plugin covers comments and login by default."
  - q: "I have a script that posts to my own form. Can I exempt it?"
    a: "Not as a special allow list. Your script uses the same work or payment path as any other client. That is the point of pricing the action, not the caller."
  - q: "I am building an agent. Is this for me?"
    a: "Yes, if the agent writes. Read the well-known file, send Attackfee-Client: agent, and do the work or pay when that path is on. Reads stay free."
  - q: "I want something that names bots for me. Is this it?"
    a: "No. Attackfee does not score the caller."
---

# Who Attackfee is for

Attackfee is for site owners who already have public write surfaces, and for people who build agents that need to write to those sites.

If you run comments, contact or waitlist forms, signups, logins, a posted search, or a write API, you can mark those routes and check the pass on your own server. WordPress owners can use the official plugin zip. Node and PHP installs run from a clone; the packages are not on a public package registry yet.

If you are building an agent, you can read the site for free, then follow `/.well-known/attackfee.json` when you write. Your own automation is not a special case. There is no allow list that skips the cost because you wrote the script. A local script you point at your own form does the work, or pays when that path is on, like any other client.

It is not for teams that want a score of who is calling, a crawler block, or a substitute for flood defense.

## Where Attackfee fits

See [What Attackfee is for](/learn/concepts/what-attackfee-is-for) and [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
