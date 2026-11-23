---
title: When to turn on memory-hard work
description: Attackfee's usual work is a short PBKDF2-SHA-256 check. An optional memory-hard mode uses Argon2id. It is off by default because it is heavier on phones and costs the issuer more to mint.
hub: concepts
slug: memory-hard-mode
type: how-to
order: 100
related:
  - /learn
  - /learn/concepts/how-attackfee-works
  - /learn/limits/funded-attackers
  - /docs/server
  - /docs/self-hosting
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is memory-hard mode on by default?"
    a: "No. The default is standard mode, which browsers can run in WebCrypto."
  - q: "Why is it off?"
    a: "It is heavier on phones, and minting each challenge costs the issuer more than standard mode. The project treats it as opt-in for sites under GPU pressure."
  - q: "Does the 8 second cap still apply?"
    a: "Yes. If work would run past 8 seconds, the page can show a Verify before sending button instead of waiting."
  - q: "Will this stop a funded attacker?"
    a: "No. It makes the work more expensive to grind, but Attackfee does not claim to stop someone who is willing to keep paying that cost."
  - q: "Has a real phone been measured in this mode?"
    a: "No real phone has been measured. The project has desktop and emulated phone-like figures only."
---

# When to turn on memory-hard work

Attackfee's usual work is a PBKDF2-SHA-256 partial-hash search that browsers can run in WebCrypto. An optional memory-hard mode switches that work to Argon2id. It is off by default.

Turn it on only if you are under GPU pressure and you accept a heavier check on phones. The project's policy notes that this mode should stay opt-in, not become the default. Minting a challenge in this mode costs the issuer more than the standard path. If the work would run past 8 seconds, the page can show a "Verify before sending" button instead of waiting.

Memory-hard work does not change the pass itself: a work pass is still 20 actions for 15 minutes. It does not stop a funded attacker, and it does not replace flood defense at the network layer.

## Where Attackfee fits

Leave the default on for most sites. If you do turn this mode on, measure how it feels on the phones your visitors actually use. See [How does Attackfee work?](/learn/concepts/how-attackfee-works) and [What a funded attacker can still do](/learn/limits/funded-attackers).
