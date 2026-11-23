---
title: Why self-hosted installs use a stub backend
description: A self-hosted Node issuer uses a stub backend by default. Real payments are a separate, configured path, on for the attackfee.dev worker, not the default for your copy.
hub: concepts
slug: why-self-hosted-installs-use-a-stub-backend
type: intention
order: 470
related:
  - /learn/concepts/self-hosting-attackfee
  - /learn/concepts/what-attackfee-yaml-configures
  - /learn/payments/why-a-paid-path-exists
  - /learn/wordpress/wordpress-test-mode-is-work-only
  - /learn/payments/what-kinds-of-payment-can-an-agent-use
  - /docs/self-hosting
  - /docs/server
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does my copy take real payments when I first run it?"
    a: "No. A self-hosted issuer uses a stub backend by default. Work-only is the usual local setup."
  - q: "Is attackfee.dev the same as my copy?"
    a: "No. Payments are on for the attackfee.dev worker. That is a separate, configured path, not the default for your copy."
  - q: "What does the WordPress plugin take?"
    a: "The plugin takes no payments itself. Test mode is work only."
  - q: "Can I turn payments on later?"
    a: "Only if you turn that path on yourself and wire a real backend. Until then, the work path remains available."
---

# Why self-hosted installs use a stub backend

A self-hosted Node issuer uses a stub backend by default. That is deliberate. Your copy should be safe to run locally for work checks without assuming a live payment path. The example Express config sets `settlement.enabled` to false. This build accepts only the stub backend in `attackfee.yaml`.

Payments are on for the attackfee.dev worker. That is a separate, configured path, not the default for your copy. The WordPress plugin takes no payments itself, and test mode is work only. People never pay money. Their browser earns a work pass in the background. Automated clients can still do the work on a self-hosted install. They should not assume every site offers a live payment method.

If you later want a live payment path, you turn that on yourself and wire a real backend. Until then, work remains available. Reads stay free.

## Where Attackfee fits

This default keeps local and self-hosted setups work-only until you choose otherwise. See [How to self-host Attackfee](/learn/concepts/self-hosting-attackfee), [What attackfee.yaml configures](/learn/concepts/what-attackfee-yaml-configures), and [Why a paid path exists alongside background work](/learn/payments/why-a-paid-path-exists).
