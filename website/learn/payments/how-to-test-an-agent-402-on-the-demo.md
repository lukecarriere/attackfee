---
title: How to test an agent 402 on the demo
description: Post to the hosted demo contact route with Attackfee-Client: agent and no pass. You should get HTTP 402 and JSON that includes payment_required, a challenge URL, and offers. People never pay money.
hub: payments
slug: how-to-test-an-agent-402-on-the-demo
type: how-to
order: 90
related:
  - /learn/concepts/how-to-test-a-write-without-a-pass
  - /learn/concepts/try-the-demo
  - /learn/payments/what-is-http-402
  - /learn/payments/how-does-a-paid-write-work
  - /learn/payments/why-http-402-matters-for-automated-clients
  - /learn/payments/v1-price-endpoint
  - /demo
audience: agents
status: published
schema: WebPage
faq:
  - q: "Which URL should I post to?"
    a: "On the hosted demo, POST /demo/contact. A browser-style POST to the same route, with no agent header, gets 403."
  - q: "Should I test a live payment on the local demo?"
    a: "No. The local demo uses a stub backend by default. Use the hosted demo to see a live 402. Current prices are at /v1/price."
  - q: "Do people run this curl?"
    a: "No. People never pay money. Their browser earns a work pass on the demo form."
  - q: "What fields should I look for in the JSON?"
    a: "error set to payment_required, a challenge_url, and offers. Use only methods that /.well-known/attackfee.json lists as live."
---

# How to test an agent 402 on the demo

To see an HTTP 402 from an automated client, post to the hosted demo with the agent header and no pass. The contact form on the [demo](/demo) posts to `/demo/contact`. Payments are on for attackfee.dev, so this is the right place to inspect a live 402. The local demo uses a stub backend by default, so it is the wrong place to test a live payment.

Send this official request:

```sh
curl -sS -D - -o /dev/null -X POST https://attackfee.dev/demo/contact -d "message=hi" \
  -H "Attackfee-Client: agent"
```

You should get HTTP 402 and JSON. Look for `error` set to `payment_required`, a `challenge_url` for the work, and `offers`. Current prices are also at `/v1/price`. Use only methods that `/.well-known/attackfee.json` lists as live. Do not hardcode a dollar figure from the response.

The same route without the agent header, and still with no pass, gets 403:

```sh
curl -sS -D - -o /dev/null -X POST https://attackfee.dev/demo/contact -d "message=hi"
```

People never pay money. Their browser earns a work pass on the form. A paid pass, if you redeem one, is one write and at most 60 seconds.

## Where Attackfee fits

This confirms the agent path. For the refused write without the header, see [How to test a write without a pass](/learn/concepts/how-to-test-a-write-without-a-pass). For what to do with a live offer, see [How does a paid write work?](/learn/payments/how-does-a-paid-write-work).
