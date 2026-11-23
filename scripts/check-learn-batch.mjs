#!/usr/bin/env node
// Read-only check of a learning-center batch against a built site or a local worker.
// Every request is a GET with User-Agent attackfee-learn-check/1.0.
// Usage: node scripts/check-learn-batch.mjs --base https://attackfee.dev --batch <dir|manifest>
//        node scripts/check-learn-batch.mjs --base http://127.0.0.1:PORT --paths /learn,/learn/concepts/what-is-a-write-surface
// --agent-read also runs scripts/live-checks.mjs --only agentRead.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { learnPublicPath, LEARN_HUBS, LLMS_BYTE_CAP, namesPath } from "../website/learn.mjs";
import { mainBlocks, markdownPlain } from "../website/agent-text.mjs";
import { lintText } from "./copy-lib.mjs";
import { OLD_BRAND } from "./check-served-brand.mjs";

const UA = "attackfee-learn-check/1.0";
const BANNED = new RegExp(["ca", "pt", "cha"].join(""), "i");
const squash = (s) => s.replace(/\s+/g, "");

function argsOf(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--paths" && argv[i + 1]) out.push(...argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : "";
}

function walk(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const rel = prefix ? prefix + "/" + name : name;
    const abs = dir + "/" + name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else if (name.endsWith(".md")) out.push(rel);
  }
  return out;
}

function pathsFromBatch(batch) {
  if (!batch) return [];
  if (!existsSync(batch)) throw new Error("learn-batch: batch not found");
  if (statSync(batch).isDirectory()) return walk(batch).map(learnPublicPath);
  const text = readFileSync(batch, "utf8");
  if (batch.endsWith(".json")) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.paths;
  }
  return text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

function names(text, path) {
  return namesPath(text, path);
}

function twinOf(path) {
  return path + ".md";
}

async function get(url) {
  const res = await fetch(url, { method: "GET", headers: { "user-agent": UA, accept: "*/*" }, redirect: "follow" });
  const body = await res.text();
  return { status: res.status, type: res.headers.get("content-type") || "", body };
}

function linksOf(html, md) {
  const hrefs = [...html.matchAll(/\shref="(\/[^"]*)"/g)].map((m) => m[1]);
  const fromMd = [...md.matchAll(/\]\((\/[^)\s]+)\)/g)].map((m) => m[1]);
  return [...hrefs, ...fromMd].map((u) => u.split("#")[0].split("?")[0]).filter((u) => u.startsWith("/") && !u.startsWith("//"));
}

function banned(html) {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  const description = /<meta name="description" content="([^"]*)">/.exec(html)?.[1] ?? "";
  const heads = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
  return [title, description, ...heads].filter((s) => BANNED.test(s));
}

async function main() {
  const argv = process.argv.slice(2);
  const base = (flag(argv, "--base") || "").replace(/\/$/, "");
  if (!base || argv.includes("--help")) {
    console.error("learn-batch: --base is required");
    process.exit(2);
  }
  const paths = [...new Set([...pathsFromBatch(flag(argv, "--batch")), ...argsOf(argv)])];
  if (!paths.length) {
    console.error("learn-batch: pass --batch or --paths");
    process.exit(2);
  }
  const failures = [];
  const fail = (msg) => failures.push(msg);
  const pages = [];
  for (const path of paths) {
    const html = await get(base + path);
    const twin = await get(base + twinOf(path));
    if (html.status !== 200 || !html.type.startsWith("text/html")) fail(path + ": HTML " + html.status + " " + html.type);
    if (twin.status !== 200 || !twin.type.startsWith("text/markdown")) fail(path + ": markdown " + twin.status + " " + twin.type);
    const plain = squash(markdownPlain(twin.body));
    for (const block of mainBlocks(html.body)) if (!plain.includes(squash(block))) fail(path + ": missing from twin: " + block);
    for (const hit of [...lintText("website/dist" + path + ".html", html.body), ...lintText("website/dist" + twinOf(path), twin.body)]) fail(path + ": lint: " + hit.term);
    if (OLD_BRAND.test(html.body) || OLD_BRAND.test(twin.body)) fail(path + ": old product name");
    for (const s of banned(html.body)) fail(path + ": disallowed heading: " + s);
    pages.push({ path, html: html.body, md: twin.body });
  }
  const sm = await get(base + "/sitemap.xml");
  const llms = await get(base + "/llms.txt");
  const full = await get(base + "/llms-full.txt");
  const shard = await get(base + "/llms-learn.txt");
  if (sm.status !== 200) fail("sitemap " + sm.status);
  if (llms.status !== 200 || !llms.type.startsWith("text/plain")) fail("llms.txt " + llms.status + " " + llms.type);
  if (full.status !== 200) fail("llms-full.txt " + full.status);
  if (shard.status !== 200 || !shard.type.startsWith("text/plain")) fail("llms-learn.txt " + shard.status + " " + shard.type);
  if (Buffer.byteLength(llms.body) > LLMS_BYTE_CAP) fail("llms.txt is " + Buffer.byteLength(llms.body) + " bytes");
  if (!names(llms.body, "/llms-learn.txt")) fail("llms.txt does not name /llms-learn.txt");
  for (const [id] of LEARN_HUBS) {
    if (!names(llms.body, "/learn/" + id)) fail("llms.txt does not name /learn/" + id);
  }
  if (sm.body.includes("llms-learn")) fail("sitemap names llms-learn.txt");
  const learnLocs = [...sm.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => {
    try { return new URL(m[1]).pathname; } catch { return m[1]; }
  }).filter((p) => p === "/learn" || p.startsWith("/learn/"));
  for (const path of learnLocs) {
    if (!names(shard.body, path)) fail(path + ": sitemap learn page missing from llms-learn.txt");
  }
  for (const page of pages) {
    if (!names(sm.body, page.path)) fail(page.path + ": not in sitemap");
    if (!names(shard.body, page.path)) fail(page.path + ": not in llms-learn.txt");
    if (!names(llms.body, page.path) && !names(shard.body, page.path)) fail(page.path + ": not named in the agent-readable index");
    if (!full.body.includes(page.md.trimEnd())) fail(page.path + ": twin missing from llms-full.txt");
  }
  const seen = new Set();
  for (const page of pages) {
    for (const href of linksOf(page.html, page.md)) {
      const path = href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;
      if (!path || seen.has(path)) continue;
      seen.add(path);
      const res = await get(base + (path || "/"));
      if (res.status !== 200) fail("broken link " + href + " -> " + res.status);
    }
  }
  if (argv.includes("--agent-read")) {
    const script = fileURLToPath(new URL("./live-checks.mjs", import.meta.url));
    const ran = spawnSync(process.execPath, [script, "--only", "agentRead", "--base", base], { stdio: "inherit" });
    if (ran.status !== 0) fail("agentRead");
  }
  if (failures.length) {
    for (const f of failures) console.error("learn-batch: " + f);
    process.exit(1);
  }
  console.log("learn-batch: ok");
}

await main();
