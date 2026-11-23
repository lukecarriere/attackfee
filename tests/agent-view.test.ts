// Agent view (edge): the same URL answers Markdown to a request that asks for text/markdown, or that
// comes from a known AI agent. The user agent list lives in one module. Both variants carry
// Vary: Accept, User-Agent. Only GET and HEAD of a page are negotiated; writes, the API and files are untouched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { workerHandles } from "../packages/edge-cf/src/host-redirect.ts";
import { AI_AGENTS, isAiAgent, acceptsMarkdown, wantsMarkdown, markdownTwin, serveSite, MARKDOWN_TYPE, AGENT_VARY } from "../packages/edge-cf/src/agent-view.ts";

const CHROME = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

test("the AI agent list is exactly the agreed tokens, once each", () => {
  assert.deepEqual([...AI_AGENTS], [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot",
    "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "Bytespider", "CCBot", "Amazonbot",
    "meta-externalagent", "DuckAssistBot", "MistralAI-User", "cohere-ai",
  ]);
  assert.equal(new Set(AI_AGENTS.map((a) => a.toLowerCase())).size, AI_AGENTS.length);
});

test("isAiAgent matches each token inside a real user agent string, in any case", () => {
  const real = [
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0)",
    "Google-Extended",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1)",
    "Applebot-Extended/0.1",
    "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider)",
    "CCBot/2.0",
    "Mozilla/5.0 (compatible; Amazonbot/0.1)",
    "meta-externalagent/1.1",
    "DuckAssistBot/1.2",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; MistralAI-User/1.0)",
    "cohere-ai",
    "mozilla/5.0 (compatible; gptbot/1.2)",
  ];
  for (const ua of real) assert.equal(isAiAgent(ua), true, ua);
  for (const ua of [CHROME, "Googlebot/2.1", "bingbot/2.0", "curl/8.5.0", "NotGPTBot/1.0", "GPTBotty", "", null, undefined]) {
    assert.equal(isAiAgent(ua), false, String(ua));
  }
});

test("acceptsMarkdown reads q-values: text/markdown must be listed and not lose to text/html", () => {
  const yes = ["text/markdown", "TEXT/MARKDOWN; Q=1", "text/markdown; charset=utf-8", "text/html;q=0.5, text/markdown", "text/markdown, text/html", "text/html, text/markdown", "application/json, text/markdown;q=0.1", "text/markdown;q=0.9, text/*;q=0.8"];
  const no = ["text/markdown;q=0", "text/markdown;q=0.9, text/html", "text/markdown;q=0.5, */*", "text/markdown;q=0.5, text/*", BROWSER_ACCEPT, "*/*", "text/*", "text/plain", "text/markdown;q=2", "text/markdown;q=abc", "", null, undefined];
  for (const a of yes) assert.equal(acceptsMarkdown(a), true, a);
  for (const a of no) assert.equal(acceptsMarkdown(a), false, String(a));
});

test("wantsMarkdown: an AI agent gets Markdown unless it refuses text/markdown with q=0; a browser does not", () => {
  const h = (ua: string, accept?: string) => new Headers({ "user-agent": ua, ...(accept === undefined ? {} : { accept }) });
  assert.equal(wantsMarkdown(h("GPTBot/1.2")), true);
  assert.equal(wantsMarkdown(h("GPTBot/1.2", BROWSER_ACCEPT)), true);
  assert.equal(wantsMarkdown(h("GPTBot/1.2", "text/html, text/markdown;q=0")), false);
  assert.equal(wantsMarkdown(h(CHROME, BROWSER_ACCEPT)), false);
  assert.equal(wantsMarkdown(h(CHROME, "text/markdown")), true);
  assert.equal(wantsMarkdown(h("curl/8.5.0")), false);
});

test("markdownTwin maps a page path to its .md file and leaves files, slashes and the API alone", () => {
  assert.equal(markdownTwin("/"), "/index.md");
  assert.equal(markdownTwin("/docs"), "/docs.md");
  assert.equal(markdownTwin("/docs/widget"), "/docs/widget.md");
  assert.equal(markdownTwin("/download"), "/download.md");
  assert.equal(markdownTwin("/privacy"), "/privacy.md");
  assert.equal(markdownTwin("/demo"), "/demo.md");
  for (const p of ["/docs/", "/site.css", "/index.md", "/llms.txt", "/img/hail-grid.svg", "/download/attackfee-1.0.zip", "/v1/price", "/.well-known/attackfee.json", "/demo/contact", "/attackfee/v1/attackfee.js"]) {
    assert.equal(markdownTwin(p), null, p);
  }
});

test("Markdown twins are site files: the asset binding serves them; API, script and demo paths stay on the worker", () => {
  for (const p of ["/index.md", "/.md", "/docs.md", "/docs/widget.md", "/download.md", "/demo.md", "/llms-full.txt", "/llms-learn.txt"]) assert.equal(workerHandles(p), false, p);
  for (const p of ["/v1/price.md", "/attackfee/v1/x.md", "/demo/contact.md", "/.well-known/attackfee.md", "/demo/contact", "/search"]) assert.equal(workerHandles(p), true, p);
});

/** A fake asset binding: a map of path -> [content type, body]. Unknown paths are 404 HTML. */
function assets(files: Record<string, [string, string]>) {
  const seen: string[] = [];
  return {
    seen,
    async fetch(req: Request): Promise<Response> {
      const path = new URL(req.url).pathname;
      seen.push(req.method + " " + path);
      const f = files[path];
      if (!f) return new Response("<!doctype html><h1>Page not found</h1>", { status: 404, headers: { "content-type": "text/html" } });
      return new Response(req.method === "HEAD" ? null : f[1], { status: 200, headers: { "content-type": f[0], etag: '"' + path + '"', "x-frame-options": "DENY" } });
    },
  };
}
const FILES: Record<string, [string, string]> = {
  "/": ["text/html", "<!doctype html><title>Home</title><h1>Open to read.</h1>"],
  "/index.md": ["text/markdown", "# Open to read.\n"],
  "/docs": ["text/html", "<!doctype html><h1>Docs</h1>"],
  "/docs.md": ["text/markdown", "# Docs\n"],
  "/site.css": ["text/css", "body{}"],
};
const req = (path: string, headers: Record<string, string> = {}, method = "GET") => new Request("https://site.example" + path, { method, headers });

test("serveSite: a browser gets the same HTML bytes plus Vary; an agent gets the Markdown twin with the Markdown type and Vary", async () => {
  const a = assets(FILES);
  const human = await serveSite(req("/", { "user-agent": CHROME, accept: BROWSER_ACCEPT }), a);
  assert.equal(human.status, 200);
  assert.equal(human.headers.get("content-type"), "text/html");
  assert.equal(human.headers.get("vary"), AGENT_VARY);
  assert.equal(human.headers.get("x-frame-options"), "DENY", "asset headers are kept");
  assert.equal(await human.text(), FILES["/"][1]);
  for (const headers of [{ "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2)" }, { "user-agent": CHROME, accept: "text/markdown" }] as Record<string, string>[]) {
    const md = await serveSite(req("/", headers), a);
    assert.equal(md.status, 200);
    assert.equal(md.headers.get("content-type"), MARKDOWN_TYPE);
    assert.equal(MARKDOWN_TYPE, "text/markdown; charset=utf-8");
    assert.equal(md.headers.get("vary"), "Accept, User-Agent");
    assert.equal(md.headers.get("etag"), '"/index.md"', "the twin keeps its own validator");
    assert.equal(await md.text(), FILES["/index.md"][1]);
  }
  const head = await serveSite(req("/docs", { "user-agent": "ClaudeBot/1.0" }, "HEAD"), a);
  assert.equal(head.headers.get("content-type"), MARKDOWN_TYPE);
  assert.equal(await head.text(), "");
  assert.ok(a.seen.includes("HEAD /docs.md"));
});

test("serveSite: .md URLs are served as Markdown, /.md is the home twin, and files and missing twins fall back unchanged", async () => {
  const a = assets(FILES);
  for (const p of ["/index.md", "/.md"]) {
    const r = await serveSite(req(p), a);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get("content-type"), MARKDOWN_TYPE, p);
    assert.equal(await r.text(), FILES["/index.md"][1], p);
  }
  const css = await serveSite(req("/site.css", { "user-agent": "GPTBot/1.2" }), a);
  assert.equal(css.headers.get("content-type"), "text/css");
  assert.equal(css.headers.get("vary"), null, "a file is not negotiated");
  const missing = await serveSite(req("/pricing", { "user-agent": "GPTBot/1.2" }), a);
  assert.equal(missing.status, 404, "no twin: the normal answer, here the 404 page");
  assert.equal(missing.headers.get("vary"), AGENT_VARY);
  const missingMd = await serveSite(req("/nope.md"), a);
  assert.equal(missingMd.status, 404);
});

test("serveSite: a POST is passed through untouched, even from an AI agent asking for Markdown", async () => {
  const a = assets(FILES);
  const r = await serveSite(req("/", { "user-agent": "GPTBot/1.2", accept: "text/markdown" }, "POST"), a);
  assert.deepEqual(a.seen, ["POST /"]);
  assert.equal(r.headers.get("vary"), null);
});
