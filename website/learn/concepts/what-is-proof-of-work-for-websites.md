---
title: What is proof of work for websites?
description: In Attackfee, proof of work is a short background check the client runs to earn a pass for a write. It is not a score of who is calling, and there is nothing to solve in the usual path.
hub: concepts
slug: what-is-proof-of-work-for-websites
type: background
order: 180
related:
  - /learn
  - /learn/concepts/how-attackfee-works
  - /learn/concepts/what-is-a-write-pass
  - /learn/comparisons/proof-of-work-compared-with-interactive-challenges
  - /learn/concepts/memory-hard-mode
audience: both
status: published
schema: WebPage
faq:
  - q: "What does a person have to do?"
    a: "Nothing in the usual path. The page script runs the work in the background while they read or type."
  - q: "What work does Attackfee use?"
    a: "The default is a PBKDF2-SHA-256 partial-hash search that browsers can run in WebCrypto. An optional memory-hard mode uses Argon2id and is off by default."
  - q: "Is this a test of who is a person?"
    a: "No. An automated client can do the same work, or pay when that path is on."
  - q: "How long does the resulting pass last?"
    a: "A work pass covers 20 actions for 15 minutes, whichever comes first."
  - q: "Does proof of work stop a funded attacker?"
    a: "No. Proof of work is cheap on rented GPUs. Attackfee does not claim to stop someone willing to keep paying the cost."
---

# What is proof of work for websites?

In Attackfee, proof of work is a short background check the client runs to earn a pass for a write. A person does not complete a step in the page. The script runs the work while they read or type, then attaches the pass to the post.

The default work is a PBKDF2-SHA-256 partial-hash search, 5,000 iterations per try, that browsers can run in WebCrypto. An optional memory-hard mode switches that work to Argon2id. It is off by default, because it is heavier on phones. A work pass covers 20 actions for 15 minutes. If the work would run past 8 seconds, the page can show a "Verify before sending" button instead of waiting. That button is off unless you turn it on, or unless the cap is hit.

This is not a score of who is calling. An automated client can run the same work in Node with the agent package, or pay when that path is on. Proof of work is cheap on rented GPUs, so a funded attacker can still get through.

## Where Attackfee fits

The work is how a browser, or an agent that chooses not to pay, earns a pass. See [How does Attackfee work?](/learn/concepts/how-attackfee-works) and [Proof of work compared with interactive challenges](/learn/comparisons/proof-of-work-compared-with-interactive-challenges).
