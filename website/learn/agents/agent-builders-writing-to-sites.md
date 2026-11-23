---
title: For agent builders who need to write
description: If you are building an agent that writes to a public site, you can read for free, then follow the well-known file and present a pass. There is no allow list, including for your own scripts.
hub: agents
slug: agent-builders-writing-to-sites
type: use-case
order: 90
related:
  - /learn
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/agent-sdk
  - /learn/agents/an-agent-that-pays-for-one-write
  - /docs/agent
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Do I need a pass to read the docs?"
    a: "No. GET requests, docs, and the well-known files stay free."
  - q: "How do I get a 402 instead of a 403?"
    a: "Send the Attackfee-Client: agent header when you write."
  - q: "Is the agent package on a public registry?"
    a: "No. Install @attackfee/agent from a clone, after npm install and npm run build, by path."
  - q: "Can I skip the cost because I own the site?"
    a: "No. There is no allow list. Your own script uses the same work or payment path as any other client."
  - q: "Does every site take payment?"
    a: "No. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. You can always do the work."
---

# For agent builders who need to write

If you are building an agent that writes to a public site, Attackfee leaves the read half free and asks for a pass on the write. You do not need a special partnership or an allow list.

Send `Attackfee-Client: agent` on the write. Read `/.well-known/attackfee.json` and `/v1/price` first. Without a valid pass you get a 402, with a `challenge_url` for the work and a price when payments are on. Present the pass as `Authorization: Attackfee <pass>`. A paid pass, when that path is on, covers one write and lasts at most 60 seconds.

The `@attackfee/agent` package does the work and retries once. It is not on a public package registry yet. A runnable payment example lives in the project's examples directory; the package does not pay a 402 offer by itself.

Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default. Always do the work if payment is not actually offered as live.

## Where Attackfee fits

See [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site) and [An agent that pays for one write](/learn/agents/an-agent-that-pays-for-one-write). The install path is in the [agent docs](/docs/agent) and [agent calls](/docs/ask).
