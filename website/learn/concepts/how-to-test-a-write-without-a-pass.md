---
title: How to test a write without a pass
description: How to confirm a protected write is refused when no pass is sent. On the hosted demo, a browser-style POST gets 403, and a POST with Attackfee-Client: agent gets 402.
hub: concepts
slug: how-to-test-a-write-without-a-pass
type: how-to
order: 250
related:
  - /learn
  - /learn/concepts/try-the-demo
  - /learn/concepts/what-happens-without-a-pass
  - /demo
  - /docs/agent
audience: owners
status: published
schema: WebPage
faq:
  - q: "Which URL should I post to?"
    a: "On the hosted demo, POST /demo/contact. On the local demo, POST /contact. On your own site, the route you marked as a write."
  - q: "What should a missing pass return?"
    a: "403 and attackfee_required for a browser-style request. 402 for a request that sends Attackfee-Client: agent."
  - q: "What if I get 503?"
    a: "That means the pass store is down, not that the pass was merely missing. Protected writes fail closed."
  - q: "Does this test payments?"
    a: "No. It tests the refusal when no pass is present. A valid payment path, when it is on, is a separate step after the 402."
---

# How to test a write without a pass

Send a write with no pass and confirm that it is refused. Nothing should be stored. This is the check you want after you mark a route.

On the hosted [demo](/demo), the contact form posts to `/demo/contact`. Send that route without a cookie, hidden field, or `Authorization` header:

```sh
curl -sS -D - -o /dev/null -X POST https://attackfee.dev/demo/contact -d "message=hi"
```

Expect HTTP 403. Then send the same post as an agent:

```sh
curl -sS -D - -o /dev/null -X POST https://attackfee.dev/demo/contact -d "message=hi" \
  -H "Attackfee-Client: agent"
```

Expect HTTP 402. You can inspect the body for a `challenge_url` and, when payments are on, a price. Do not hardcode the dollar figure.

On your own site, post to the route you marked, the same way. If you get 200 and the write is stored, the server check is missing. If you get 503, the store is down and the issuer is failing closed, which is a different case.

The exact contact path on a local demo is the form you start with `npm run demo`. Use that origin instead of the hosted one when you are testing a clone.

## Where Attackfee fits

See [What happens if a write has no pass?](/learn/concepts/what-happens-without-a-pass) and [Walk through the hosted demo](/learn/concepts/try-the-demo).
