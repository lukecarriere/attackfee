---
title: What Attackfee keeps, and what it does not
description: Checks run on your server. Form contents never leave the page through Attackfee. The public Attackfee site has no analytics and no tracking scripts. The pass cookie, when set, is first-party.
hub: limits
slug: what-attackfee-keeps
type: background
order: 120
related:
  - /privacy
  - /learn/concepts/why-checks-run-on-your-server
  - /learn/concepts/how-a-pass-is-presented
  - /learn/concepts/how-to-read-daily-demo-stats
  - /learn/agents/mcp-server
  - /learn/limits/no-bot-score
audience: both
status: published
schema: WebPage
faq:
  - q: "Does the public site use analytics?"
    a: "No. Pages, docs, and downloads are static files. There are no analytics, no ads, and no tracking scripts."
  - q: "Does Attackfee store what I type on the hosted demo?"
    a: "No. What you type is checked and then thrown away. The name, email, and message are not read, stored, or logged."
  - q: "Does the MCP server store data?"
    a: "No. The package runs on your own computer. It stores no data and has no service of its own. It only calls the site you name."
  - q: "Where can I read the official statement?"
    a: "The privacy page is the source for what this site keeps. Product checks on your own install run where you installed them."
---

# What Attackfee keeps, and what it does not

Attackfee is designed so that form contents never leave the page through the product. The check looks at the pass, not at the message. On a typical install, checks run on your server. Nothing is sent to us.

The public site at attackfee.dev states the rest in its [privacy](/privacy) page, which is the source for the facts below. Pages, docs, and downloads are static files. There are no analytics, no ads, and no tracking scripts. The hosted demo checks writes only. What you type is checked and then thrown away. A running demo may keep a short-lived counter keyed by network address so it can rate-limit, and it may keep daily totals of accepted and rejected sends, paid writes, free writes, settled amounts, and HTTP 402 offers. Those totals are plain counts with no personal data, and anyone can read them at `/demo/stats/daily`. Static pages do not set a cookie. A first-party `attackfee_pass` cookie may be set after background work from the same origin. The `@attackfee/mcp` package runs on your own computer and stores no data.

Attackfee does not identify the caller and does not score who you are. People never pay money.

## Where Attackfee fits

Read the [privacy](/privacy) page for this site, and keep checks on your own server for your install. See [Why checks run on your server](/learn/concepts/why-checks-run-on-your-server) and [How to read the public demo stats](/learn/concepts/how-to-read-daily-demo-stats).
