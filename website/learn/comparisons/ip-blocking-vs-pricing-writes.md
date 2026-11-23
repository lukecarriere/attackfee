---
title: IP blocking compared with pricing writes
description: Attackfee does not block by network address. It prices the write after the request has reached your server. A block list and a price do different jobs, and one does not replace the other.
hub: comparisons
slug: ip-blocking-vs-pricing-writes
type: comparison
order: 30
related:
  - /learn
  - /learn/comparisons
  - /learn/limits/network-floods-vs-request-pricing
  - /learn/comparisons/rate-limiting-vs-pricing-writes
  - /learn/limits/no-bot-score
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does Attackfee build a block list for me?"
    a: "No. It does not block by network address, and it does not identify the caller."
  - q: "Why is there a per-address challenge cap?"
    a: "The issuer caps challenges at 60 per minute per network address to protect its own CPU. That is not a general block list."
  - q: "Should I drop my existing IP blocks?"
    a: "No. Keep the flood defense and blocks your host already provides. Pricing a write is a different layer."
  - q: "Does a new address pay more?"
    a: "No. A new address and a known one are treated the same. The cost is on the action."
  - q: "Will pricing writes stop a flood from many addresses?"
    a: "No. A flood is still a host problem. Attackfee only prices a finished write request."
---

# IP blocking compared with pricing writes

Attackfee does not block by network address. It prices the write after the request has reached your server. A block list drops traffic from an address it already suspects. A price lets any caller through if they pay the cost, in work or in money, and it does not depend on knowing who they are.

Those jobs do not replace each other. Shared addresses, mobile networks, and new callers all make a block list a blunt tool on a public form. Pricing the action avoids that guess, but it also does nothing to a flood that never becomes a finished write.

The issuer does cap challenge minting at 60 requests per minute per network address, to protect its own CPU. That is not a block list, and it is not the product pitch.

Keep the flood defense and any blocks your host already provides. Use Attackfee on the write surfaces you want to price.

## Where Attackfee fits

See [Why Attackfee does not stop network floods](/learn/limits/network-floods-vs-request-pricing) and [Rate limiting compared with pricing writes](/learn/comparisons/rate-limiting-vs-pricing-writes).
