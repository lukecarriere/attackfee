# @attackfee/server

Issuer and verifier for Node. It serves the `/v1` API and the self-hosted widget at `/attackfee/v1/attackfee.js`.

```js
import express from "express";
import { Attackfee, loadConfig } from "@attackfee/server";

const attackfee = Attackfee.create(loadConfig("attackfee.yaml"));
const app = express();
app.use(Attackfee.router(attackfee));
app.post("/contact", Attackfee.middleware(attackfee, { action: "write" }), (req, res) => {
  res.status(200).json({ ok: true });
});
app.listen(8787);
```

`secret` in the config is at least 16 characters. Reads stay free. The optional backend in this version is local and for tests.
