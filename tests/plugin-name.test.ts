// Plugin Check treats WordPress in the Plugin Name header as a trademark.
// tests/fixtures/history keeps a header and a display name that contain that word.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-ignore plain JS checker
import { pluginNameProblems } from "../scripts/plugin-name.mjs";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const php = read("../packages/wp-attackfee/attackfee.php");
const copy = read("../docs/copy.md");

test("current header and display name are Attackfee", () => {
  assert.deepEqual(pluginNameProblems(php, copy), []);
});

test("a header fails when Plugin Name contains WordPress", () => {
  const old = read("./fixtures/history/plugin-header.php.txt");
  const problems = pluginNameProblems(old, copy);
  assert.ok(problems.some((p: string) => p.includes("WordPress") && p.includes("Plugin Name")), problems.join("\n"));
});

test("copy fails when the display name contains WordPress", () => {
  const old = read("./fixtures/history/copy-display-name.md.txt");
  const problems = pluginNameProblems(php, old);
  assert.ok(problems.some((p: string) => p.includes("WordPress") && p.includes("display name")), problems.join("\n"));
});
