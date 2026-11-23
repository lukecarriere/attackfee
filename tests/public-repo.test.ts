// A public checkout must not carry private paths, the old product name, or the private predecessor repo.
// HMAC domain-separation labels in packages/settlement-ln/src stay byte-for-byte: they are inputs to
// signatures on offers already stored. The needles are built from pieces so this file does not match itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const LESS = "less" + "spam";
const WORK = "/work" + "space";
const BOX = "/home/" + "box";
const PREDECESSOR = "lukecarriere/" + "toll";

/** Quoted domain-separation labels in packages/settlement-ln/src. Nothing else there may use this prefix. */
const HMAC_LABELS = [
  "toll-offer-v1.",
  "toll-cashu-v1.",
  "toll-cashu-recv-v1.",
  "toll-mint-quote-v1.",
  "toll/settlement/stub/v1",
];

function trackedTextFiles(): { path: string; text: string }[] {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
  const out: { path: string; text: string }[] = [];
  for (const path of files) {
    let buf: Buffer;
    try { buf = readFileSync(ROOT + path); } catch { continue; }
    if (buf.subarray(0, 8000).includes(0)) continue;
    out.push({ path, text: buf.toString("utf8") });
  }
  return out;
}

/** Drop the allowlisted labels, and only from the settlement package that owns them. */
function visible(path: string, line: string): string {
  if (!path.startsWith("packages/settlement-ln/src/")) return line;
  let out = line;
  for (const label of HMAC_LABELS) out = out.split(label).join("");
  return out;
}

function needleHits(path: string, text: string): string[] {
  const hits: string[] = [];
  text.split("\n").forEach((line, i) => {
    const shown = visible(path, line);
    const lower = shown.toLowerCase();
    if (lower.includes(LESS)) hits.push(`${path}:${i + 1}: ${LESS}`);
    if (shown.includes(WORK)) hits.push(`${path}:${i + 1}: ${WORK}`);
    if (shown.includes(BOX)) hits.push(`${path}:${i + 1}: ${BOX}`);
    if (lower.includes(PREDECESSOR)) hits.push(`${path}:${i + 1}: ${PREDECESSOR}`);
  });
  return hits;
}

function isDocOrReadme(path: string): boolean {
  return path.startsWith("docs/") || path.endsWith("/README.md") || path === "README.md" || (!path.includes("/") && path.endsWith(".md"));
}

test("settlement HMAC labels are exactly the stored domain-separation constants", () => {
  const files = trackedTextFiles().filter((f) => f.path.startsWith("packages/settlement-ln/src/"));
  assert.ok(files.length > 0, "settlement sources are tracked");
  const found = new Set<string>();
  for (const f of files) {
    for (const m of f.text.matchAll(/"([^"]*toll[^"]*)"/g)) found.add(m[1]);
  }
  assert.deepEqual([...found].sort(), [...HMAC_LABELS].sort());
});

test("no tracked file names the old product, a machine path, or the private predecessor repo", () => {
  const files = trackedTextFiles();
  assert.ok(files.length > 300, "the scan sees the repo: " + files.length);
  const hits = files.flatMap((f) => needleHits(f.path, f.text));
  assert.deepEqual(hits, []);
  const brand = /\bToll\b/;
  const branded = files.filter((f) => isDocOrReadme(f.path)).flatMap((f) => f.text.split("\n").flatMap((line, i) => brand.test(line) ? [`${f.path}:${i + 1}`] : []));
  assert.deepEqual(branded, [], "Toll branding left in docs or READMEs");
});
