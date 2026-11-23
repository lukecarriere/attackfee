// Markdown twins of the public pages, for AI agents (packages/edge-cf/src/agent-view.ts serves them at the
// page's own URL). No second copy deck: each twin is built from the same source as its HTML. The homepage
// twin is written from HOME (build.mjs), a guide or legal twin is its own Markdown source with the same
// tokens filled in, and the demo twin is converted from website/demo.html's <main>, leaving out the form
// and the live counters. Site chrome (nav, footer, scripts) is not part of any twin.
// mainBlocks() and markdownPlain() are the no-cloaking check: every text block inside an HTML page's
// <main> must be in its twin (tests/agent-markdown.test.ts, scripts/live-checks.mjs agentRead).

/** Root-relative URL of a page's Markdown twin: "/index.md" for the homepage, else the page path plus ".md". */
export function twinPath(file) {
  if (file === "index") return "/index.md";
  if (file === "docs/index") return "/docs.md";
  if (file === "download/index") return "/download.md";
  if (file === "learn/index" || (file.startsWith("learn/") && file.endsWith("/index"))) return "/" + file.slice(0, -"/index".length) + ".md";
  return "/" + file + ".md";
}

const attr = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The `<link rel="alternate">` to a page's twin, or "" when there is no site root (like the canonical, so a
 * build without one stays byte-identical). Root-relative like every other site link; the canonical stays
 * the only absolute URL on a page.
 */
export function alternateLink(file, base) {
  return base ? `<link rel="alternate" type="text/markdown" href="${attr(twinPath(file))}">` : "";
}

/** The HTML without its one Markdown alternate link: what the page was before twins existed. */
export function stripAlternate(html) {
  return html.replace(/<link rel="alternate" type="text\/markdown" href="[^"]*">/, "");
}

/**
 * Homepage facts that must read the same to a person and to an agent: the write price, how it works, and
 * free reads with paid writes. Each is existing homepage copy, as plain text.
 */
export const KEY_FACTS = [
  "Reads stay free. Page views are never gated.",
  "Writes carry a cost. A person's browser covers it with background work, about once a visit. People never pay money.",
  "You mark the routes that change something. Comments, contact forms, signups, logins, posted search and write APIs. Each route gets a class: search, write, account or admin. A heavier class asks for more work. Anything you leave unmarked that is a GET stays a free read.",
  "A visitor's browser does a little background work. While someone reads or types, the page script does a short proof of work and trades it with your server for a pass. There is no CAPTCHA to solve and nothing to click.",
  "The pass rides along with the post. Pressing Send just sends. One pass covers 20 actions for 15 minutes, so a person needs about one check per visit.",
  "A write without a valid pass is refused. A browser gets a 403 with a fresh challenge. A client that sends the Attackfee-Client: agent header gets a 402 with a price and a link to the same work.",
  "Volume pays again and again. A script has to earn a new pass every 20 actions. Ten thousand login attempts means earning 500 passes, each with its own round of work.",
  "Every GET, HEAD and OPTIONS request is a free read unless you deliberately mark that route otherwise.",
  "An automated client can pay per action over HTTP 402 instead of doing the work. Current prices are at /v1/price and in /.well-known/attackfee.json.",
  "A comment or form post costs under a cent, and signups and logins cost more. Current prices are at /v1/price. A paid pass covers one write. A work pass covers 20 actions for 15 minutes.",
];

const lines = (...parts) => parts.filter((p) => p !== "").join("\n\n") + "\n";

/** The homepage twin, from the same HOME object renderHome() writes. */
export function homeMarkdown(h) {
  const buttons = h.buttons.map(([href, label]) => `- [${label}](${href})`).join("\n");
  const block = (b) => typeof b === "string" ? b : b.ol ? b.ol.map((li, i) => `${i + 1}. ${li}`).join("\n") : b.ul.map((li) => `- ${li}`).join("\n");
  return lines(
    `# ${h.h1}`,
    h.kicker,
    h.lede,
    h.definition,
    buttons,
    h.facts.map((f) => `- ${f}`).join("\n"),
    ...h.sections.map((s) => lines(`## ${s.h}`, ...s.body.map(block)).trimEnd()),
    lines("## Questions", ...h.faq.map(([q, a]) => `### ${q}\n\n${a}`)).trimEnd(),
    `## ${h.closing}`,
    buttons,
  );
}

/** A guide or legal twin: its Markdown source after the build's token fill, with one trailing newline. */
export function sourceMarkdown(md) {
  return md.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** <main> without the parts that are controls or live values, not reading text. */
function readableMain(html) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? "";
  return main
    .replace(/<(script|style|form|noscript|button|dl|figure)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(span|p|div)\b[^>]*\shidden\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}

const BLOCK = /<(h[1-6]|p|li|th|td|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi;

/** Each text block (headings, paragraphs, list items, table cells, code) inside <main>, as plain text. */
export function mainBlocks(html) {
  const out = [];
  for (const m of readableMain(html).matchAll(BLOCK)) {
    const text = decode(m[2].replace(/<[^>]+>/g, "")).trim();
    if (text) out.push(text);
  }
  return out;
}

/** Inline HTML to Markdown: code, root-relative links and bold. Other tags are dropped. */
function inlineMd(s) {
  return decode(s
    .replace(/<code>([\s\S]*?)<\/code>/gi, (_, c) => "`" + c.replace(/<[^>]+>/g, "") + "`")
    .replace(/<a\b[^>]*href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** The demo twin: website/demo.html's <main> as Markdown, in page order, without the form and the counters. */
export function demoMarkdown(html) {
  const out = [];
  for (const m of readableMain(html).matchAll(BLOCK)) {
    const tag = m[1].toLowerCase();
    if (tag === "pre") { out.push("```\n" + decode(m[2].replace(/<[^>]+>/g, "")).trim() + "\n```"); continue; }
    const text = inlineMd(m[2]);
    if (!text) continue;
    if (/^h[1-6]$/.test(tag)) out.push("#".repeat(Number(tag[1])) + " " + text);
    else if (tag === "li") out.push("- " + text);
    else out.push(text);
  }
  return lines(...out);
}

/** Markdown as the plain text a reader sees: no heading, list or table markers, bold, backticks or link targets. Code stays as written. */
export function markdownPlain(md) {
  let fence = false;
  return md.split("\n").map((line) => {
    if (line.startsWith("```")) { fence = !fence; return ""; }
    if (fence) return line;
    let s = line.replace(/^#{1,6} /, "").replace(/^- /, "").replace(/^\d+\. /, "");
    if (s.startsWith("|")) s = s.replace(/\|/g, " ");
    return s.replace(/\[([^\]\n]+)\]\((\/[^)\s]*)\)/g, "$1").replace(/\*\*/g, "").replace(/`/g, "");
  }).join("\n");
}

/** Markdown with fenced and inline code removed: what an agent would read as markup, not as an example. */
export function outsideCode(md) {
  return md.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
}

/** llms-full.txt: every twin in sitemap order, each after a Source line with its page URL. */
export function llmsFull(base, pages) {
  return pages.map(({ url, md }) => `Source: ${url}\n\n${md}`).join("\n---\n\n");
}
