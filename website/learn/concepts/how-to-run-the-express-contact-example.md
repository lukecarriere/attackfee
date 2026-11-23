---
title: How to run the Express contact example
description: The repo ships one protected Express contact form. Page views stay free. A post without a pass gets 403. Payments are off in that example.
hub: concepts
slug: how-to-run-the-express-contact-example
type: how-to
order: 440
related:
  - /learn/concepts/node-server-and-express
  - /learn/concepts/how-to-test-a-write-without-a-pass
  - /learn/concepts/how-to-add-attackfee-to-a-form
  - /learn/write-surfaces/contact-forms
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /docs/server
  - /docs/quick-start
audience: owners
status: published
schema: WebPage
faq:
  - q: "Does this example take payment?"
    a: "No. Payments are off in the example config. A self-hosted issuer uses a stub backend by default."
  - q: "What happens if I post with no pass?"
    a: "You get 403 and attackfee_required. If you also send Attackfee-Client: agent, you get JSON with a work challenge."
  - q: "Which route is protected?"
    a: "POST /contact is checked as a write. The / route is a free read."
  - q: "Where does the secret come from?"
    a: "The ATTACKFEE_SECRET environment variable. It must be at least 16 characters."
---

# How to run the Express contact example

The repo ships a runnable Express example at `examples/express-contact`. It is one protected contact form. Page views stay free. A post without a pass gets `403`. Payments are off in that example.

From the example directory, set a secret of at least 16 characters, install, and start the server:

```sh
export ATTACKFEE_SECRET="any-string-of-16-or-more-characters"
npm install
npm start
```

Open `http://localhost:8787` and send the form. It goes through. Then try a post the way a script would:

```sh
curl -i -X POST http://localhost:8787/contact -d "message=hi"
```

You get `403` and `attackfee_required`. Add `-H "Attackfee-Client: agent"` and you get JSON with a work challenge.

The example config maps `/` to `read` and `/contact` to `write`. The server loads that file, serves the `/v1` API and the widget with `Attackfee.router()`, and checks `POST /contact` with `Attackfee.middleware(attackfee, { action: "write" })`. The listen port is 8787, or `PORT` if you set it. People never pay money.

## Where Attackfee fits

This is the smallest Node recipe in the repo. For the general middleware setup, see [How to run the Node server and Express middleware](/learn/concepts/node-server-and-express) and the [server docs](/docs/server). To test a write without a pass on any install, see [How to test a write without a pass](/learn/concepts/how-to-test-a-write-without-a-pass).
