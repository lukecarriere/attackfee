---
title: An agent checks a pass before writing
description: Example. An automated client can call GET /v1/status with a pass to see whether it is still good, without spending a use, then present that pass on one write. Not a customer story.
hub: agents
slug: an-agent-checks-a-pass-before-writing
type: example
order: 160
related:
  - /learn/concepts/how-to-check-whether-a-pass-is-still-good
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/an-agent-that-pays-for-one-write
  - /learn/concepts/two-requests-cannot-share-a-pass-use
  - /learn/payments/how-to-request-a-work-challenge
  - /docs/ask
  - /docs/agent
audience: agents
status: published
schema: WebPage
faq:
  - q: "Is this a real customer's agent?"
    a: "No. This is a worked example. It does not invent a product name, a quote, or a dollar amount."
  - q: "Does the status call spend a use?"
    a: "No. GET /v1/status does not spend a use. n is the uses left."
  - q: "Can the agent skip the status call?"
    a: "Yes. The status call is optional. The write still has to present a valid pass, and the server still checks it."
  - q: "Do people follow these steps?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
---

# An agent checks a pass before writing

Example. This is a worked example, not a customer story. It does not invent a product, a quote, or a dollar amount.

Take an automated client that already holds a work pass, perhaps from a challenge it redeemed earlier. Before it posts once, it can send `GET /v1/status` with `Authorization: Attackfee <pass>`. That call does not spend a use. The field `n` is the uses left. If the pass is still good, the client presents the same pass on the write. If the pass has expired or `n` is 0, it requests a new challenge, redeems a new pass, and then writes.

The status call is optional. The site will still refuse a write that has no valid pass. Two requests cannot spend the same last use, so a status check that shows one use left is not a reservation. The write itself spends the use. A paid pass is one write and at most 60 seconds. Payments are on for attackfee.dev. A self-hosted server uses a stub backend by default.

People never pay money. Their browser does not use `/v1/status`.

## Where Attackfee fits

This path is for automated clients that already have a pass. See [How to check whether a pass is still good](/learn/concepts/how-to-check-whether-a-pass-is-still-good), [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site), and [agent calls](/docs/ask).
