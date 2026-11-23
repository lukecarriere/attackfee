// Attackfee is its own brand: nothing the site serves may carry the previous product's names.
// Scans the built site and widget scripts on disk, then every route of the site worker under
// `wrangler dev --local` (production vars: payments off), including headers. See
// scripts/check-served-brand.mjs for the route list and the pattern.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
// @ts-ignore plain JS script
import { OLD_BRAND, hitsIn, scanDist, scanLive } from "../scripts/check-served-brand.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let wr: ChildProcess | undefined;
let BASE = "";
let log = "";
let distScan: { files: number; hits: string[] } = { files: 0, hits: [] };

test("canary: the pattern catches each old name in any case, and not the new one", () => {
  for (const s of ["To" + "ll", "TO" + "LL_SITE_URL", "less" + "spam" + "." + "dev", "Sp" + "am takes", "x-to" + "ll-store-fail"]) assert.ok(OLD_BRAND.test(s), s);
  for (const s of ["Attackfee", "attackfee_required", "ATTACKFEE_SITE_URL", "/attackfee/v1/attackfee.js"]) assert.ok(!OLD_BRAND.test(s), s);
  assert.equal(hitsIn("x", "a " + "to" + "ll b").length, 1);
});

test("built site and served widget scripts: no old-brand names in any file or file name", () => {
  // The build already ran in before(), before the worker started. Building again deletes website/dist
  // while the worker is serving it, and /demo then stays 404.
  assert.ok(distScan.files > 30, "scanned " + distScan.files);
  assert.deepEqual(distScan.hits, [], distScan.hits.join("\n"));
});

before(async () => {
  execFileSync(process.execPath, [ROOT + "website/build.mjs"], { cwd: ROOT, stdio: "ignore" });
  execFileSync(process.execPath, [ROOT + "packages/edge-cf/build.mjs"], { cwd: ROOT, stdio: "ignore" });
  distScan = scanDist();
  // Local only: a throwaway secret for this run, removed in after().
  writeFileSync(ROOT + ".dev.vars", `SITE_SECRET="${randomBytes(24).toString("hex")}"\n`, { mode: 0o600 });
  const free = await new Promise<number>((r) => { const t = createServer().listen(0, "127.0.0.1", () => { const p = (t.address() as AddressInfo).port; t.close(() => r(p)); }); });
  const persist = mkdtempSync(join(tmpdir(), "attackfee-brand-"));
  wr = spawn(ROOT + "node_modules/.bin/wrangler", ["dev", "--local", "--ip", "127.0.0.1", "--port", String(free), "--persist-to", persist, "--show-interactive-dev-session=false"], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("wrangler dev did not start")), 90_000);
    const on = (c: Buffer) => { log += c.toString(); if (/Ready on http/.test(log)) { clearTimeout(t); resolve(); } };
    wr!.stdout!.on("data", on);
    wr!.stderr!.on("data", on);
    wr!.on("exit", (code) => { clearTimeout(t); reject(new Error("wrangler dev exited " + code)); });
  });
  wr.removeAllListeners("exit");
  BASE = `http://127.0.0.1:${free}`;
});

after(() => {
  wr?.kill("SIGTERM");
  rmSync(ROOT + ".dev.vars", { force: true });
});

test("site worker: every page, file, header and API response is free of old-brand names", async () => {
  const r = await scanLive(BASE);
  const status = (line: string) => r.routes.find((x: string) => x.startsWith(line + " -> "));
  for (const p of ["/", "/demo", "/llms.txt", "/v1/health", "/v1/price"]) assert.equal(status("GET " + p), `GET ${p} -> 200`, p);
  assert.equal(status("POST(json) /demo/contact"), "POST(json) /demo/contact -> 403");
  assert.ok(r.routes.length > 40, "requests: " + r.routes.length);
  assert.deepEqual(r.hits, [], r.hits.join("\n"));
});
