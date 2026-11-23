---
title: How the Attackfee MCP server works
description: The @attackfee/mcp package is a local MCP server with three write tools. It reads a site's well-known file, calls only that site's /v1 API, and stores no data about the caller.
hub: agents
slug: mcp-server
type: concept
order: 40
related:
  - /learn
  - /learn/agents/agent-sdk
  - /learn/agents/well-known-attackfee-json
  - /docs/mcp
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Does the MCP server run on attackfee.dev?"
    a: "No. It runs locally, on stdin and stdout. It is not a hosted service."
  - q: "What tools does it expose?"
    a: "price_write_action, gate_form_write, and verify_write_pass. Page views need no call."
  - q: "Does it identify the caller?"
    a: "No. The tools do not say whether the caller is a person or a program. Nothing about the caller is sent or kept."
  - q: "Can it call a site I did not name?"
    a: "No. Each tool takes a site origin. The server reads that origin's well-known file and calls that origin only."
  - q: "Is it on a public package registry?"
    a: "No. Install it from a clone."
---

# How the Attackfee MCP server works

`@attackfee/mcp` is a local MCP server for Attackfee's three write tools. Version 0.1.0. It speaks JSON-RPC on stdin and stdout, one message per line. It calls a site's existing `/v1` API and runs no network service of its own. The package is not on a public package registry yet.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/mcp
```

```
# From a clone, after npm install && npm run build:
node packages/mcp/src/server.ts
```

## Tools

- `price_write_action` returns the current check for one write, and the work alternative.
- `gate_form_write` asks the site for a one-use pass for one write.
- `verify_write_pass` is for the site's own server: it checks a pass.

Each tool takes a `site` argument, an origin such as the site you are writing to. The server reads that origin's `/.well-known/attackfee.json` and calls that origin only. Nothing about the caller is sent or kept. Page views need no call. The tools do not say whether the caller is a person or a program.

Counters are per UTC day, with no ids, and are written to stderr, in test mode only.

## Where Attackfee fits

Use this when a local agent tool needs to price a write or obtain a pass against a site that already has Attackfee on it. See the [MCP docs](/docs/mcp) and [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json).
