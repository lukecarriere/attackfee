// Concurrent single-use on the generic edge worker when ATTACKFEE_KV is bound.
// N calls for one key must succeed once. A replay is 401 and spends nothing further.
// The KV double lets every in-flight read of a single-use key observe the value from
// before any of those reads return, which is what separate get and put calls allow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { doStorage } from "./do-harness.ts";
import type { AttackfeeDoStub, AttackfeeStoreDO } from "../packages/edge-cf/src/do-store.ts";
import { STORE_REQUIRED, type KVLike } from "../packages/edge-cf/src/kv-store.ts";
import { solveWork } from "../packages/work-adapter/src/index.ts";

registerHooks({
  load(url, context, next) {
    if (/\/widget\/dist\/attackfee(?:\.worker)?\.js$/.test(url)) {
      let text = "";
      try { text = readFileSync(new URL(url), "utf8"); } catch { /* dist is produced by the build */ }
      return { format: "module", shortCircuit: true, source: "export default " + JSON.stringify(text) };
    }
    return next(url, context);
  },
});

const { default: worker } = await import("../packages/edge-cf/src/worker.ts");

const N = 20;
const SECRET = "edge-kv-concurrent-secret-000001";

/** In-flight reads of one single-use key share the value seen by the first of the group. */
class RacyKv implements KVLike {
  private m = new Map<string, string>();
  width = 1;
  private gates = new Map<string, { snap: string | null; wait: Array<() => void> }>();

  async get(key: string): Promise<string | null> {
    if (this.width <= 1 || (!key.startsWith("f:") && !key.startsWith("n:"))) return this.m.get(key) ?? null;
    let gate = this.gates.get(key);
    if (!gate) {
      gate = { snap: this.m.get(key) ?? null, wait: [] };
      this.gates.set(key, gate);
    }
    if (gate.wait.length + 1 >= this.width) {
      const snap = gate.snap;
      const waiters = gate.wait;
      this.gates.delete(key);
      for (const release of waiters) release();
      return snap;
    }
    const mine = gate;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("single-use read did not join " + this.width + " callers for " + key)), 5_000);
      mine.wait.push(() => { clearTimeout(timer); resolve(); });
    });
    return mine.snap;
  }

  async put(key: string, value: string): Promise<void> {
    this.m.set(key, value);
  }
}

function asStub(store: AttackfeeStoreDO): AttackfeeDoStub {
  return new Proxy(store, {
    get(target, prop, recv) {
      const val = Reflect.get(target, prop, recv);
      if (typeof val === "function") return (...args: unknown[]) => Promise.resolve((val as (...a: unknown[]) => unknown).apply(target, args));
      return val;
    },
  }) as unknown as AttackfeeDoStub;
}

const storage = doStorage();
const stub = asStub(storage.open());
const kv = new RacyKv();

let origin: Server;
let env: {
  SITE_ID: string;
  SITE_SECRET: string;
  ORIGIN: string;
  WRITE_PATHS: string;
  ATTACKFEE_KV: RacyKv;
  ATTACKFEE_STORE: { idFromName: (name: string) => string; get: () => AttackfeeDoStub };
};

async function call(path: string, init: RequestInit = {}): Promise<{ status: number; body: string; json: unknown }> {
  const res = await worker.fetch(new Request("http://edge.test" + path, init), env);
  const body = await res.text();
  let json: unknown = null;
  if (body) { try { json = JSON.parse(body); } catch { /* origin text */ } }
  return { status: res.status, body, json };
}

test("concurrent firstUse and last consume on one key succeed once", { timeout: 120_000 }, async () => {
  origin = createServer((_req, res) => { res.writeHead(200, { "content-type": "text/plain" }); res.end("ok"); });
  await new Promise<void>((resolve) => origin.listen(0, "127.0.0.1", resolve));
  const port = (origin.address() as AddressInfo).port;
  env = {
    SITE_ID: "site_edge",
    SITE_SECRET: SECRET,
    ORIGIN: `http://127.0.0.1:${port}`,
    WRITE_PATHS: '["/contact"]',
    ATTACKFEE_KV: kv,
    ATTACKFEE_STORE: { idFromName: () => "edge", get: () => stub },
  };
  const log = console.log;
  console.log = () => {};
  try {
    let blocked: unknown;
    try {
      const res = await worker.fetch(new Request("http://edge.test/v1/health"), { ...env, ATTACKFEE_STORE: undefined });
      await res.text();
      blocked = "handled";
    } catch (e) {
      blocked = e;
    }
    assert.ok(blocked instanceof Error, "KV without the Durable Object is refused");
    assert.equal((blocked as Error).message, STORE_REQUIRED);
    const issued = await call("/v1/challenge?action=write&path=/contact");
    assert.equal(issued.status, 200);
    const challenge = (issued.json as { challenge: { id: string; work: unknown } }).challenge;
    const solved = await solveWork(challenge.work);
    assert.ok(solved);
    const solution = { work: { counter: solved.counter, derivedKey: solved.derivedKey }, took_ms: 1 };
    const redeemBody = JSON.stringify({ challenge_id: challenge.id, challenge, solution });
    kv.width = N;
    const redeems = await Promise.all(Array.from({ length: N }, () => call("/v1/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: redeemBody,
    })));
    kv.width = 1;
    const won = redeems.filter((r) => r.status === 200);
    const pass = (won[0]?.json as { pass?: string } | null)?.pass;
    const misses: string[] = [];
    if (won.length !== 1) misses.push("firstUse successes " + won.length);
    for (const r of redeems) {
      if (r.status === 200) continue;
      if (r.status !== 401 || JSON.stringify(r.json) !== JSON.stringify({ error: "replay" })) misses.push("replay " + r.status + " " + r.body);
    }
    if (pass) {
      for (let i = 0; i < 19; i++) {
        const spent = await call("/contact", { method: "POST", headers: { authorization: "Attackfee " + pass }, body: "x" });
        if (spent.status !== 200 || spent.body !== "ok") misses.push("use " + i + " " + spent.status);
      }
      const before = await call("/v1/status", { headers: { authorization: "Attackfee " + pass } });
      if ((before.json as { n?: number } | null)?.n !== 1) misses.push("remaining before last use " + before.body);
      kv.width = N;
      const spends = await Promise.all(Array.from({ length: N }, () => call("/contact", {
        method: "POST",
        headers: { authorization: "Attackfee " + pass, accept: "application/json" },
        body: "x",
      })));
      kv.width = 1;
      const accepted = spends.filter((r) => r.status === 200);
      if (accepted.length !== 1) misses.push("consume successes " + accepted.length);
      if (accepted.length === 1 && accepted[0].body !== "ok") misses.push("consume body " + accepted[0].body);
      const again = await call("/contact", { method: "POST", headers: { authorization: "Attackfee " + pass, accept: "application/json" }, body: "x" });
      if (again.status === 200) misses.push("extra consume succeeded");
    } else misses.push("no pass");
    assert.deepEqual(misses, []);
  } finally {
    console.log = log;
    await new Promise((resolve) => origin.close(() => resolve(null)));
  }
});
