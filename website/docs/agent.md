# Agent SDK

`@attackfee/agent` is the client for automated callers. Version 0.1.0 in this repo; the package is not on npm yet. An automated client can pay per action over HTTP 402 or do the background work. The owner chooses each route's class, which sets its relative cost. The demo at [/demo](/demo) checks writes only.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/agent
```

Every request sends `Attackfee-Client: agent`. When a write needs a pass, the client does the work and retries once.

An automated client can pay the offer in the 402 instead of doing the work. The payment details are in the 402 body and in /.well-known/attackfee.json; a runnable client is in the repo's examples.

```js
import { createAgent } from "@attackfee/agent";

const agent = createAgent({ base: "http://127.0.0.1:8787" });
const result = await agent.fetch("/contact", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: "hi" }),
});
```

`result.response` is the final response. `result.via` is `work` when the client did the work, and `none` when the first response was already final.

`solveWork`, also exported from this package, runs a challenge payload in Node. Browsers use `@attackfee/widget` instead.

For a WordPress site, set `issuer` to `<site>/wp-json/attackfee`. The [server page](/docs/server) describes the routes the client calls.

The `attackfee-agent-pay` command runs against a local demo. It is for tests.
