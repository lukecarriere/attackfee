---
title: What happens if the pass store is down?
description: If the store that tracks used challenges and passes is unavailable, protected writes return 503 and are not accepted. Reads stay available. Attackfee does not fail open.
hub: limits
slug: fail-closed-behavior
type: concept
order: 10
related:
  - /learn
  - /learn/limits
  - /learn/limits/what-attackfee-is-not-for
  - /learn/concepts/what-happens-without-a-pass
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "Why 503 instead of letting the write through?"
    a: "Failing open would leave a protected route priced at zero for as long as the store is down."
  - q: "Are page views affected?"
    a: "No. Reads stay available. The 503 applies to protected writes and to redeem."
  - q: "Is this the same as a missing pass?"
    a: "No. A missing or invalid pass is 403 for a browser, or 402 for an agent. A down store is 503."
  - q: "Does the packaged middleware follow this rule?"
    a: "Yes. If the issuer cannot reach its store, protected writes should get a 503."
  - q: "Should I add my own fallback that accepts the post?"
    a: "No. That would undo the fail-closed rule."
---

# What happens if the pass store is down?

If the store that tracks used challenges and pass uses is unavailable, redeem and protected writes return 503. The write is not accepted. Attackfee does not fail open.

Reads stay available. A missing pass on a healthy issuer is a different case: a browser gets 403, and an agent gets 402. A 503 means the issuer cannot check, so it refuses the write rather than guess.

This is a limit you should plan for, the same way you plan for a database outage on the route itself. It is not a flood filter, and it is not a verdict about the caller.

## Where Attackfee fits

Keep the fail-closed behavior. See [What happens if a write has no pass?](/learn/concepts/what-happens-without-a-pass) and [What Attackfee is not for](/learn/limits/what-attackfee-is-not-for).
