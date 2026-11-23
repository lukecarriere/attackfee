// Generic edge worker bundle: proxied reads always go to the configured ORIGIN host. No sockets or real fetches.
// Prerequisite: node scripts/gen-strings.mjs && node packages/widget/build.mjs && node packages/edge-cf/build.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./do-harness.ts";

const workerModule = new URL("../packages/edge-cf/dist/worker.js", import.meta.url).href;
const worker = (await import(workerModule)).default as {
  fetch(req: Request, env: { SITE_ID: string; SITE_SECRET: string; ORIGIN: string }): Promise<Response>;
};
const EDGE = "http://127.0.0.1:8800";
const ORIGIN = "http://127.0.0.1:8801";
const OTHER = "http://127.0.0.1:8802";
const env = { SITE_ID: "upstream-test", SITE_SECRET: "upstream-test-dummy-value-000001", ORIGIN };

async function exercise(path: string, method = "GET") {
  const destinations: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    destinations.push(new URL(url).origin);
    return new Response(new URL(url).origin === ORIGIN ? "configured origin" : "<title>other host</title>", {
      headers: { "content-type": "text/html" },
    });
  };
  try {
    const res = await worker.fetch(new Request(EDGE + path, { method }), env);
    const body = await res.text();
    return { destinations, body };
  } finally {
    globalThis.fetch = original;
  }
}

test("upstream host: ordinary path and query go to the configured origin", async () => {
  assert.deepEqual(await exercise("/article?q=1"), { destinations: [ORIGIN], body: "configured origin" });
});

test("upstream host: an encoded slash stays part of the path", async () => {
  assert.deepEqual(await exercise("/%2F127.0.0.1:8802/article"), { destinations: [ORIGIN], body: "configured origin" });
});

for (const method of ["GET", "HEAD", "OPTIONS"]) {
  test(`upstream host: a double-slash ${method} path still goes to the configured origin`, async () => {
    const result = await exercise("//127.0.0.1:8802/article?q=1", method);
    assert.deepEqual({ pinned: result.destinations.every((d) => d === ORIGIN), otherBody: result.body.includes("other host") },
      { pinned: true, otherBody: false }, "request goes to the configured origin only");
  });
}

test("upstream host: a backslash path still goes to the configured origin", async () => {
  const result = await exercise("/\\127.0.0.1:8802/article");
  assert.ok(result.destinations.every((d) => d === ORIGIN), "path must not change the upstream host");
});

test("upstream host: path and query are kept, fragment is dropped", async () => {
  const seen: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    seen.push(input instanceof Request ? input.url : String(input));
    return new Response("ok");
  };
  try {
    await worker.fetch(new Request(EDGE + "/a/b?x=1&y=2"), env);
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(seen, [ORIGIN + "/a/b?x=1&y=2"]);
});

test("upstream host: the shipped site serves ASSETS and the generic proxy worker is local-only", () => {
  const rootConfig = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const site = readFileSync(new URL("../packages/edge-cf/src/site.ts", import.meta.url), "utf8");
  const localConfig = readFileSync(new URL("../packages/edge-cf/wrangler.toml", import.meta.url), "utf8");
  assert.match(rootConfig, /^main = "packages\/edge-cf\/dist\/site\.js"$/m);
  assert.match(site, /async forward\(req, env, url\)/);
  assert.match(site, /return env\.ASSETS\.fetch\(req\)/);
  assert.match(localConfig, /^workers_dev = false$/m);
  assert.ok(!/^routes\s*=/m.test(localConfig));
  assert.notEqual(ORIGIN, OTHER);
});
