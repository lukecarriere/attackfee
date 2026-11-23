---
title: What happens when JavaScript is off
description: The browser path needs JavaScript. A form marked for Attackfee shows the line This form needs JavaScript. An automated client can still write by doing the work or paying, without a page script.
hub: limits
slug: javascript-disabled-browsers
type: edge-case
order: 60
related:
  - /learn
  - /learn/limits
  - /learn/concepts/attackfee-js-widget
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/agents/how-agents-write-to-an-attackfee-site
audience: both
status: published
schema: WebPage
faq:
  - q: "Is there a no-JavaScript browser fallback?"
    a: "Not today. The official noscript line is: This form needs JavaScript."
  - q: "Can an agent write without JavaScript?"
    a: "Yes. The agent path uses the Attackfee-Client: agent header, the /v1 API, and a pass. It does not need the page script."
  - q: "Does this affect reading the site?"
    a: "No. Reads stay free and do not need the script."
  - q: "What if I turn on the visible button?"
    a: "That button still runs in the page script. It does not create a path for browsers with JavaScript turned off."
---

# What happens when JavaScript is off

The browser path needs JavaScript. If the page script cannot run, a form marked for Attackfee cannot earn a work pass in the background. The official line in a `noscript` block is: "This form needs JavaScript."

There is no no-JavaScript browser fallback today. Do not invent one in your copy, and do not expect the visible "Verify before sending" button to appear: that button also runs in the page script.

This limit does not affect reading. Docs, pages, and other GET requests stay free and do not need the script.

An automated client does not use the page script. It sends `Attackfee-Client: agent`, does the work or pays when that path is on, and presents a pass as `Authorization: Attackfee <pass>`.

## Where Attackfee fits

Keep the noscript line on every marked form. See [What does attackfee.js do?](/learn/concepts/attackfee-js-widget) and [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site).
