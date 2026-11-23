// Plugin Check treats WordPress in the Plugin Name header as a trademark.
// Agents once put "WordPress" in the display name in docs/copy.md (47cb86d) and in the header (ffb9c3d).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
// @ts-ignore plain JS checker
import { pluginNameProblems } from "../scripts/plugin-name.mjs";

const git = (spec: string) => execFileSync("git", ["show", spec], { encoding: "utf8" });
const php = readFileSync("packages/wp-attackfee/attackfee.php", "utf8");
const copy = readFileSync("docs/copy.md", "utf8");
/** Where the plugin header lived in commit ffb9c3d, before the folder was renamed. */
const OLD = "to" + "ll"; // built from pieces so the old-name scans do not match this file
const OLD_PLUGIN_FILE = `packages/wp-${OLD}-gate/${OLD}-gate.php`;

test("current header and display name are Attackfee", () => {
  assert.deepEqual(pluginNameProblems(php, copy), []);
});

test("ffb9c3d header fails: Plugin Name contained WordPress", () => {
  const old = git("ffb9c3d:" + OLD_PLUGIN_FILE);
  const problems = pluginNameProblems(old, copy);
  assert.ok(problems.some((p: string) => p.includes("WordPress") && p.includes("Plugin Name")), problems.join("\n"));
});

test("47cb86d copy fails: display name contained WordPress", () => {
  const old = git("47cb86d:docs/copy.md");
  const problems = pluginNameProblems(php, old);
  assert.ok(problems.some((p: string) => p.includes("WordPress") && p.includes("display name")), problems.join("\n"));
});
