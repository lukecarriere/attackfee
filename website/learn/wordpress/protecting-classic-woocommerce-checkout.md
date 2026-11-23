---
title: Protecting classic WooCommerce checkout
description: Classic WooCommerce checkout is an option in the Attackfee WordPress plugin. The newer block checkout is not covered. The plugin takes no payments itself, and it does not replace the shop's own card charge.
hub: wordpress
slug: protecting-classic-woocommerce-checkout
type: use-case
order: 100
related:
  - /learn/wordpress/woocommerce-and-wordpress-gaps
  - /learn/wordpress/wordpress-what-is-covered
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /learn/wordpress/wordpress-test-mode-is-work-only
  - /docs/wordpress
  - /download
  - /learn/wordpress/wordpress-theme-forms-the-plugin-does-not-wrap
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does this cover the WooCommerce block checkout?"
    a: "No. The option covers the classic checkout only. The newer block checkout is not covered, for people or for automated clients."
  - q: "Do shoppers pay Attackfee at checkout?"
    a: "No. People never pay money to Attackfee. The plugin takes no payments itself. The shop's own payment gateway still charges for the order."
  - q: "When is the Attackfee pass used?"
    a: "Only after the checkout passes WooCommerce field and cart checks. A rejected try can be submitted again with the same pass. A use spent at checkout stays spent if the payment gateway then declines the card."
  - q: "Is this on by default?"
    a: "No. Turn on the WooCommerce checkout option under Settings, Attackfee."
---

# Protecting classic WooCommerce checkout

Classic WooCommerce checkout is an option in the Attackfee WordPress plugin, not a default. If you use the classic checkout and want those posts checked, turn the option on under Settings, Attackfee. The newer block checkout is not covered, for people or for automated clients. Marking a theme form does not change that. The plugin takes no payments itself. People never pay money to Attackfee. The shop's own payment gateway still charges for the order.

When the option is on, the checkout post is checked for a pass. The pass is used only after WooCommerce field and cart checks pass, so a rejected try can be submitted again with the same pass. A use spent at checkout stays spent if the payment gateway then declines the card. No order is created without a valid pass. An automated client that sends `Attackfee-Client: agent` gets JSON on the classic checkout when the option is on. In test mode that is a work-only 403. A 402 appears only when usage payouts are configured.

Page views stay free. The plugin never gates a GET.

## Where Attackfee fits

Use this option only for classic checkout, and keep the gap in mind if you use blocks. See [WordPress and WooCommerce gaps](/learn/wordpress/woocommerce-and-wordpress-gaps) and [What the WordPress plugin covers, and what it does not](/learn/wordpress/wordpress-what-is-covered).
