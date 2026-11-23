---
title: How to check whether a pass is still good
description: GET /v1/status with Authorization: Attackfee and the pass. The call does not spend a use. The response field n is the uses left. On WordPress the same route lives under /wp-json/attackfee/v1/.
hub: concepts
slug: how-to-check-whether-a-pass-is-still-good
type: how-to
order: 370
related:
  - /learn/concepts/how-long-a-pass-lasts
  - /learn/concepts/how-a-pass-is-presented
  - /learn/concepts/two-requests-cannot-share-a-pass-use
  - /learn/payments/v1-redeem-endpoint
  - /learn/agents/an-agent-checks-a-pass-before-writing
  - /docs/ask
  - /docs/server
audience: agents
status: published
schema: WebPage
faq:
  - q: "Does calling /v1/status spend a pass use?"
    a: "No. It reports whether the pass is still good. n is the uses left."
  - q: "How do I send the pass?"
    a: "Send Authorization: Attackfee and the pass, as a header on the GET."
  - q: "What is the WordPress URL?"
    a: "The same route lives under /wp-json/attackfee/v1/status on a site that uses the plugin."
  - q: "Can I use a status check instead of checking the write?"
    a: "No. Status does not spend a use and does not replace the check on the write itself."
---

# How to check whether a pass is still good

To ask whether a pass is still good, without spending a use, send `GET /v1/status` with `Authorization: Attackfee <pass>`. The official agent-calls table says this call does not spend a use, and that `n` is the uses left. Use it to inspect a pass you already hold. It is not a substitute for checking the write itself.

On WordPress the same route lives under `/wp-json/attackfee/v1/`. The endpoint is part of the shared `/v1` API on the Node issuer too. A work pass covers 20 actions for 15 minutes. A paid pass is one write and at most 60 seconds. If the pass has expired or its uses are gone, get a new one: do the work, or, when payments are on, redeem a live offer.

People never use this path. People never pay money. Their browser earns a work pass and presents it on the form.

## Where Attackfee fits

Hold a pass, inspect it if you need to, then present it on the write. See [How long does an Attackfee pass last?](/learn/concepts/how-long-a-pass-lasts), [How a pass is presented](/learn/concepts/how-a-pass-is-presented), and the [agent calls](/docs/ask) table.
