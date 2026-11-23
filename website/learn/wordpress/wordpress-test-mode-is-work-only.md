---
title: WordPress test mode is work only
description: The Attackfee WordPress plugin takes no payments itself. Test mode is work only. People never pay money. Automated clients get a work challenge, not a live payment offer, unless you configure a payment server.
hub: wordpress
slug: wordpress-test-mode-is-work-only
type: edge-case
order: 80
related:
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/payments/why-a-paid-path-exists
  - /learn/payments/how-does-a-paid-write-work
  - /docs/wordpress
  - /download
  - /learn/wordpress/protecting-contact-form-7
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does the plugin take payments itself?"
    a: "No. The plugin takes no payments itself. Test mode is work only."
  - q: "Do visitors pay money in test mode?"
    a: "No. People never pay money, in test mode or otherwise. Their browser earns a work pass in the background."
  - q: "What does an automated client get in test mode?"
    a: "A work-only 403 with a challenge, not a live 402 offer. A 402 appears only when usage payouts are on, a payment server is chosen, and an address is set."
  - q: "Can I test a live 402 against the plugin's test mode?"
    a: "No. Use a configured payment server for that path, or inspect a live 402 on the hosted demo. A self-hosted server uses a stub backend by default."
---

# WordPress test mode is work only

The Attackfee WordPress plugin takes no payments itself. Test mode is work only. People never pay money. Their browser earns a work pass in the background, the same way it does on any other Attackfee form. Use test mode when you want to confirm that comments, login, or another covered form refuse a write that has no pass, without involving a payment server.

An automated client that sends `Attackfee-Client: agent` still gets JSON. In test mode, and whenever usage payouts are off, no payment server is chosen, or no address is set, that JSON is a work-only 403 with a challenge, not a live 402. A 402 appears only when those payment settings are on. A self-hosted Node server uses a stub backend by default. The hosted demo on attackfee.dev is the place to inspect a live 402.

Page views stay free. The plugin never gates a GET.

## Where Attackfee fits

Install the plugin from the [download page](/download), leave test mode on until you have a reason to configure a payment server, and check a write without a pass. See [How to install the Attackfee WordPress plugin](/learn/wordpress/how-to-install-the-wordpress-plugin) and [Why a paid path exists alongside background work](/learn/payments/why-a-paid-path-exists).
