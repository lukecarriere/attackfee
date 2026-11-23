---
title: How to self-host Attackfee
description: Attackfee runs on your server. Nothing is sent to a hosted Attackfee service. Install the packages from a clone, or upload the WordPress plugin. Page views stay free.
hub: concepts
slug: self-hosting-attackfee
type: how-to
order: 110
related:
  - /learn
  - /docs/self-hosting
  - /docs/server
  - /learn/concepts/node-server-and-express
  - /learn/wordpress/how-to-install-the-wordpress-plugin
  - /download
audience: owners
status: published
schema: WebPage
faq:
  - q: "Do I need a hosted Attackfee worker?"
    a: "No. The packages run on your own server. The worker in the repo is what runs attackfee.dev, and you only need it if you are deploying a copy of that site."
  - q: "Does a self-hosted server take payments by default?"
    a: "No. A self-hosted server uses a stub backend by default. Work-only is the usual local setup."
  - q: "Where does the secret live?"
    a: "In the environment, or a worker secret. It must be at least 16 characters. Do not commit it, and do not print it."
  - q: "Are the packages on a public registry?"
    a: "No. From a clone, run npm install and npm run build, then install each package by path."
  - q: "Does self-hosting gate page views?"
    a: "No, not in the default config. Checks run where you installed them, and reads stay free."
---

# How to self-host Attackfee

Attackfee runs on your server. Nothing about a visitor is sent to a hosted Attackfee service. Page views stay free. Checks run where you installed them.

The packages are not on a public package registry yet. From a clone of the project, run `npm install` and `npm run build`, then install each package by path.

- `@attackfee/widget` is the page script. See the [widget docs](/docs/widget).
- `@attackfee/server` is the Node issuer. See the [server docs](/docs/server).
- `@attackfee/agent` is the automated client. See the [agent docs](/docs/agent).
- `@attackfee/mcp` is the local tool server. See the [MCP docs](/docs/mcp).
- The WordPress plugin is the PHP issuer. See the [WordPress docs](/docs/wordpress) and the [download page](/download).

The issuer `secret` is at least 16 characters. Keep it in the environment. Do not commit it, and do not print it.

A self-hosted Node issuer uses a stub backend by default. You can run work-only. Payments are on for the attackfee.dev worker; that is a separate, configured path, not the default for your copy.

The [self-hosting docs](/docs/self-hosting) also describe the site worker that runs attackfee.dev, if you are deploying a copy of that site rather than only the issuer.

## Where Attackfee fits

Install the issuer on the origin that accepts the write, mark the forms, and leave docs and other reads open. See [How to run the Node server and Express middleware](/learn/concepts/node-server-and-express).
