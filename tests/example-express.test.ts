// Packs workspace packages, installs them into a temp copy of examples/express-contact,
// starts that app on a free port, and checks the page, an unpassed post, and one agent post.
// Local only: no real mint, no real money, no network beyond loopback.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgent } from "../packages/agent/src/index.ts";
import { TEST_SECRET } from "./helpers.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const EXAMPLE = join(ROOT, "examples/express-contact");

function pack(dir: string, dest: string): string {
  const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", dest], { cwd: join(ROOT, dir), encoding: "utf8" })) as { filename: string }[];
  return join(dest, packed[0].filename);
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const t = createServer().listen(0, "127.0.0.1", () => {
      const p = (t.address() as AddressInfo).port;
      t.close(() => resolve(p));
    });
  });
}

async function waitFor(url: string, ms = 20_000): Promise<void> {
  const t0 = Date.now();
  let last = "";
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      await r.arrayBuffer();
      if (r.status === 200) return;
      last = "status " + r.status;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start: " + url + " (" + last + ")");
}

test("examples/express-contact: page 200, unpassed post 403, agent post 200 after work", { timeout: 180_000 }, async () => {
  assert.ok(existsSync(join(EXAMPLE, "server.js")), "examples/express-contact/server.js");
  const tmp = mkdtempSync(join(tmpdir(), "attackfee-express-example-"));
  const tarballs = mkdtempSync(join(tmpdir(), "attackfee-tarballs-"));
  const app = join(tmp, "express-contact");
  let child: ChildProcess | undefined;
  let running = true;
  try {
    cpSync(EXAMPLE, app, { recursive: true });
    // Pack the four public packages the way the hand check does; the example only installs the server tarball.
    pack("packages/widget", tarballs);
    const serverTar = pack("packages/server-node", tarballs);
    pack("packages/agent", tarballs);
    pack("packages/mcp", tarballs);
    execFileSync("npm", ["install", "--no-fund", "--no-audit", "--ignore-scripts", "--prefer-offline", serverTar, "express@5.1.0"], { cwd: app, stdio: "inherit" });
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["server.js"], {
      cwd: app,
      env: { ...process.env, ATTACKFEE_SECRET: TEST_SECRET, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout?.on("data", (d) => { out += d; });
    child.stderr?.on("data", (d) => { out += d; });
    const died = new Promise<never>((_, reject) => {
      child!.on("exit", (code, signal) => {
        if (running) reject(new Error("server exited " + (signal ?? code) + "\n" + out));
      });
    });
    await Promise.race([waitFor(base + "/"), died]);

    const page = await fetch(base + "/");
    assert.equal(page.status, 200, "GET /");
    await page.arrayBuffer();

    const js = await fetch(base + "/attackfee/v1/attackfee.js");
    assert.equal(js.status, 200, "GET /attackfee/v1/attackfee.js");
    await js.arrayBuffer();

    const denied = await fetch(base + "/contact", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "message=hi",
    });
    const deniedText = await denied.text();
    assert.equal(denied.status, 403, "unpassed POST /contact: " + deniedText);
    const deniedBody = JSON.parse(deniedText) as { error?: string };
    assert.equal(deniedBody.error, "attackfee_required");

    const agentDenied = await fetch(base + "/contact", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "Attackfee-Client": "agent",
        accept: "application/json",
      },
      body: "message=hi",
    });
    const agentType = agentDenied.headers.get("content-type") ?? "";
    const agentText = await agentDenied.text();
    assert.match(agentType, /json/i, "agent body is JSON, not HTML: " + agentType + " " + agentText.slice(0, 200));
    JSON.parse(agentText);

    const agent = createAgent({ base });
    const result = await agent.fetch("/contact", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "message=hi",
    });
    assert.equal(result.response.status, 200, await result.response.clone().text());
    assert.deepEqual(await result.response.json(), { ok: true });
  } finally {
    running = false;
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await new Promise<void>((r) => child!.once("close", () => r()));
    }
    rmSync(tmp, { recursive: true, force: true });
    rmSync(tarballs, { recursive: true, force: true });
  }
});
