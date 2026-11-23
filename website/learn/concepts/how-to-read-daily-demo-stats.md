---
title: How to read the public demo stats
description: The public demo publishes plain counts of accepted and rejected sends, with no personal data, at /demo/stats and /demo/stats/daily. Test sends are counted separately. Do not treat the totals as a traffic report.
hub: concepts
slug: how-to-read-daily-demo-stats
type: how-to
order: 290
related:
  - /learn
  - /demo
  - /learn/concepts/try-the-demo
  - /learn/concepts/how-to-run-the-local-demo
  - /privacy
audience: both
status: published
schema: WebPage
faq:
  - q: "Do the stats include names or messages?"
    a: "No. They are plain counts with no personal data."
  - q: "Why are test sends separate?"
    a: "The product privacy statement says our own test sends are counted separately, so they are not mixed into the public totals without a label."
  - q: "Can I cache a number from this page?"
    a: "No. The totals change. This page does not quote them."
  - q: "Are these URLs in the sitemap?"
    a: "They are public GET endpoints on the live demo. This library points at them rather than at a quoted snapshot."
---

# How to read the public demo stats

The public Attackfee demo publishes plain counts, with no personal data, at `/demo/stats` and `/demo/stats/daily`. Anyone can read those totals. The daily endpoint covers accepted and rejected sends, paid writes, free writes, settled amounts, and HTTP 402 offers, with test sends counted separately.

This page does not quote the current totals, because they change and are not a traffic report for a customer site. They only describe the public demo.

`/demo/stats` is a short summary of accepted sends, rejected sends, and reversals. `/demo/stats/daily` has the fuller counts, broken out by UTC day. Neither endpoint identifies a caller or includes form field values. The product privacy statement is at [/privacy](/privacy).

The local demo can expose the same style of counts on its own origin when you run `npm run demo`. Use that only as a local check, not as a public report.

## Where Attackfee fits

See [Walk through the hosted demo](/learn/concepts/try-the-demo) and the hosted [demo](/demo) itself.
