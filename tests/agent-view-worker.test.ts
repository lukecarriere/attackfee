// Agent view under `wrangler dev --local`: the site worker answers every sitemap page as Markdown to an
// AI agent user agent or an Accept: text/markdown request, keeps the HTML bytes for a browser, and
// leaves writes, the gate and the API exactly as they were. No deploy, no route, no zone, no real money.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { discoveryFiles, pagePath } from "../website/build.mjs";
import { twinPath, stripAlternate, outsideCode } from "../website/agent-text.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SECRET = randomBytes(24).toString("hex");
const GPTBOT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2";
const CLAUDEBOT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)";
const CHROME = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const htmlFile = (file: string) => (file === "index" ? "index.html" : file === "demo" ? "demo.html" : file + ".html");

let wr: ChildProcess;
let BASE = "";
let log = "";

before(async () => {
  execFileSync(process.execPath, [ROOT + "website/build.mjs"], { cwd: ROOT });
  execFileSync(process.execPath, [ROOT + "packages/edge-cf/build.mjs"], { cwd: ROOT });
  writeFileSync(ROOT + ".dev.vars", `SITE_SECRET="${SECRET}"\nCASHU_MINTS=["https://mint.minibits.cash/Bitcoin"]\nL402_ENABLED=1\n`, { mode: 0o600 });
  // Stay inside the shared engineering port range, choosing only a port we can bind now.
  let free = 0;
  for (let p = 8800; p <= 8809; p++) {
    const available = await new Promise<boolean>((resolve) => {
      const t = createServer();
      t.once("error", () => resolve(false));
      t.listen(p, "127.0.0.1", () => t.close(() => resolve(true)));
    });
    if (available) { free = p; break; }
  }
  if (!free) throw new Error("no free local test port in 8800-8809");
  const persist = mkdtempSync(join(tmpdir(), "attackfee-agent-view-"));
  wr = spawn(ROOT + "node_modules/.bin/wrangler", ["dev", "--local", "--ip", "127.0.0.1", "--port", String(free), "--persist-to", persist, "--show-interactive-dev-session=false"], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("wrangler dev did not start")), 90_000);
    const on = (c: Buffer) => { log += c.toString(); if (/Ready on http/.test(log)) { clearTimeout(t); resolve(); } };
    wr.stdout!.on("data", on);
    wr.stderr!.on("data", on);
    wr.on("exit", (code) => { clearTimeout(t); reject(new Error("wrangler dev exited " + code)); });
  });
  wr.removeAllListeners("exit");
  BASE = `http://127.0.0.1:${free}`;
});

after(() => {
  wr?.kill("SIGTERM");
  rmSync(ROOT + ".dev.vars", { force: true });
});

function curl(urlPath: string, args: string[] = []): { status: number; body: string; headers: string } {
  const r = spawnSync("curl", ["-sS", "-D", "-", ...args, BASE + urlPath], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || "curl failed");
  const idx = r.stdout.search(/\r?\n\r?\n/);
  const headers = idx < 0 ? r.stdout : r.stdout.slice(0, idx);
  const body = idx < 0 ? "" : r.stdout.slice(idx).replace(/^\r?\n\r?\n/, "");
  return { status: Number(/HTTP\/\d(?:\.\d)? (\d+)/.exec(headers)?.[1] ?? 0), body, headers };
}
const header = (h: string, name: string) => new RegExp(`^${name}:\\s*(.+?)\\s*$`, "im").exec(h)?.[1] ?? null;

test("every sitemap page: an AI agent or Accept: text/markdown gets the Markdown twin at the same URL", () => {
  for (const file of discoveryFiles()) {
    const path = pagePath(file);
    const twin = readFileSync(ROOT + "website/dist" + twinPath(file), "utf8");
    for (const args of [["-A", GPTBOT], ["-A", CLAUDEBOT, "-H", "accept: " + BROWSER_ACCEPT], ["-A", CHROME, "-H", "accept: text/markdown"], ["-A", CHROME, "-H", "accept: text/html;q=0.5, text/markdown"]]) {
      const r = curl(path, args);
      assert.equal(r.status, 200, path + " " + args.join(" "));
      assert.equal(header(r.headers, "content-type"), "text/markdown; charset=utf-8", path);
      assert.equal(header(r.headers, "vary"), "Accept, User-Agent", path);
      assert.equal(r.body, twin, path + ": the twin bytes");
      assert.doesNotMatch(outsideCode(r.body), /<script/i, path + ": no script outside the guides' code examples");
    }
    const direct = curl(twinPath(file));
    assert.equal(direct.status, 200, twinPath(file));
    assert.equal(header(direct.headers, "content-type"), "text/markdown; charset=utf-8", twinPath(file));
    assert.equal(direct.body, twin, twinPath(file));
  }
  const dot = curl("/.md");
  assert.equal(dot.status, 200);
  assert.equal(dot.body, readFileSync(ROOT + "website/dist/index.md", "utf8"));
});

test("every sitemap page: a browser gets the built HTML bytes, with Vary and the alternate link the only change", () => {
  for (const file of discoveryFiles()) {
    const path = pagePath(file);
    for (const args of [["-A", CHROME, "-H", "accept: " + BROWSER_ACCEPT], ["-A", CHROME, "-H", "accept: text/markdown;q=0.5, text/html"], ["-A", "curl/8.5.0"]]) {
      const r = curl(path, args);
      assert.equal(r.status, 200, path);
      assert.match(header(r.headers, "content-type") ?? "", /^text\/html\b/, path);
      assert.equal(header(r.headers, "vary"), "Accept, User-Agent", path);
      const built = readFileSync(ROOT + "website/dist/" + htmlFile(file), "utf8");
      assert.equal(r.body, built, path + ": HTML bytes");
      assert.equal(stripAlternate(r.body).length, built.length - `<link rel="alternate" type="text/markdown" href="${twinPath(file)}">`.length, path);
    }
  }
});

test("writes are unchanged for AI agents: 402 with an agent header, 403 without one, never Markdown", () => {
  const base = ["-X", "POST", "-H", "content-type: application/json", "-H", "accept: application/json", "-d", "{\"message\":\"hi\"}"];
  for (const ua of [GPTBOT, CLAUDEBOT]) {
    for (const accept of [[], ["-H", "accept: text/markdown"]]) {
      const agent = curl("/demo/contact", [...base, ...accept, "-A", ua, "-H", "attackfee-client: agent"]);
      assert.equal(agent.status, 402, ua);
      assert.equal(JSON.parse(agent.body).error, "payment_required", ua);
      assert.doesNotMatch(header(agent.headers, "content-type") ?? "", /markdown/);
    }
    const plain = curl("/demo/contact", [...base, "-A", ua]);
    assert.equal(plain.status, 403, ua);
    assert.equal(JSON.parse(plain.body).error, "attackfee_required", ua);
  }
  const chrome = curl("/demo/contact", [...base, "-A", CHROME, "-H", "attackfee-client: agent"]);
  assert.equal(chrome.status, 402, "the same 402 as a browser user agent with the agent header");
});

test("the API and discovery files ignore the agent view", () => {
  for (const p of ["/v1/price", "/v1/health", "/.well-known/attackfee.json"]) {
    const agent = curl(p, ["-A", GPTBOT, "-H", "accept: text/markdown"]);
    const human = curl(p, ["-A", CHROME]);
    assert.equal(agent.status, 200, p);
    assert.equal(agent.status, human.status, p);
    assert.match(header(agent.headers, "content-type") ?? "", /^application\/json\b/, p);
    assert.equal(header(agent.headers, "vary"), header(human.headers, "vary"), p);
    assert.deepEqual(Object.keys(JSON.parse(agent.body)).sort(), Object.keys(JSON.parse(human.body)).sort(), p);
  }
  for (const p of ["/robots.txt", "/llms.txt", "/llms-learn.txt", "/llms-full.txt", "/sitemap.xml"]) {
    const r = curl(p, ["-A", GPTBOT]);
    assert.equal(r.status, 200, p);
    assert.doesNotMatch(header(r.headers, "content-type") ?? "", /markdown/, p);
  }
});


test("the agentRead live-check passes against the local site worker and built HTML hashes", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const out = mkdtempSync(join(tmpdir(), "attackfee-agent-read-"));
    const child = spawn(process.execPath, [ROOT + "scripts/live-checks.mjs", "--only", "agentRead", "--base", BASE, "--src", ROOT, "--out", out], { cwd: ROOT });
    let output = "";
    child.stdout.on("data", (b) => { output += b; });
    child.stderr.on("data", (b) => { output += b; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /check agentRead: PASS/);
  console.log(result.output);
});
