// Site icons: favicon.ico, favicon.svg and apple-touch-icon.png (Attackfee brand, Nov 17, 2026, drawn by
// scripts/brand/render-art.mjs) ship at the site root, byte for byte, and every page carries exactly these tags:
//   <link rel="icon" href="/favicon.ico" sizes="32x32">
//   <link rel="icon" href="/favicon.svg" type="image/svg+xml">
//   <link rel="apple-touch-icon" href="/apple-touch-icon.png">
// icon-192/icon-512 do not ship, and there is no web manifest. The hashes are pinned below so a change is deliberate.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { drain } from "./helpers.ts";
// @ts-ignore plain JS build script
import { build, LEGAL_PAGES, ICON_FILES, ICON_TAGS } from "../website/build.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = ROOT + "website/dist/";
const OUT = build(mkdtempSync(join(tmpdir(), "attackfee-icons-")) + "/", "");
const FILES = ["index", ...LEGAL_PAGES.map((p: any) => p.file), "404"];
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** sha256 of the Attackfee icons as approved (Nov 17, 2026). */
const SOURCE_SHA256: Record<string, string> = {
  "favicon.ico": "37168e91e1a42c6a2e738bc2ba73a1c57aa58dff8c92e32018b05f2656c05b12",
  "favicon.svg": "a9cb360ef9d99154f345a9c925efeb344aa20abecd669a2d9fb632a0f0272b81",
  "apple-touch-icon.png": "a296acfa6802aedd559b422b5660607d53c815c8cabb61c4f2ac1d3071c96119",
};
const TAGS = [
  '<link rel="icon" href="/favicon.ico" sizes="32x32">',
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
];

function walk(dir: string, at = dir): string[] {
  return readdirSync(at).flatMap((f) => statSync(join(at, f)).isDirectory() ? walk(dir, join(at, f)) : [relative(dir, join(at, f))]).sort();
}

/** The icon checks on a dist folder (website/dist as built, or a fresh build). */
function checkIcons(dir: string) {
  for (const f of ICON_FILES) {
    assert.ok(existsSync(dir + f), `${dir}${f} is missing`);
    assert.equal(sha256(readFileSync(dir + f)), SOURCE_SHA256[f], f + " is byte-identical to the approved icon");
  }
  for (const f of FILES) {
    const head = /<head>([\s\S]*?)<\/head>/.exec(readFileSync(dir + f + ".html", "utf8"))![1];
    for (const t of TAGS) assert.equal(head.split(t).length - 1, 1, `${f}.html: exactly one ${t}`);
    assert.deepEqual([...head.matchAll(/<link\b[^>]*rel="(?:icon|shortcut icon|apple-touch-icon[^"]*|mask-icon|manifest)"[^>]*>/gi)].map((m) => m[0]), TAGS, f + ".html: these three icon tags, in order, and no others");
  }
  // Nothing else from the brand set ships: no icon-192/512, no manifest, no other icon or mark.
  const files = walk(dir);
  assert.deepEqual(files.filter((f) => /icon|manifest|attackfee-mark/i.test(f)), [...ICON_FILES].sort(), "only the three icons");
  assert.deepEqual(files.filter((f) => /^icon-(192|512)|\.webmanifest$|(^|\/)manifest\.json$/i.test(f)), []);
  for (const f of FILES) assert.doesNotMatch(readFileSync(dir + f + ".html", "utf8"), /rel="manifest"|icon-192|icon-512/, f);
}

test("icons: the three files are in a fresh build and in website/dist, byte-identical, with all three tags on every page", () => {
  assert.deepEqual(ICON_FILES, ["favicon.ico", "favicon.svg", "apple-touch-icon.png"]);
  assert.equal(ICON_TAGS, TAGS.join(""));
  for (const f of ICON_FILES) assert.equal(sha256(readFileSync(ROOT + "website/" + f)), SOURCE_SHA256[f], "website/" + f + " (the source the build copies)");
  checkIcons(OUT);
  assert.ok(existsSync(DIST), "website/dist/ is missing: run `npm run build` (or `npm run build:website`) first");
  checkIcons(DIST);
});

test("icons: the ICO holds 16 and 32 pixel PNGs, the touch icon is 180 square, the SVG is the brand mark", () => {
  const ico = readFileSync(ROOT + "website/favicon.ico");
  assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)], [0, 1, 2], "an icon file with two images");
  const sizes: number[] = [];
  for (let i = 0; i < 2; i++) {
    const e = 6 + i * 16;
    const w = ico[e] || 256;
    const off = ico.readUInt32LE(e + 12);
    assert.equal(ico.subarray(off + 1, off + 4).toString("latin1"), "PNG", "image " + i + " is a PNG payload");
    assert.equal(ico.readUInt32BE(off + 16), w, "image " + i + " width matches its entry");
    sizes.push(w);
  }
  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 32]);
  const png = readFileSync(ROOT + "website/apple-touch-icon.png");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [180, 180]);
  const svg = readFileSync(ROOT + "website/favicon.svg", "utf8");
  assert.match(svg, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 \d+ \d+"/);
  for (const c of ["#0F1216", "#D8E6EE", "#FF4F1F"]) assert.ok(svg.toUpperCase().includes(c), "brand colour " + c);
  assert.doesNotMatch(svg, /<script|<text|<image|href=/i, "plain shapes only");
});

let server: Server;
let base = "";
const TYPES: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css", ico: "image/x-icon", svg: "image/svg+xml", png: "image/png" };
before(async () => {
  // A static server on website/dist (as built): "/" is index.html, "/privacy" is privacy.html, files by name.
  server = createServer((req, res) => {
    let f = (req.url ?? "/").split("?")[0].replace(/^\//, "") || "index";
    if (/^[a-z]+$/.test(f)) f += ".html";
    if (!/^[a-z-]+\.[a-z]+$/.test(f) || !existsSync(DIST + f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": TYPES[f.split(".").pop()!] ?? "application/octet-stream", "content-security-policy": "default-src 'self'; font-src 'self'" }).end(readFileSync(DIST + f));
  });
  // ATTACKFEE_TEST_PORT picks a fixed port (the team uses 8792-8799 on the shared machine); otherwise any free port.
  await new Promise<void>((r) => server.listen(Number(process.env.ATTACKFEE_TEST_PORT ?? 0), "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(() => server?.close());

test("icons: each file returns 200 from a static server on website/dist with its type and exact bytes; every page links them", async () => {
  for (const f of ICON_FILES) {
    const r = await fetch(`${base}/${f}`);
    assert.equal(r.status, 200, f);
    assert.equal(r.headers.get("content-type"), TYPES[f.split(".").pop()!], f);
    assert.equal(sha256(Buffer.from(await r.arrayBuffer())), SOURCE_SHA256[f], f + " as served");
  }
  for (const p of ["/", ...LEGAL_PAGES.map((p: any) => "/" + p.file)]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    const html = await r.text();
    const hrefs = [...html.matchAll(/<link\b[^>]*rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"], p);
    for (const h of hrefs) assert.equal((await drain(await fetch(base + h))).status, 200, `${p}: ${h}`);
  }
  for (const missing of ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest", "/site.webmanifest", "/manifest.json"]) assert.equal((await drain(await fetch(base + missing))).status, 404, missing + " is not shipped");
});
