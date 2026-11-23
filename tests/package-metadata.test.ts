// npm page links: each public package points at the docs, the source and the issue tracker.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url).pathname;
const KEYWORDS: Record<string, string[]> = {
  "packages/widget": ["security", "abuse-prevention", "forms", "login", "proof-of-work", "attackfee"],
  "packages/server-node": ["security", "abuse-prevention", "forms", "login", "express", "http-402", "proof-of-work", "attackfee"],
  "packages/agent": ["ai-agents", "http-402", "proof-of-work", "attackfee"],
  "packages/mcp": ["mcp", "model-context-protocol", "ai-agents", "http-402", "attackfee"],
};

test("each public package links the repo, the docs and the issue tracker", () => {
  for (const dir of Object.keys(KEYWORDS)) {
    const p = JSON.parse(readFileSync(ROOT + dir + "/package.json", "utf8"));
    assert.equal(p.homepage, "https://attackfee.dev/docs", dir);
    assert.deepEqual(p.repository, { type: "git", url: "git+https://github.com/lukecarriere/attackfee.git", directory: dir }, dir);
    assert.deepEqual(p.bugs, { url: "https://github.com/lukecarriere/attackfee/issues" }, dir);
  }
});

test("each public package has its own keywords", () => {
  for (const [dir, want] of Object.entries(KEYWORDS)) {
    const p = JSON.parse(readFileSync(ROOT + dir + "/package.json", "utf8"));
    assert.deepEqual(p.keywords, want, dir);
  }
});
