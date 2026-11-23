// Marketing's homepage and /demo copy (shared/seo/briefs attackfee-homepage.md and attackfee-demo.md,
// Nov 18, 2026), and a fact check for each claim the new lines make. The facts are checked against the
// code that runs attackfee.dev (the edge handler, the same build the site worker uses, with its
// wrangler.toml defaults) and the Node issuer:
//   F1 a work pass covers 20 actions for 15 minutes (also for a client that says it is an agent);
//   F2 Attackfee-Client: agent gets a 402 with payment_required and challenge_url (also as the demo's curl sends it);
//   F3 checks run on the owner's server: earning and spending a pass calls no outside host;
//   F4 every route class the copy lists is gated: comments, contact, write APIs, posted search, logins, signups;
//   F5 crawlers are not blocked: a GET with a crawler user agent is never checked, and robots.txt allows all;
//   F6 logins ask 8x the work of a search, signups and logins cost more than a write, a paid pass is one
//      write, and the only user-agent split is phone or desktop (no bot verdict).
// The live crawler check (curl against attackfee.dev) is evidence in the PR, not part of this suite.
// wrangler dev listens on 127.0.0.1:8804; the test origin on 127.0.0.1:8805. No deploy, no real mint.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { solveWork } from "../packages/work-adapter/src/index.ts";
import "./do-harness.ts";
import { normalizeConfig } from "../packages/server-node/src/config.ts";
import { createAttackfee } from "../packages/server-node/src/attackfee.ts";
import { CLASS_MULT } from "../packages/protocol/src/classes.ts";
import { uaClass } from "../packages/protocol/src/policy.ts";
import { offerAmountMsat } from "../packages/settlement-ln/src/stub-engine.ts";
import { startKeysetMint } from "../packages/settlement-ln/src/index.ts";
// @ts-ignore plain JS build script
import { build, HOME } from "../website/build.mjs";
// @ts-ignore plain JS helper
import { lintText } from "../scripts/copy-lib.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://attackfee.dev";
const DEFINITION = "Attackfee is write-side security for websites and APIs. It puts a small cost on the routes that change something, like comments, signups, logins, posted search and write APIs, and leaves reads free. A visitor's browser covers that cost with a short burst of background proof of work and gets a pass that covers 20 actions for 15 minutes. People never pay money, and there is no CAPTCHA to solve. An AI agent or script does the same work, or can pay per write over HTTP 402 instead. Checks run on the site owner's server, and crawlers are not blocked.";
const FACT2 = "**Writes carry a cost.** A person's browser covers it with background work, about once a visit. People never pay money.";
const TITLE = "Attackfee · Write-side security for forms, logins and APIs";
const DESCRIPTION = "Attackfee puts a cost on comments, signups, logins and write APIs. Browsers cover it with background work. Agents work or pay per write. Reads stay free.";
const DEMO_TITLE = "Demo: one form that answers 200, 403 or 402 · Attackfee";
const DEMO_AGENT = "Send the same request with the Attackfee-Client: agent header and the server answers 402 with a price and a link to a work challenge. The agent can pay for one write or do the work and earn a pass for 20. A write costs under a cent; current prices are at /v1/price.";
const DEMO_LOCAL = "The local demo has more forms, a load test and the paid agent path against a test backend. It ships with the source code.";
const FAQ: [string, string][] = [
  ["What is Attackfee?", "Attackfee is write-side security for websites and APIs. It puts a small cost on comments, signups, logins, posted search and write APIs, and leaves reading free for people, crawlers and AI agents."],
  ["How do I stop AI agents from flooding my forms without blocking them from my site?", "Mark the routes that change something. Each write then needs a pass checked on your server. A browser or script without a pass gets a 403 with a fresh challenge. A client that sends the Attackfee-Client: agent header gets a 402 with a price and a link to the same work. A browser earns a pass in the background while the visitor reads or types. Agents that only read never hit a check."],
  ["Do people have to pay or solve anything?", "No. People never pay money and there is nothing to solve. Their browser does a short background check while they read or type. In the repo's benchmark the median check took about 0.2 seconds on a desktop and about 0.4 seconds on an emulated phone. A real phone has not been measured yet."],
  ["What does an AI agent pay to write?", "On attackfee.dev, a client that sends Attackfee-Client: agent and writes without a pass gets HTTP 402 with a price and a link to do the work instead. A comment or form post costs under a cent, and signups and logins cost more. Current prices are at /v1/price. A paid pass covers one write. A work pass covers 20 actions for 15 minutes."],
  ["Is this the same as pay per crawl?", "Pay-per-crawl products charge crawlers for reading pages. Attackfee does not charge for reading. It prices the requests that change something on your site."],
  ["Does robots.txt stop AI agents from posting to my forms?", "robots.txt is a request about what to crawl, and crawlers can ignore it. It does not check a form post. Attackfee checks each write on your server and leaves reading, and your robots.txt, alone."],
  ["Will it stop bots guessing passwords on my login page?", "It makes every attempt cost something. Logins sit in the account class, which asks for 8 times the work of a search, and a script has to earn a new pass every 20 actions, so 10,000 attempts means earning 500 passes. It does not stop a funded attacker with rented GPUs, and it does not identify anyone."],
  ["Does Attackfee detect bots or AI?", "No. There is no bot score and no verdict on who is a person. Every protected write needs a pass, whoever sends it."],
  ["Where does it run?", "Node with Express middleware, PHP through a library shipped in the WordPress plugin, a WordPress plugin, and an edge worker that runs attackfee.dev. The packages are not on npm yet."],
];

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ""));
function jsonLd(html: string): any[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return blocks.map((b) => JSON.parse(b)); // throws on invalid JSON
}
const graph = (docs: any[]) => docs.flatMap((d) => d["@graph"] ?? [d]);

let OUT = "";
before(() => { OUT = build(mkdtempSync(join(tmpdir(), "attackfee-brief-")) + "/", SITE, () => {}); });

test("homepage: definition under the lede, new facts line, title and meta, FAQ visible", () => {
  const html = readFileSync(OUT + "index.html", "utf8");
  assert.equal(HOME.definition, DEFINITION);
  const lede = html.indexOf('<p class="lede">');
  const def = html.indexOf('<p class="def">' + DEFINITION + '</p>');
  assert.ok(lede > 0 && def > lede, "the definition paragraph follows the lede");
  assert.ok(def < html.indexOf('<p class="ctas">'), "and sits before the buttons, directly under the lede");
  assert.equal(HOME.facts[1], FACT2);
  assert.ok(!html.includes("A person pays it once a visit"));
  assert.ok(html.includes(`<title>${TITLE}</title>`));
  assert.ok(html.includes(`<meta name="description" content="${DESCRIPTION}">`));
  const faq = /<section class="sec" id="faq"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  assert.ok(faq.includes(">Questions</h2>"), "a visible Questions section");
  for (const [q, a] of FAQ) {
    assert.ok(text(faq).includes(q), q);
    assert.ok(text(faq).includes(a), "answer to " + q);
  }
  assert.ok(html.indexOf('id="faq"') < html.indexOf('class="closing"'), "before the closing call to action");
});

test("homepage JSON-LD parses: Organization (sameAs official X profile), SoftwareApplication with the meta description, FAQPage word for word", () => {
  const html = readFileSync(OUT + "index.html", "utf8");
  const items = graph(jsonLd(html));
  const org = items.find((i) => i["@type"] === "Organization");
  assert.deepEqual(org, { "@type": "Organization", "@id": SITE + "/#org", name: "Attackfee", url: SITE + "/", logo: SITE + "/apple-touch-icon.png", sameAs: ["https://x.com/attackfee"] });
  const app = items.find((i) => i["@type"] === "SoftwareApplication");
  assert.equal(app["@id"], SITE + "/#app");
  assert.equal(app.description, DESCRIPTION);
  assert.deepEqual(app.publisher, { "@id": SITE + "/#org" });
  const faq = items.find((i) => i["@type"] === "FAQPage");
  assert.deepEqual(faq.mainEntity.map((q: any) => [q.name, q.acceptedAnswer.text]), FAQ, "the markup matches the visible FAQ");
  assert.equal(JSON.stringify(items).includes("offers"), false);
  // The CSP hash still covers the one homepage JSON-LD block.
  assert.equal(jsonLd(html).length, 1);
});

test("/demo: new title, an As an AI agent block after Without a pass with no offer details, WebPage and BreadcrumbList JSON-LD, local-demo line", () => {
  const html = readFileSync(OUT + "demo.html", "utf8");
  assert.ok(html.includes(`<title>${DEMO_TITLE}</title>`));
  const nopass = html.indexOf('id="nopass"');
  const agent = /<section class="card" id="agent"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  assert.ok(agent && html.indexOf('id="agent"') > nopass, "the agent block follows Without a pass");
  assert.ok(agent.includes(">As an AI agent</h2>"));
  assert.ok(text(agent).includes(DEMO_AGENT));
  assert.ok(text(agent).includes('curl -X POST https://attackfee.dev/demo/contact -H "Attackfee-Client: agent" -d "message=hi"'));
  assert.ok(text(agent).includes('402  {"error": "payment_required", "challenge_url": "/v1/challenge?...", ... }'));
  for (const w of ["offers", "cashu", "mint", "invoice", "amount", "creqA", "x-cashu"]) assert.equal(text(agent).toLowerCase().includes(w.toLowerCase()), false, "no offer details: " + w);
  const items = graph(jsonLd(html));
  const page = items.find((i) => i["@type"] === "WebPage");
  assert.equal(page.url, SITE + "/demo");
  assert.deepEqual(page.about, { "@id": SITE + "/#app" });
  assert.deepEqual(page.breadcrumb.itemListElement.map((i: any) => [i["@type"], i.position, i.name, i.item]), [["ListItem", 1, "Attackfee", SITE + "/"], ["ListItem", 2, "Demo", SITE + "/demo"]]);
  assert.equal(page.breadcrumb["@type"], "BreadcrumbList");
  const local = /<section class="local"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  assert.ok(text(local).includes(DEMO_LOCAL));
  assert.equal(html.includes("Get a copy of the repo"), false);
  assert.equal(/npm (install|run)/.test(local), false, "no install call to action");
  const headers = readFileSync(OUT + "_headers", "utf8");
  for (const block of jsonLd(html)) assert.ok(block);
  assert.ok(headers.includes("/demo"), "demo headers kept");
});

test("every added line passes the docs/copy.md lint", () => {
  assert.notDeepEqual(lintText("website/build.mjs", "Solve the captcha"), [], "the lint is live");
  const added = [DEFINITION, FACT2, TITLE, DESCRIPTION, DEMO_TITLE, DEMO_AGENT, DEMO_LOCAL, ...FAQ.flat(), "As an AI agent", "Questions"];
  for (const line of added) assert.deepEqual(lintText("website/build.mjs", line.replace(/\*\*/g, "")), [], line);
});

// ---- Fact checks ----
let wr: ChildProcess | undefined;
let base = "";
let mint: Awaited<ReturnType<typeof startKeysetMint>> | undefined;
let origin: Server;
const seen: string[] = [];
let worker: any;
const EDGE_ENV = { SITE_ID: "site_demo", SITE_SECRET: "brief-fact-secret-do-not-use-0001", ORIGIN: "http://127.0.0.1:8805" };

before(async () => {
  origin = createServer((req, res) => { seen.push(req.method + " " + req.url); res.setHeader("content-type", "text/plain"); res.end("origin " + req.method + " " + req.url); });
  await new Promise<void>((r) => origin.listen(8805, "127.0.0.1", r));
  execFileSync(process.execPath, [ROOT + "packages/edge-cf/build.mjs"], { cwd: ROOT });
  worker = (await import(pathToFileURL(ROOT + "packages/edge-cf/dist/worker.js").href + "?brief=" + Date.now())).default;
  mint = await startKeysetMint({ quotes: true });
  writeFileSync(ROOT + ".dev.vars", `SITE_SECRET="brief-site-secret-0001"\nATTACKFEE_TEST_HOOKS=1\nL402_ENABLED=1\nCASHU_MINTS=["https://mint.minibits.cash/Bitcoin"]\nCASHU_FETCH_PROXY="${mint.url}"\n`, { mode: 0o600 });
  wr = spawn(ROOT + "node_modules/.bin/wrangler", ["dev", "--local", "--ip", "127.0.0.1", "--port", "8804", "--persist-to", mkdtempSync(join(tmpdir(), "attackfee-brief-wr-")), "--show-interactive-dev-session=false"], {
    cwd: ROOT, env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" }, stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("wrangler dev did not start:\n" + log)), 90_000);
    const on = (c: Buffer) => { log += c.toString(); if (/Ready on http/.test(log)) { clearTimeout(t); resolve(); } };
    wr!.stdout!.on("data", on);
    wr!.stderr!.on("data", on);
    wr!.on("exit", (code) => { clearTimeout(t); reject(new Error("wrangler dev exited " + code + "\n" + log)); });
  });
  wr.removeAllListeners("exit");
  base = "http://127.0.0.1:8804";
});

after(async () => {
  wr?.kill("SIGTERM");
  rmSync(ROOT + ".dev.vars", { force: true });
  await mint?.close();
  await new Promise((r) => origin?.close(() => r(null)));
});

/** One in-process edge request, recording every outbound fetch. */
const outbound: string[] = [];
async function edge(path: string, init: RequestInit = {}): Promise<Response> {
  const real = globalThis.fetch;
  const log = console.log;
  globalThis.fetch = (async (input: any, i?: any) => { outbound.push(typeof input === "string" ? input : input.url ?? String(input)); return real(input, i); }) as typeof fetch;
  console.log = () => {};
  try { return await worker.fetch(new Request("https://edge-site.test" + path, init), EDGE_ENV); } finally { globalThis.fetch = real; console.log = log; }
}
async function earnPass(client: "widget" | "agent") {
  const { challenge } = await (await edge(`/v1/challenge?action=write&path=/contact${client === "agent" ? "&client=agent" : ""}`)).json() as any;
  const s = await solveWork(challenge.work);
  const r = await edge("/v1/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challenge_id: challenge.id, challenge, client, solution: { work: { counter: s!.counter, derivedKey: s!.derivedKey }, took_ms: 1 } }) });
  assert.equal(r.status, 200);
  return await r.json() as any;
}

test("F1 + F3: a work pass covers 20 actions for 15 minutes, for a browser and for an agent; nothing leaves for an outside host", async () => {
  for (const client of ["widget", "agent"] as const) {
    outbound.length = 0;
    const t0 = Math.floor(Date.now() / 1000);
    const p = await earnPass(client);
    assert.equal(p.rail, "work");
    assert.ok(Math.abs(p.exp - t0 - 15 * 60) <= 2, `${client}: the pass lasts 15 minutes (exp - now = ${p.exp - t0})`);
    for (let i = 1; i <= 20; i++) {
      const r = await edge("/contact", { method: "POST", headers: { accept: "application/json", authorization: "Attackfee " + p.pass }, body: "x" });
      assert.equal(r.status, 200, `${client}: use ${i} of 20`);
    }
    const r21 = await edge("/contact", { method: "POST", headers: { accept: "application/json", authorization: "Attackfee " + p.pass }, body: "x" });
    assert.equal(r21.status, 403, `${client}: the 21st action needs a new pass`);
    assert.deepEqual([...new Set(outbound.map((u) => new URL(u).origin))], ["http://127.0.0.1:8805"], "only the site's own origin is fetched (the forwarded writes)");
  }
  const cfg = normalizeConfig({ site_id: "s", secret: "x".repeat(32), routes: [] }, {});
  assert.deepEqual([cfg.defaults.pass_uses, cfg.defaults.pass_ttl_s], [20, 900], "the defaults the live site worker uses (wrangler.toml sets no override)");
  assert.equal(readFileSync(ROOT + "wrangler.toml", "utf8").match(/PASS_(USES|TTL)/), null);
});

test("F3: the Node issuer earns and checks a pass with no outbound request", async () => {
  const real = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (u: any) => { calls.push(String(u)); throw new Error("no network in this test"); }) as typeof fetch;
  try {
    const af = createAttackfee(normalizeConfig({ site_id: "site_n", secret: "node-fact-secret-0123456789abcdef", routes: [{ prefix: "/comments", class: "write" }] }, {}));
    const c = await af.issueChallenge({ action: "write", path: "/comments", client: "widget" });
    const s = await solveWork(c.work as any);
    const r = await af.verifySolution(c, { work: { counter: s!.counter, derivedKey: s!.derivedKey }, took_ms: 1 } as any);
    const v = await af.verifyPass(r.pass, { action: "write" });
    assert.equal(v.remaining, 19);
  } finally { globalThis.fetch = real; }
  assert.deepEqual(calls, [], "no outside host is called");
});

test("F4: comments, contact, write APIs, posted search, logins and signups are gated (edge defaults and a Node config)", async () => {
  const cases: [string, string][] = [["/wp-comments-post.php", "write"], ["/contact", "write"], ["/api/items", "write"], ["/search", "search"], ["/wp-login.php", "account"], ["/wp-login.php?action=register", "account"]];
  for (const [path, cls] of cases) {
    const n = seen.length;
    const r = await edge(path, { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body: "a=1" });
    assert.equal(r.status, 403, path);
    const j = await r.json() as any;
    assert.equal(j.error, "attackfee_required", path);
    assert.equal(j.challenge.bound.action, cls, path);
    assert.equal(seen.length, n, path + ": the origin is not reached");
  }
  const af = createAttackfee(normalizeConfig({ site_id: "s", secret: "x".repeat(32), routes: [{ prefix: "/comments", class: "write" }, { prefix: "/signup", class: "account" }, { prefix: "/login", class: "account" }, { prefix: "/search", class: "search" }, { prefix: "/api/", class: "write" }] }, {}));
  for (const [path, cls] of [["/comments", "write"], ["/signup", "account"], ["/login", "account"], ["/search", "search"], ["/api/posts", "write"]]) assert.equal(af.classify(path, "POST").cls, cls, "Node " + path);
});

test("F5: a GET with a crawler user agent is never checked, and robots.txt allows every path", async () => {
  for (const ua of ["Mozilla/5.0 (compatible; Googlebot/2.1)", "GPTBot/1.2", "ClaudeBot/1.0", "PerplexityBot/1.0", "CCBot/2.0", "bingbot/2.0"]) {
    for (const path of ["/", "/docs", "/demo/contact", "/search?q=x", "/wp-login.php"]) {
      const r = await edge(path, { headers: { "user-agent": ua } });
      assert.equal(r.status, 200, ua + " " + path);
      assert.equal(await r.text(), "origin GET " + path);
    }
  }
  const robots = readFileSync(ROOT + "website/robots.txt", "utf8");
  assert.ok(robots.startsWith("User-agent: *\nAllow: /\n"), "everyone may crawl");
  assert.doesNotMatch(robots, /^\s*disallow/im, "and nothing is disallowed, including for the named AI agents");
});

test("F6: logins 8x a search; signups and logins cost more than a write; a paid pass is one write; no bot verdict", () => {
  assert.equal(CLASS_MULT.account / CLASS_MULT.search, 8);
  assert.ok(offerAmountMsat("account") > offerAmountMsat("write"));
  assert.equal(offerAmountMsat("write"), 10000);
  assert.throws(() => normalizeConfig({ site_id: "s", secret: "x".repeat(32), routes: [], settlement: { enabled: true, backend: "stub", pass_uses: 2 } }, {}), /pass_uses must be 1/);
  assert.deepEqual([...new Set(["Mozilla/5.0 (iPhone)", "Googlebot/2.1", "curl/8", "python-requests/2", "", null].map((u) => uaClass(u)))].sort(), ["desktop", "mobile"]);
});

test("F2: Attackfee-Client: agent gets a 402 with payment_required and challenge_url, also as the demo's curl sends it (form body, default Accept)", async () => {
  const r = await fetch(base + "/demo/contact", { method: "POST", headers: { "Attackfee-Client": "agent", "content-type": "application/x-www-form-urlencoded", accept: "*/*", "user-agent": "curl/8.5.0" }, body: "message=hi" });
  const j = await r.json() as any;
  assert.equal(r.status, 402);
  assert.equal(j.error, "payment_required");
  assert.match(j.challenge_url, /^\/v1\/challenge\?/);
  const none = await fetch(base + "/demo/contact", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "*/*", "user-agent": "curl/8.5.0" }, body: "message=hi" });
  assert.equal(none.status, 403, "without the header: 403");
  assert.equal((await none.json() as any).error, "attackfee_required");
});
