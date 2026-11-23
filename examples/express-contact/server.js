import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Attackfee, loadConfig } from "@attackfee/server";

const here = dirname(fileURLToPath(import.meta.url));
const attackfee = Attackfee.create(loadConfig(join(here, "attackfee.yaml")));
const app = express();

app.use(Attackfee.router(attackfee));
app.use(express.static(join(here, "public")));
app.post("/contact", Attackfee.middleware(attackfee, { action: "write" }), (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Attackfee Express example on http://localhost:${port}`);
});
