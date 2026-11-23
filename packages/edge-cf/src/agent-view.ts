import { createHash } from "node:crypto";

// Agent view: the same page URL answers Markdown to an AI agent. A request gets the page's Markdown
// twin (built from the same content as the HTML, website/agent-text.mjs) when its Accept header prefers
// text/markdown, or when its user agent names a known AI agent below. Everyone else gets the HTML bytes
// unchanged. Both variants carry Vary: Accept, User-Agent so a cache keeps them apart. Only GET and
// HEAD of an extensionless page are negotiated; writes, the gate, the API and site files never reach
// this choice. The user agent list is the one list: robots.txt names the same agents (tests/agent-markdown.test.ts).

/** Known AI agent user agent tokens, matched case-insensitively as whole tokens. */
export const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "meta-externalagent",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
] as const;

export const MARKDOWN_TYPE = "text/markdown; charset=utf-8";
export const AGENT_VARY = "Accept, User-Agent";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A token is bounded by anything that is not a letter, digit or hyphen, so "GPTBotty" and "NotGPTBot" do not match.
const AGENT_RE = new RegExp(`(?:^|[^a-z0-9-])(?:${AI_AGENTS.map(escapeRe).join("|")})(?![a-z0-9-])`, "i");

/** True when `ua` names one of AI_AGENTS. */
export function isAiAgent(ua: string | null | undefined): boolean {
  return typeof ua === "string" && AGENT_RE.test(ua);
}

/** Each media range in an Accept header with its q-value. A malformed q drops the range. */
function ranges(accept: string): { type: string; q: number }[] {
  const out: { type: string; q: number }[] = [];
  for (const part of accept.split(",")) {
    const [type, ...params] = part.split(";").map((s) => s.trim().toLowerCase());
    if (!type) continue;
    let q = 1;
    let ok = true;
    for (const p of params) {
      const m = /^q\s*=\s*(.*)$/.exec(p);
      if (!m) continue;
      if (!/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(m[1])) { ok = false; break; }
      q = Number(m[1]);
    }
    if (ok) out.push({ type, q });
  }
  return out;
}

/** The q-value text/markdown gets when it is listed by name, or null when it is not listed. Wildcards do not count. */
function markdownQ(list: { type: string; q: number }[]): number | null {
  const hit = list.filter((r) => r.type === "text/markdown");
  return hit.length ? Math.max(...hit.map((r) => r.q)) : null;
}

/** The q-value text/html gets, from its most specific matching range (RFC 9110 12.5.1). */
function htmlQ(list: { type: string; q: number }[]): number {
  for (const t of ["text/html", "text/*", "*/*"]) {
    const hit = list.filter((r) => r.type === t);
    if (hit.length) return Math.max(...hit.map((r) => r.q));
  }
  return 0;
}

/** True when Accept lists text/markdown by name with q > 0 and at least the q that text/html gets. */
export function acceptsMarkdown(accept: string | null | undefined): boolean {
  if (typeof accept !== "string" || accept.trim() === "") return false;
  const list = ranges(accept);
  const md = markdownQ(list);
  return md !== null && md > 0 && md >= htmlQ(list);
}

/** Markdown for an AI agent (unless it refuses text/markdown with q=0) or for an Accept that prefers it. */
export function wantsMarkdown(headers: Headers): boolean {
  const accept = headers.get("accept");
  if (isAiAgent(headers.get("user-agent"))) {
    const md = typeof accept === "string" ? markdownQ(ranges(accept)) : null;
    return md !== 0;
  }
  return acceptsMarkdown(accept);
}

/** The Markdown twin of an extensionless page path ("/" -> "/index.md", "/docs/widget" -> "/docs/widget.md"), else null. */
export function markdownTwin(pathname: string): string | null {
  if (pathname === "/") return "/index.md";
  if (pathname.endsWith("/")) return null; // the asset binding redirects a trailing slash first
  if (pathname.startsWith("/v1/") || pathname.startsWith("/attackfee/") || pathname.startsWith("/demo/") || pathname.startsWith("/.well-known/")) return null;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (last === "" || last.includes(".")) return null;
  return pathname + ".md";
}

interface Assets { fetch(req: Request): Promise<Response>; }

function retype(res: Response, method: string, vary: boolean): Response {
  const headers = new Headers(res.headers);
  headers.set("content-type", MARKDOWN_TYPE);
  if (vary) headers.set("vary", AGENT_VARY);
  return new Response(method === "HEAD" ? null : res.body, { status: res.status, statusText: res.statusText, headers });
}

function withVary(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("vary", AGENT_VARY);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

const SITE_CSP = "default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/** Site policy plus one script hash, for a 200 HTML document under /learn with exactly one JSON-LD script. Null leaves the response alone. */
export function learnPageCsp(pathname: string, status: number, contentType: string | null, body: string): string | null {
  if (status !== 200) return null;
  if (pathname !== "/learn" && !pathname.startsWith("/learn/")) return null;
  if (pathname.includes(".")) return null;
  if (!contentType || !/^text\/html\b/i.test(contentType)) return null;
  const scripts = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) return null;
  const hash = createHash("sha256").update(scripts[0][1]).digest("base64");
  return SITE_CSP.replace("style-src", `script-src 'sha256-${hash}'; style-src`);
}

async function serveLearnHtml(req: Request, res: Response): Promise<Response> {
  const method = req.method.toUpperCase();
  const headers = new Headers(res.headers);
  headers.set("vary", AGENT_VARY);
  if (method === "HEAD" || res.status !== 200) {
    return new Response(method === "HEAD" ? null : res.body, { status: res.status, statusText: res.statusText, headers });
  }
  const body = await res.text();
  const csp = learnPageCsp(new URL(req.url).pathname, res.status, headers.get("content-type"), body);
  if (csp) headers.set("content-security-policy", csp);
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

function sub(req: Request, path: string): Request {
  const url = new URL(req.url);
  url.pathname = path;
  return new Request(url.toString(), { method: req.method, headers: req.headers });
}

/**
 * Serve a static site path from the asset binding. A page answers Markdown or HTML as above. A .md URL
 * is served as Markdown, and /.md is the home twin. Anything else, including every non-GET/HEAD request,
 * is the asset binding's own answer.
 */
export async function serveSite(req: Request, assets: Assets): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return assets.fetch(req);
  const path = new URL(req.url).pathname;
  if (path.endsWith(".md")) {
    const res = await assets.fetch(path === "/.md" ? sub(req, "/index.md") : req);
    return res.status === 200 || res.status === 304 ? retype(res, method, false) : res;
  }
  const twin = markdownTwin(path);
  if (!twin) return assets.fetch(req);
  if (wantsMarkdown(req.headers)) {
    const res = await assets.fetch(sub(req, twin));
    // 304 is the twin's own validator matching, so it stays the Markdown variant.
    if (res.status === 200 || res.status === 304) return retype(res, method, true);
  }
  let fetched = await assets.fetch(req);
  // The asset binding usually rewrites an extensionless page to its .html file.
  // When that rewrite does not happen, the file is still the page.
  if ((method === "GET" || method === "HEAD") && fetched.status === 404 && !path.includes(".")) {
    const html = await assets.fetch(sub(req, path === "/" ? "/index.html" : path + ".html"));
    if (html.status === 200 || html.status === 304) {
      await fetched.arrayBuffer().catch(() => undefined);
      fetched = html;
    } else {
      await html.arrayBuffer().catch(() => undefined);
    }
  }
  if (path === "/learn" || path.startsWith("/learn/")) return serveLearnHtml(req, fetched);
  return withVary(fetched);
}
