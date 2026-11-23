// Sitemap <lastmod> and Learning Center JSON-LD dateModified.
// Search engines read the sitemap. The learn pages publish the same date as dateModified.
// A page with no commit after the public root keeps website/lastmod.json. A later commit wins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, discoveryFiles, pagePath, sourceLastmod, LASTMOD_ROOT } from "../website/build.mjs";

const SITE = "https://site.example";
const ROOT = new URL("..", import.meta.url).pathname;
const RANGE = LASTMOD_ROOT + "..HEAD";
const HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PARENT = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const map = JSON.parse(readFileSync(ROOT + "website/lastmod.json", "utf8")) as Record<string, string>;

function specPaths(file: string): string[] {
  if (file === "index") return ["website/build.mjs", "docs/copy.md"];
  if (file === "demo") return ["website/demo.html"];
  return ["website/" + file + ".md"];
}

function changedSinceRoot(file: string): boolean {
  const out = execFileSync("git", ["log", "-1", "--format=%H", RANGE, "--", ...specPaths(file)], { cwd: ROOT, encoding: "utf8" }).trim();
  return /^[0-9a-f]{40}$/i.test(out);
}

/** Scripted git. Each call consumes one reply. An Error is thrown. */
function gitSpy(replies: Array<string | Error>) {
  const calls: string[][] = [];
  let i = 0;
  const git = (args: string[]) => {
    calls.push(args);
    const reply = replies[i++];
    if (reply === undefined) throw new Error("unexpected git " + args.join(" "));
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { calls, git };
}

const unavailable = new Error("git unavailable");

test("the public root constant is the initial release commit", () => {
  assert.equal(LASTMOD_ROOT, "107d367eea277751bf94f00d9cb93224edde431f");
});

test("a commit after the root uses the git date, including one older than the map", () => {
  const changed = gitSpy([HASH + "\n", "2020-01-01\n"]);
  assert.equal(sourceLastmod("privacy", changed.git), "2020-01-01");
  assert.deepEqual(changed.calls[0], ["log", "-1", "--format=%H", RANGE, "--", "website/privacy.md"]);
  assert.deepEqual(changed.calls[1], ["log", "-1", "--format=%cs", "--", "website/privacy.md"]);
  const blank = gitSpy([HASH, "not-a-date"]);
  assert.equal(sourceLastmod("privacy", blank.git), "");
});

test("no commit after the root uses the map, and a missing id uses git", () => {
  const mapped = gitSpy(["\n"]);
  assert.equal(sourceLastmod("terms", mapped.git), map.terms);
  assert.equal(mapped.calls.length, 1);
  const added = gitSpy(["", "2026-12-01"]);
  assert.equal("learn/not-in-the-baseline" in map, false);
  assert.equal(sourceLastmod("learn/not-in-the-baseline", added.git), "2026-12-01");
  assert.deepEqual(added.calls[1], ["log", "-1", "--format=%cs", "--", "website/learn/not-in-the-baseline.md"]);
  assert.equal(sourceLastmod("learn/not-in-the-baseline", gitSpy(["", "yesterday"]).git), "");
});

test("path mapping: index is the builder and the copy file, demo is the demo page", () => {
  const index = gitSpy(["\n"]);
  assert.equal(sourceLastmod("index", index.git), map.index);
  assert.deepEqual(index.calls[0], ["log", "-1", "--format=%H", RANGE, "--", "website/build.mjs", "docs/copy.md"]);
  const demo = gitSpy([HASH, "2026-12-02"]);
  assert.equal(sourceLastmod("demo", demo.git), "2026-12-02");
  assert.deepEqual(demo.calls[0].slice(demo.calls[0].indexOf("--") + 1), ["website/demo.html"]);
  const guide = gitSpy([HASH, "2026-12-03"]);
  assert.equal(sourceLastmod("docs/ask", guide.git), "2026-12-03");
  assert.deepEqual(guide.calls[1].slice(guide.calls[1].indexOf("--") + 1), ["website/docs/ask.md"]);
});

test("when the root is unreachable, a mapped id keeps the baseline unless a real later commit exists", () => {
  const none = gitSpy([unavailable, ""]);
  assert.equal(sourceLastmod("demo", none.git), map.demo);
  assert.deepEqual(none.calls[1], ["log", "-1", "--format=%H%n%cs", "--", "website/demo.html"]);

  const boundary = gitSpy([unavailable, HASH + "\n2099-01-01\n", unavailable]);
  assert.equal(sourceLastmod("privacy", boundary.git), map.privacy);
  assert.deepEqual(boundary.calls[2], ["rev-parse", "--verify", "--quiet", HASH + "^"]);

  const older = gitSpy([unavailable, HASH + "\n2001-01-01", PARENT + "\n"]);
  assert.equal(sourceLastmod("privacy", older.git), map.privacy);

  const newer = gitSpy([unavailable, HASH + "\n2099-01-02", PARENT]);
  assert.equal(sourceLastmod("privacy", newer.git), "2099-01-02");

  const down = gitSpy([unavailable, unavailable]);
  assert.equal(sourceLastmod("support", down.git), map.support);
});

test("when the root is unreachable and the id is not in the map, the git date is used", () => {
  const id = "learn/not-in-the-baseline";
  const boundary = gitSpy([unavailable, HASH + "\n2099-03-03", unavailable]);
  assert.equal(sourceLastmod(id, boundary.git), "2099-03-03");
  const real = gitSpy([unavailable, HASH + "\n2099-03-04", PARENT]);
  assert.equal(sourceLastmod(id, real.git), "2099-03-04");
  assert.equal(sourceLastmod(id, gitSpy([unavailable, ""]).git), "");
  assert.equal(sourceLastmod(id, gitSpy([unavailable, unavailable]).git), "");
});

test("a range reply that is not a commit hash leaves a mapped page on the baseline", () => {
  const junk = gitSpy(["not a hash\n", "2099-01-01"]);
  assert.equal(sourceLastmod("privacy", junk.git), map.privacy);
  assert.equal(junk.calls.length, 1);
});

test("pages with no commit after the public root keep the baseline in the sitemap and learn JSON-LD", () => {
  assert.equal(LASTMOD_ROOT, "107d367eea277751bf94f00d9cb93224edde431f");
  assert.deepEqual(Object.keys(map).sort(), [...discoveryFiles()].sort());
  const dir = build(mkdtempSync(join(tmpdir(), "attackfee-lastmod-")) + "/", SITE, () => {});
  const sm = readFileSync(dir + "sitemap.xml", "utf8");
  let pages = 0;
  let learn = 0;
  for (const id of Object.keys(map)) {
    if (changedSinceRoot(id)) continue;
    pages++;
    const loc = SITE + pagePath(id);
    assert.equal(sourceLastmod(id), map[id], id);
    assert.ok(sm.includes(`<loc>${loc}</loc><lastmod>${map[id]}</lastmod>`), id + " sitemap");
    if (!id.startsWith("learn/")) continue;
    learn++;
    const html = readFileSync(dir + id + ".html", "utf8");
    const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    assert.ok(body, id + " json-ld");
    const doc = JSON.parse(body) as { "@graph": { "@type": string; dateModified?: string }[] };
    const web = doc["@graph"].find((n) => n["@type"] === "WebPage");
    assert.equal(web?.dateModified, map[id], id);
    for (const node of doc["@graph"]) {
      if ("dateModified" in node) assert.equal(node.dateModified, map[id], id + " " + node["@type"]);
    }
  }
  assert.ok(pages >= 100, "checked " + pages);
  assert.ok(learn >= 50, "learn pages " + learn);
});
