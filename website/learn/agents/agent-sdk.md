---
title: How to use the Attackfee agent SDK
description: The @attackfee/agent package is a client for automated callers. It sends Attackfee-Client: agent, does the work, and retries once. It is not on a public package registry yet.
hub: agents
slug: agent-sdk
type: how-to
order: 30
related:
  - /learn
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/mcp-server
  - /docs/agent
  - /docs/ask
  - /demo
audience: agents
status: published
schema: WebPage
faq:
  - q: "Does the package pay a 402 offer by itself?"
    a: "No. It does the work and retries once. A runnable payment example lives in the project's examples directory."
  - q: "Is it on a public package registry?"
    a: "No. Install it from a clone, after npm install and npm run build, by path."
  - q: "How do I point it at WordPress?"
    a: "Set issuer to the site's /wp-json/attackfee origin. The plugin is the issuer on that site."
  - q: "What is result.via?"
    a: "work when the client did the work and retried, and none when the first response was already final."
  - q: "Should browsers use this package?"
    a: "No. Browsers use the page script from @attackfee/widget."
---

# How to use the Attackfee agent SDK

`@attackfee/agent` is the client for automated callers. Version 0.1.0 in the repo. The package is not on a public package registry yet. From a clone, run `npm install` and `npm run build`, then install the package by path.

Every request sends `Attackfee-Client: agent`. When a write needs a pass, the client does the work and retries once. An automated client can instead pay the offer in an HTTP 402; that path is a separate example in the repo, not something the package does by itself.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/agent
```

```js
import { createAgent } from "@attackfee/agent";

const agent = createAgent({ base: "http://127.0.0.1:8787" });
const result = await agent.fetch("/contact", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: "hi" }),
});
```

`result.response` is the final response. `result.via` is `work` when the client did the work, and `none` when the first response was already final.

`solveWork`, also exported from this package, runs a challenge payload in Node. Browsers use `@attackfee/widget` instead.

For a WordPress site, set `issuer` to the site's `/wp-json/attackfee` origin. The [agent docs](/docs/agent) describe the routes the client calls. The hosted [demo](/demo) checks writes only.

## Where Attackfee fits

Use this when you are writing an automated client against a site that already has Attackfee on it. For the steps without a package, see [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
