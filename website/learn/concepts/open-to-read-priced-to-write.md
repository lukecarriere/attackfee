---
title: Open to read, priced to write
description: Attackfee's tagline means page views, docs, and other GET requests stay free, and the routes that change something need a pass. That split is the product, not a setting you have to remember to turn off.
hub: concepts
slug: open-to-read-priced-to-write
type: philosophy
order: 200
related:
  - /learn
  - /learn/concepts/what-is-write-side-security
  - /learn/concepts/why-reads-should-stay-free
  - /learn/concepts/what-attackfee-is-for
  - /docs
audience: both
status: published
schema: WebPage
faq:
  - q: "Are the learning pages and docs free?"
    a: "Yes. This library, the docs, and other GET requests stay free to read."
  - q: "Can I gate page views anyway?"
    a: "You should not. The Node server refuses a config that gates page views unless a confirm setting is on, and you should leave that off. The edge worker and the WordPress plugin never gate a GET."
  - q: "Does priced to write mean people pay money?"
    a: "No. People never pay money. Their browser earns a work pass in the background."
  - q: "Does this block crawlers?"
    a: "No. Crawlers and answer engines can read for free."
---

# Open to read, priced to write

"Open to read. Priced to write." is the Attackfee tagline, and it is the product design. Page views, docs, well-known files, and other GET, HEAD, or OPTIONS requests stay free. Comments, signups, logins, posted search, and write APIs need a pass.

That split is not an optional extra. The Node server will refuse a config that gates page views unless a confirm setting is on, and you should leave that off. The edge worker and the WordPress plugin never gate a GET. Crawlers are not blocked.

Priced to write does not mean people pay money. A visitor's browser earns a work pass in the background. An automated client does the same work, or pays when that path is on. The current price, when you need it, is at `/v1/price`.

## Where Attackfee fits

Keep the site findable. Put the cost on the write surfaces that cost you something to run. See [What is write-side security?](/learn/concepts/what-is-write-side-security) and [Why reading should stay free](/learn/concepts/why-reads-should-stay-free).
