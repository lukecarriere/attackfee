---
title: How to solve a work challenge in Node
description: solveWork, exported from @attackfee/agent, runs a challenge payload in Node. Browsers use the page script instead. After a solution, redeem it at /v1/redeem.
hub: agents
slug: how-to-solve-a-work-challenge-in-node
type: how-to
order: 35
related:
  - /learn/agents/agent-sdk
  - /learn/payments/how-to-request-a-work-challenge
  - /learn/payments/v1-redeem-endpoint
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /docs/agent
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Should a browser call solveWork?"
    a: "No. Browsers use the page script from @attackfee/widget."
  - q: "Where is the function exported?"
    a: "From @attackfee/agent, and also from the work adapter package in the repo. The agent docs point at the agent package export."
  - q: "What do I do with the result?"
    a: "Send the solution to POST /v1/redeem with the challenge id and the challenge. Redeem returns a pass."
  - q: "What if it cannot finish?"
    a: "The function can return null if it does not produce a solution. Request a new challenge if you still need a pass."
---

# How to solve a work challenge in Node

`solveWork`, exported from `@attackfee/agent`, runs a challenge payload in Node. Use it when you are writing an automated client and you want to do the work yourself, instead of relying on `createAgent` to do that step. Browsers should not call it. They use `@attackfee/widget`.

The package is not on a public package registry yet. From a clone, run `npm install` and `npm run build`, then install `@attackfee/agent` by path. Pass the challenge payload you received from `GET /v1/challenge`. You can also pass an optional timeout in milliseconds. If the function cannot produce a solution, it returns null. Request a new challenge if you still need a pass.

Then `POST /v1/redeem` with `challenge_id`, `challenge`, and `solution`. That returns a work pass. A work pass covers 20 actions for 15 minutes, unless the site changed that. `createAgent` already does this work and retries once, so you only need `solveWork` when you are driving the steps yourself. People never pay money.

## Where Attackfee fits

This is the Node solver for the work path. See [How to use the Attackfee agent SDK](/learn/agents/agent-sdk), [How to request a work challenge](/learn/payments/how-to-request-a-work-challenge), and the [agent docs](/docs/agent).
