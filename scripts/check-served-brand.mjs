#!/usr/bin/env node
// Old-brand guard for everything the site serves. Scans the built site (website/dist, every file and
// file name), the widget scripts the worker serves, and, given a base URL, the live responses:
// status, every header name and value, and every body, for each page in the sitemap, the files those
// pages reference, llms.txt, robots.txt, sitemap.xml, both /.well-known files, the /v1 API, the
// demo routes and the 404 pages. A hit is any case-insensitive match of the old product names below.
// Usage: node scripts/check-served-brand.mjs [--dist] [--base http://127.0.0.1:8787]
// Exit 1 and one line per hit when anything matches. The pattern is built from pieces so this file
// does not match itself.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const OLD_BRAND = new RegExp(["to" + "ll", "less" + "sp" + "am", "sp" + "am"].join("|"), "i");

/** Every "where: excerpt" hit of the old names in `text`. */
export function hitsIn(where, text) {
  const out = [];
  const re = new RegExp(OLD_BRAND.source, "gi");
  for (const m of text.matchAll(re)) {
    const from = Math.max(0, m.index - 30);
    out.push(`${where}: ...${text.slice(from, m.index + m[0].length + 30).replace(/\s+/g, " ").replace(/[^\x20-\x7e]/g, "?")}...`);
    if (out.length >= 5) { out.push(`${where}: (more hits not shown)`); break; }
  }
  return out;
}

function walk(dir, rel = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = dir + name;
    if (statSync(p).isDirectory()) out.push(...walk(p + "/", rel + name + "/"));
    else out.push(rel + name);
  }
  return out;
}

/** Static scan: every file under website/dist and the served widget scripts, names and bytes. */
export function scanDist(dist = ROOT + "website/dist/", widget = ROOT + "packages/widget/dist/") {
  const hits = [];
  const files = walk(dist).map((f) => ["dist/" + f, dist + f]);
  for (const f of walk(widget)) if (/^attackfee[^/]*\.js$/.test(f)) files.push(["widget/" + f, widget + f]);
  for (const [name, path] of files) {
    hits.push(...hitsIn("name " + name, name));
    // latin1 keeps every byte, so names inside the plugin zip and text in any file are seen.
    hits.push(...hitsIn(name, readFileSync(path).toString("latin1")));
  }
  return { files: files.length, hits };
}

const REF = /(?:href|src)="(\/(?!\/)[^"#?]*)/g;

async function get(base, path, init = {}) {
  const r = await fetch(base + path, { redirect: "manual", ...init });
  const body = Buffer.from(await r.arrayBuffer());
  return { status: r.status, headers: [...r.headers], body };
}

/** Live scan of `base`. Returns the route results and every hit. */
export async function scanLive(base) {
  base = base.replace(/\/$/, "");
  const hits = [];
  const routes = [];
  const seen = new Set();
  const check = async (label, path, init) => {
    const key = label + " " + path;
    if (seen.has(key)) return null;
    seen.add(key);
    const r = await get(base, path, init);
    routes.push(`${label} ${path} -> ${r.status}`);
    hits.push(...hitsIn(`${label} ${path} url`, path));
    for (const [k, v] of r.headers) hits.push(...hitsIn(`${label} ${path} header`, `${k}: ${v}`));
    hits.push(...hitsIn(`${label} ${path} body`, r.body.toString("latin1")));
    return r;
  };
  const sitemap = await check("GET", "/sitemap.xml");
  const pages = new Set(["/", "/demo", "/docs", "/download", "/mission", "/vision", "/values", "/ecosystem", "/privacy", "/terms", "/support"]);
  if (sitemap && sitemap.status === 200) for (const m of sitemap.body.toString("utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) pages.add(new URL(m[1]).pathname);
  const refs = new Set();
  for (const p of pages) {
    const r = await check("GET", p);
    if (r) for (const m of r.body.toString("utf8").matchAll(REF)) refs.add(m[1]);
  }
  for (const p of ["/llms.txt", "/robots.txt", "/.well-known/attackfee.json", "/.well-known/agents.json", "/v1/health", "/v1/price", "/v1/price?class=write", "/v1/challenge?class=write", "/v1/status", "/demo/stats", "/demo/stats/daily", "/no-such-page", "/v1/no-such-route", "/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"]) await check("GET", p);
  for (const ref of refs) {
    const r = await check("GET", ref);
    if (r && ref.endsWith(".css")) for (const m of r.body.toString("utf8").matchAll(/url\((\/[^)"']+)\)/g)) await check("GET", m[1]);
    if (r && ref.endsWith(".js")) for (const m of r.body.toString("utf8").matchAll(/["'](\/[A-Za-z0-9_./-]+\.js)["']/g)) await check("GET", m[1]);
  }
  const form = { "content-type": "application/x-www-form-urlencoded" };
  await check("POST", "/demo/contact", { method: "POST", headers: form, body: "message=hi" });
  await check("POST(json)", "/demo/contact", { method: "POST", headers: { ...form, accept: "application/json" }, body: "message=hi" });
  await check("POST(agent)", "/demo/contact", { method: "POST", headers: { ...form, "attackfee-client": "agent" }, body: "message=hi" });
  await check("POST", "/v1/demo/agent", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  await check("POST", "/v1/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  await check("POST", "/v1/siteverify", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  return { routes, hits };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let hits = [];
  if (args.includes("--dist")) {
    const r = scanDist();
    console.log(`dist: scanned ${r.files} files, ${r.hits.length} hits`);
    hits.push(...r.hits);
  }
  const i = args.indexOf("--base");
  if (i >= 0) {
    const r = await scanLive(args[i + 1]);
    for (const line of r.routes) console.log(line);
    console.log(`live: ${r.routes.length} requests, ${r.hits.length} hits`);
    hits.push(...r.hits);
  }
  for (const h of hits) console.log("HIT " + h);
  process.exit(hits.length ? 1 : 0);
}
