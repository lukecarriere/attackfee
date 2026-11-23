// Attackfee is a standalone product: the public identifiers it inherited are renamed, with no aliases.
// This guard fails if any old public name comes back in a tracked file. Exempt by location: the licence
// files, kept byte-identical. The patterns are built from pieces so this file does not match itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const T = "to" + "ll";
const TC = "To" + "ll";

/** Old public identifier -> how it is matched. */
export const OLD_IDENTIFIERS: [string, RegExp][] = [
  [`${T}.js`, new RegExp(`\\b${T}\\.js(?!on)\\b`)],
  [`/.well-known/${T}.json`, new RegExp(`\\b${T}\\.json\\b`)],
  [`${T}.js or ${T}.json written as a regex`, new RegExp(`\\b${T}(?:\\(\\?:[^)]*\\)\\?)?\\\\\\.js`)],
  [`data-${T}`, new RegExp(`\\bdata-${T}\\b`)],
  [`${TC}-Client`, new RegExp(`(?<![a-z0-9])${T}[-_]client\\b`, "i")],
  [`${T}_pass`, new RegExp(`\\b${T}[_-]pass\\b`, "i")],
  [`Authorization: ${TC}`, new RegExp(`authorization:\\s*${T}\\b|\\(\\?:${TC}\\|Bearer|\\^${TC}\\\\s`, "i")],
  ["@attackfee-" + "placeholder", new RegExp("@attackfee-" + "placeholder\\b")],
  [`@${T}/`, new RegExp(`@${T}/`)],
  [`${T.toUpperCase()}_STORE`, new RegExp(`\\b${T.toUpperCase()}_STORE\\b`)],
  [`${TC}StoreDO`, new RegExp(`\\b${TC}StoreDO\\b`)],
  [`${T}-edge-local`, new RegExp(`\\b${T}-edge-local\\b`)],
  [`${T}-mcp`, new RegExp(`\\b${T}-mcp\\b`)],
  [`window.${T}`, new RegExp(`window(?:\\s+as\\s+any\\))?\\.${T}\\b`)],
  [`is not a ${TC} manifest`, new RegExp(`is not a ${TC} manifest`)],
  [`${T} config:`, new RegExp(`\\b${T} config:`)],
  [`${T.toUpperCase()}_KV`, new RegExp(`\\b${T.toUpperCase()}_KV\\b`)],
];

/** Paths where the old names may stay: licence files, kept byte-identical. */
export function exempt(path: string): boolean {
  const base = path.split("/").pop()!;
  return /^(LICENSE|LICENSE\.txt|LICENSES\.txt|PSTACK-LICENSE|COPYING)$/i.test(base);
}

/** Every hit of an old identifier in `text`, as "path:line: name". */
export function oldIdentifierHits(path: string, text: string): string[] {
  const out: string[] = [];
  text.split("\n").forEach((line, i) => {
    for (const [name, re] of OLD_IDENTIFIERS) if (re.test(line)) out.push(`${path}:${i + 1}: ${name}`);
  });
  return out;
}

function trackedTextFiles(): string[] {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
  return files.filter((f) => {
    let buf: Buffer;
    try { buf = readFileSync(ROOT + f); } catch { return false; } // symlink to a build folder, or deleted
    return !buf.subarray(0, 8000).includes(0);
  });
}

test("canary: every old identifier is caught, and the new names are not", () => {
  const old = [`<script src="/${T}/v1/${T}.js">`, `GET /.well-known/${T}.json`, `<form data-${T}="write">`, `<form data-${T}-checkbox="true">`, `${TC}-Client: agent`, `"${T}-client": "agent"`, `HTTP_${T.toUpperCase()}_CLIENT`, `${T}_pass=abc`, `name="${T}-pass"`, `Authorization: ${TC} <pass>`, "@attackfee-" + "placeholder/server", `@${T}/protocol`, `${T.toUpperCase()}_STORE`, `${TC}StoreDO`, `name = "${T}-edge-local"`, `npx ${T}-mcp`, `/\\/${T}\\.js$/`, `/${T}\\.json/`, `/${T}(?:\\.worker)?\\.js$/`, `window.${T}.getPass("write")`, `(window as any).${T} = api`, `is not a ${TC} manifest (HTTP 404)`, `${T} config: site_id is required`, `${T.toUpperCase()}_KV`];
  for (const s of old) assert.notDeepEqual(oldIdentifierHits("x", s), [], s);
  const now = ['<script src="/attackfee/v1/attackfee.js">', "GET /.well-known/attackfee.json", '<form data-attackfee="write">', "Attackfee-Client: agent", "attackfee_pass=abc", "Authorization: Attackfee <pass>", "@attackfee/server", "ATTACKFEE_STORE", "AttackfeeStoreDO", "attackfee-edge-local", "attackfee-mcp", "window.attackfee.getPass(\"write\")", "is not an Attackfee manifest (HTTP 404)", "attackfee config: site_id is required", "ATTACKFEE_KV", "(req as any).attackfee = claims", "ATTACKFEE_SITE_URL", "ATTACKFEE_SECRET"];
  for (const s of now) assert.deepEqual(oldIdentifierHits("x", s), [], s);
});

test("exempt paths are only the licence files", () => {
  for (const p of ["LICENSE", "packages/wp-attackfee/LICENSE", "website/fonts/arvo/LICENSE.txt"]) assert.ok(exempt(p), p);
  for (const p of ["README.md", "docs/protocol.md", "packages/widget/src/index.ts", "tests/licence.test.ts", "RENAMES.md", "scripts/check-www-redirect.sh"]) assert.ok(!exempt(p), p);
});

test("no old public identifier appears in a tracked file outside the exempt paths", () => {
  const files = trackedTextFiles();
  assert.ok(files.length > 300, "the scan sees the repo: " + files.length);
  const hits = files.filter((f) => !exempt(f)).flatMap((f) => oldIdentifierHits(f, readFileSync(ROOT + f, "utf8")));
  assert.deepEqual(hits, [], "old names left:\n" + hits.join("\n"));
});
