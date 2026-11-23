// PHP's built-in server closes the socket. Reading only .status or .ok leaves the body unread,
// undici pauses, and Parser.finish throws assert(!this.paused). Read the body with arrayBuffer,
// json, or text, or drain(). The samples in tests/fixtures/history leave bodies unread.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-ignore plain JS scanner
import { unreadFetches } from "../scripts/fetch-body-lint.mjs";

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === "dist") continue;
    try {
      if (readdirSync(p).length >= 0 && !name.includes(".")) { out.push(...sources(p)); continue; }
    } catch { /* file */ }
    if (/\.(ts|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

test("working tree: tests and the agent client read every status-checked fetch body", () => {
  const files = [...sources("tests"), ...sources("packages/agent/src")];
  const hits = files.flatMap((f) => unreadFetches(readFileSync(f, "utf8")).map((h: { line: number; text: string }) => `${f}:${h.line} ${h.text}`));
  assert.deepEqual(hits, [], "read the body with arrayBuffer, json, or text, or drain()");
});

test("an agent-pay sample left three fetch bodies unread", () => {
  const src = readFileSync(new URL("./fixtures/history/unread-agent-pay.ts.txt", import.meta.url), "utf8");
  const hits = unreadFetches(src);
  assert.equal(hits.length, 3, "the sample must fail this check. Read the body with arrayBuffer, json, or text, or drain().");
});

test("a counter-test sample left two fetch bodies unread", () => {
  const src = readFileSync(new URL("./fixtures/history/unread-counters.ts.txt", import.meta.url), "utf8");
  const hits = unreadFetches(src);
  assert.equal(hits.length, 2, "the sample must fail this check");
});
