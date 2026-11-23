// Builds the public site into website/dist/: the homepage (index.html + home.css), the guides, the legal
// pages, the demo page and the site files. Words: Marketing's Attackfee site copy (Nov 17, 2026), placed in
// HOME below and in docs/copy.md. Look: brand.md "Visual direction" (Ink hero, Paper sections, IBM Plex,
// Signal accent), with the hail-grid art and icons drawn by scripts/brand/render-art.mjs.
// No analytics, no external requests: fonts and images are self-hosted and every link is root-relative with
// no extension ("/", "/docs", "/demo"). The old mission pages (/mission, /vision, /values, /ecosystem) are
// gone; the site worker 308s them to homepage sections (MOVED_PAGES).
// Site files: website/_headers ships at the dist root, where Workers static assets applies it to every
// response. website/robots.txt allows everything and names no host. A build with a site root appends one
// Sitemap line. Canonicals and social tags: each page points at itself under ATTACKFEE_SITE_URL, validated
// by @attackfee/protocol/site-url. The CLI (`node website/build.mjs`) uses the environment, then
// wrangler.toml [vars] ATTACKFEE_SITE_URL. An explicit empty site (the tests) or an invalid value: no
// canonical, no social tags, no sitemap, no llms.txt, no llms-learn.txt, and those pages stay byte-identical to a build without them.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { twinPath, alternateLink, homeMarkdown, sourceMarkdown, demoMarkdown, llmsFull } from "./agent-text.mjs";
import { learnSourceFiles, loadLearnPages, validateLearnDir, renderLearnPage, learningLines, llmsLearnText, listingGaps, learnIndexGaps, useGuide } from "./learn.mjs";
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSiteUrl, SITE_URL_ENV } from "@attackfee/protocol/site-url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
/** Former mission pages. None ship; the site worker answers each with a 308 to the homepage section that replaced it. */
export const MOVED_PAGES = { "/mission": "/#why", "/vision": "/#why", "/values": "/#privacy", "/ecosystem": "/#limits" };
/** Kept for callers that list inner pages: there are none now. */
export const PAGES = [];

/** Site nav on every page (site-copy.md "Nav"), after the wordmark. */
export const SITE_NAV = [["/#how", "How it works"], ["/#agents", "For agents"], ["/#limits", "Limits"], ["/demo", "Demo"], ["/docs", "Docs"], ["/learn", "Learn"]];
/** The nav links; `current` ("/demo" or "/docs") gets aria-current. */
export function siteNav(current = "") {
  return SITE_NAV.map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ""}>${label}</a>`).join("");
}

/** Icons at the site root, used by every page; copied unchanged from website/ to dist/. */
export const ICON_FILES = ["favicon.ico", "favicon.svg", "apple-touch-icon.png"];
/** The icon tags in every page's head, all root-relative. */
export const ICON_TAGS = '<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">';

/** Files at the site root that are not pages; copied unchanged from website/ to dist/. */
export const SITE_FILES = ["_headers", "robots.txt"];

/** RFC 9116 Expires for /.well-known/security.txt. tests/security-txt.test.ts fails when it is under 30 days away. */
export const SECURITY_TXT_EXPIRES = "2027-05-19T05:00:00.000Z";

/** Body of /.well-known/security.txt. Not in the sitemap. */
export function securityTxt() {
  return [
    "Contact: https://github.com/lukecarriere/attackfee/security/advisories/new",
    "Expires: " + SECURITY_TXT_EXPIRES,
    "Preferred-Languages: en",
    "Canonical: https://attackfee.dev/.well-known/security.txt",
    "Policy: https://github.com/lukecarriere/attackfee/blob/main/SECURITY.md",
  ].join("\n") + "\n";
}

/** The demo page: one contact form checked as a write, served by the site worker at /demo. */
export const DEMO_FILES = ["demo.html", "demo.css", "demo.js"];
/** The demo page's meta description (site-copy.md "/demo"); demo.html carries the same text. */
export const DEMO_DESCRIPTION = "A protected contact form on attackfee.dev. Send it like a person and it goes through. Send it like a script and it gets a 403.";

/**
 * Visitor guides. Order, nav labels and meta descriptions come from docs/copy.md "## Docs pages".
 * The homepage links to /docs. The four mission pages do not: their HTML stays the released bytes.
 */
const DOC_ORDER = ["docs/index", "docs/quick-start", "docs/widget", "docs/server", "docs/agent", "docs/mcp", "docs/ask", "docs/wordpress", "docs/self-hosting", "download/index"];

export function loadDocMeta(copy = readFileSync(fileURLToPath(new URL("../docs/copy.md", import.meta.url)), "utf8")) {
  const from = copy.indexOf("\n## Docs pages\n");
  if (from < 0) throw new Error('website: docs/copy.md has no "## Docs pages" section');
  const next = copy.indexOf("\n## ", from + 1);
  const sec = copy.slice(from, next < 0 ? undefined : next);
  const label = /^Homepage nav label: (.+)$/m.exec(sec)?.[1];
  if (!label) throw new Error("website: docs/copy.md Docs pages section has no homepage nav label");
  const pages = [];
  for (const m of sec.matchAll(/^- `website\/([^`]+)` \(([^)]+)\): (.+)$/gm)) pages.push({ file: m[1], nav: m[2], description: m[3] });
  if (pages.map((p) => p.file).join("\n") !== DOC_ORDER.join("\n")) throw new Error("website: docs page list does not match docs/copy.md");
  return { label, pages };
}

export const DOC_META = loadDocMeta();
export const DOC_PAGES = DOC_META.pages;
/** Guides listed under the docs nav. The index is the homepage's Docs link, not a second copy of it. */
export const GUIDE_PAGES = DOC_PAGES.filter((p) => p.file !== "docs/index");

/** WordPress plugin header: version and GPL licence the download page and zip name must match. */
export function pluginRelease() {
  const php = readFileSync(fileURLToPath(new URL("../packages/wp-attackfee/attackfee.php", import.meta.url)), "utf8");
  const version = /^\s*\*\s*Version:\s*(\S+)\s*$/m.exec(php)?.[1];
  const license = /^\s*\*\s*License:\s*(\S+)\s*$/m.exec(php)?.[1];
  if (!version) throw new Error("website: attackfee.php has no Version header");
  if (license !== "GPL-2.0-or-later") throw new Error("website: attackfee.php licence is not GPL-2.0-or-later");
  const zip = `attackfee-${version}.zip`;
  return { version, license, zip, shaName: `${zip}.sha256` };
}

/** Files the site ships besides the pages, relative to website/ and to dist/. Fonts are IBM Plex (SIL OFL 1.1), IBM's own Latin-1 woff2 files, unmodified. */
export const HOME_ASSETS = [
  "home.css",
  "img/hail-grid.svg",
  "img/social-card.png",
  "fonts/plex/IBMPlexSans-Regular-Latin1.woff2",
  "fonts/plex/IBMPlexSans-SemiBold-Latin1.woff2",
  "fonts/plex/IBMPlexSans-Bold-Latin1.woff2",
  "fonts/plex/IBMPlexMono-Regular-Latin1.woff2",
  "fonts/plex/LICENSE.txt",
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function parse(md) {
  const blocks = md.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  const h = /^# (.+)$/.exec(blocks[0]);
  if (!h) throw new Error("website: page must start with '# Title'");
  return {
    title: h[1].trim(),
    blocks: blocks.slice(1).map((b) => {
      const lines = b.split("\n");
      if (lines.every((l) => l.startsWith("- "))) return { list: lines.map((l) => l.slice(2).trim()) };
      if (lines.some((l) => /^(#|- |\* |\d+\. |>)/.test(l))) throw new Error("website: unsupported markdown: " + b);
      return { p: lines.join(" ").trim() };
    }),
  };
}

/** Root-relative path of a page: "/" for the homepage, "/mission", "/docs", "/docs/widget", "/download". No extension. */
export function pagePath(file) {
  if (file === "index") return "/";
  if (file === "demo") return "/demo";
  if (file === "docs/index") return "/docs";
  if (file === "download/index") return "/download";
  if (file === "learn/index" || (file.startsWith("learn/") && file.endsWith("/index"))) return "/" + file.slice(0, -"/index".length);
  return "/" + file;
}

/** `<link rel="canonical">` for `file` under the validated site root, or "" when there is none. */
export function canonical(file, base) {
  return base ? `<link rel="canonical" href="${esc(base + pagePath(file))}">` : "";
}

/** The 1200x630 social card (scripts/brand/render-art.mjs). Absolute social image for every public page. */
export const OG_IMAGE = "/img/social-card.png";
export const OG_ALT = "Attackfee. Open to read. Priced to write.";

/** Canonical, Open Graph and Twitter tags for one page, or "" when `base` is null. Titles and descriptions are the page's own. */
export function socialTags(file, title, description, base) {
  if (!base) return "";
  const url = base + pagePath(file);
  const image = base + OG_IMAGE;
  return canonical(file, base) +
    `<meta property="og:title" content="${esc(title)}">` +
    `<meta property="og:description" content="${esc(description)}">` +
    `<meta property="og:url" content="${esc(url)}">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:image" content="${esc(image)}">` +
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` +
    `<meta property="og:image:alt" content="${esc(OG_ALT)}">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${esc(title)}">` +
    `<meta name="twitter:description" content="${esc(description)}">` +
    `<meta name="twitter:image" content="${esc(image)}">` +
    `<meta name="twitter:image:alt" content="${esc(OG_ALT)}">`;
}

/**
 * Legal and support pages. Order, nav labels and meta descriptions come from docs/copy.md
 * "## Legal page descriptions". Rendered like guides but without the guide nav.
 */
export function loadLegalMeta(copy = readFileSync(fileURLToPath(new URL("../docs/copy.md", import.meta.url)), "utf8")) {
  const from = copy.indexOf("\n## Legal page descriptions\n");
  if (from < 0) throw new Error('website: docs/copy.md has no "## Legal page descriptions" section');
  const next = copy.indexOf("\n## ", from + 1);
  const sec = copy.slice(from, next < 0 ? undefined : next);
  const pages = [];
  for (const m of sec.matchAll(/^- `website\/([^`]+)` \(([^)]+)\): (.+)$/gm)) pages.push({ file: m[1], nav: m[2], description: m[3] });
  if (pages.map((p) => p.file).join("\n") !== "privacy\nterms\nsupport") throw new Error("website: legal page list does not match docs/copy.md");
  return pages;
}

export const LEGAL_PAGES = loadLegalMeta();

/** Footer on every page: root-relative links to the legal and support pages. */
export const FOOTER_LINE = "Attackfee runs on your own server. This site has no analytics and no tracking scripts.";
export const FOOTER = `<footer class="site-foot"><nav aria-label="Site">${LEGAL_PAGES.map((p) => `<a href="/${p.file}">${p.nav}</a>`).join("")}<a href="/download">Download</a></nav><p>${FOOTER_LINE}</p></footer>`;

export function renderLegal(page, md, base = null) {
  const { title, blocks } = parseGuide(md);
  const nav = siteNav();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Attackfee</title><meta name="description" content="${esc(page.description)}">${socialTags(page.file, `${title} · Attackfee`, page.description, base)}${ICON_TAGS}<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/docs.css"></head><body>
<header><div class="bar"><a class="mark" href="/">Attackfee<i aria-hidden="true"></i></a><nav aria-label="Pages">${nav}</nav></div></header>
<main><h1>${esc(title)}</h1>
${guideBody(blocks)}
</main>${FOOTER}</body></html>`;
}

/** Branded 404 page. Not in the sitemap. No canonical or social tags. */
export function renderNotFound() {
  const nav = siteNav();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page not found · Attackfee</title><meta name="description" content="This page isn't on Attackfee."><meta name="robots" content="noindex">${ICON_TAGS}<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/docs.css"></head><body>
<header><div class="bar"><a class="mark" href="/">Attackfee<i aria-hidden="true"></i></a><nav aria-label="Pages">${nav}</nav></div></header>
<main><h1>Page not found</h1>
<p>This page isn't on Attackfee.</p>
<p><a class="cta" href="/">Back to home</a></p>
</main>${FOOTER}</body></html>`;
}

export function render(page, md, base = null) {
  const { title, blocks } = parse(md);
  const nav = siteNav();
  const body = blocks.map((b, i) => {
    if (b.list) return `<ul>${b.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`;
    const close = page.closingLine && i === blocks.length - 1;
    return `<p${close ? ' class="close"' : ""}>${esc(b.p)}</p>`;
  }).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Attackfee</title><meta name="description" content="${esc(page.description)}">${socialTags(page.file, `${title} · Attackfee`, page.description, base)}${ICON_TAGS}<link rel="stylesheet" href="/site.css"></head><body>
<header><div class="bar"><a class="mark" href="/">Attackfee<i aria-hidden="true"></i></a><nav aria-label="Pages">${nav}</nav></div></header>
<main><h1>${esc(title)}</h1>
${body}
</main></body></html>`;
}

// Homepage words: Marketing's Attackfee site copy (site-copy.md "Homepage", Nov 17, 2026), verbatim, with the
// review-only claim tags left out. Backticks are code and **...** is the bold lead of a line.
// The <title> separator is U+00B7 MIDDLE DOT.
export const HOME = {
  title: "Attackfee · Write-side security for forms, logins and APIs",
  description: "Attackfee puts a cost on comments, signups, logins and write APIs. Browsers cover it with background work. Agents work or pay per write. Reads stay free.",
  kicker: "Security for the write side of your site",
  h1: "Open to read. Priced to write.",
  lede: "AI agents are cheap to run and getting cheaper. Most of them only read, and that is fine. The ones that write fill your comment sections and grind your login page. Attackfee puts a small cost on every write. Reading stays free, including your docs and read APIs.",
  // The definition under the lede (Marketing SEO brief attackfee-homepage.md, Nov 18, 2026), one paragraph.
  definition: "Attackfee is write-side security for websites and APIs. It puts a small cost on the routes that change something, like comments, signups, logins, posted search and write APIs, and leaves reads free. A visitor's browser covers that cost with a short burst of background proof of work and gets a pass that covers 20 actions for 15 minutes. People never pay money, and there is no CAPTCHA to solve. An AI agent or script does the same work, or can pay per write over HTTP 402 instead. Checks run on the site owner's server, and crawlers are not blocked.",
  buttons: [["/demo", "Try the demo"], ["/docs", "Read the docs"]],
  facts: ["**Reads stay free.** Page views are never gated.", "**Writes carry a cost.** A person's browser covers it with background work, about once a visit. People never pay money."],
  alt: "Pale hail falls on a dark grid. Most cells stay open; a few are lit orange where a write was priced.",
  sections: [
    { id: "why", h: "The cheap side of your site is the side that writes", body: [
      "Every public website has two halves. The read half serves pages, docs and API responses. It is built to be cached and crawled, and agents reading it is how people find you now.",
      "The write half is small and fragile. A comment, a signup, a login attempt or a posted search query each cost you something real: a row in a database, a moderator's minute, a call to a paid search backend, a locked account. On most sites these routes cost the sender nothing at all. An agent can hit them ten thousand times before anyone looks at a dashboard.",
      "Attackfee changes the price of the write half and leaves the read half alone.",
    ] },
    { id: "how", h: "How it works", body: [
      { ol: [
        "**You mark the routes that change something.** Comments, contact forms, signups, logins, posted search and write APIs. Each route gets a class: search, write, account or admin. A heavier class asks for more work. Anything you leave unmarked that is a GET stays a free read.",
        "**A visitor's browser does a little background work.** While someone reads or types, the page script does a short proof of work and trades it with your server for a pass. There is no CAPTCHA to solve and nothing to click.",
        "**The pass rides along with the post.** Pressing Send just sends. One pass covers 20 actions for 15 minutes, so a person needs about one check per visit.",
        "**A write without a valid pass is refused.** A browser gets a 403 with a fresh challenge. A client that sends the Attackfee-Client: agent header gets a 402 with a price and a link to the same work.",
        "**Volume pays again and again.** A script has to earn a new pass every 20 actions. Ten thousand login attempts means earning 500 passes, each with its own round of work.",
      ] },
      "In the repo's benchmark the median check on a desktop took about 0.2 seconds, and about 0.4 seconds on an emulated phone. No real phone has been measured yet. If the work ever runs past 8 seconds, the page shows a \"Verify before sending\" button instead of waiting.",
    ] },
    { id: "open", h: "What stays open", body: [
      "Agents are welcome to read. Attackfee is built so that reading never costs anything.",
      { ul: [
        "Every GET, HEAD and OPTIONS request is a free read unless you deliberately mark that route otherwise.",
        "The Node server refuses a config that gates page views unless a separate setting confirms you meant it. The edge worker and the WordPress plugin never gate a GET.",
        "Attackfee does not block crawlers and does not charge for reading.",
        "Agents can find out how to write before they try. Each Attackfee site serves a machine-readable description at `/.well-known/attackfee.json`, free and unchecked.",
      ] },
    ] },
    { id: "cost", h: "What carries a cost", body: [
      "You decide which routes count and how heavy each one is. The four classes, from light to heavy:",
      { ul: [
        "**Search:** a search box that sends its query as a form post. 1x work.",
        "**Write:** comments, forms, votes and other posts. 4x work. Any POST you have not mapped counts as a write.",
        "**Account:** signup, login and password reset. 8x work.",
        "**Admin:** staff actions. 16x work.",
      ] },
      "A pass earned for a heavier class also covers the lighter ones.",
      "For sites that see GPU-backed grinding, there is an optional memory-hard mode that is much harder to speed up on graphics cards. It is off by default because it is heavier on phones.",
    ] },
    { id: "agents", h: "For agents", body: [
      "An agent that writes to an Attackfee site has a predictable path. It sends the `Attackfee-Client: agent` header and gets JSON back instead of an HTML page. When a write needs a pass, it does the same work a browser does and retries.",
      { ul: [
        "**Agent SDK.** `@attackfee/agent` does the work for a write and retries once.",
        "**MCP server.** `@attackfee/mcp` runs on the agent's own computer. It reads a site's `/.well-known/attackfee.json` and calls only that site's `/v1` API. It has no service of its own.",
      ] },
      "An automated client can pay per action over HTTP 402 instead of doing the work. Current prices are at `/v1/price` and in `/.well-known/attackfee.json`. The owner decides which routes cost more by choosing their class.",
    ] },
    { id: "privacy", h: "Privacy", body: [
      "Attackfee prices actions without needing to know who sent them.",
      { ul: [
        "The page script never reads or sends what people type into your forms.",
        "Checks run on your own server. Nothing about a visitor is sent to us or to any third party.",
        "No tracking pixels and no third-party cookies. A pass lives in memory or in one first-party cookie, `attackfee_pass`, that lasts 15 minutes.",
        "No IP blocking. Your server does limit how often one network address can ask for new challenges, 60 a minute by default, to protect itself.",
        "Logs leave out form bodies, cookies, passes and IP addresses.",
      ] },
    ] },
    { id: "limits", h: "Limits", body: [
      "Security copy that skips this part is not worth reading, so here it is.",
      { ul: [
        "**A funded attacker can still get through.** Proof of work is cheap on rented GPUs. Attackfee makes every try cost something and makes volume slow, but someone willing to spend can keep going.",
        "**It does not filter network floods.** Attackfee works at the request level on the routes you mark. Volumetric attacks need your host or network provider.",
        "**It does not identify anyone.** There is no bot score and no verdict about who is a person.",
        "**It fails closed.** If the store that tracks used challenges is down, protected writes get a 503. Nothing gets through unchecked.",
        "**WordPress gaps.** The plugin covers comments and the wp-login.php form by default, with registration, lost password, the classic WooCommerce checkout and Contact Form 7 as options. It does not cover the WooCommerce block checkout, XML-RPC or application passwords.",
      ] },
    ] },
    { id: "runs", h: "Where it runs", body: [
      { ul: [
        "**Node:** `@attackfee/server`, with Express middleware and the `/v1` API. MIT.",
        "**PHP:** a library that checks passes, shipped inside the WordPress plugin. GPL-2.0-or-later.",
        "**WordPress:** a plugin you upload from the Download page. GPL-2.0-or-later.",
        "**Edge:** a worker build in the repo. It runs this site and its demo.",
      ] },
      "The packages are not on npm yet. Today you install them from a copy of the repo.",
    ] },
  ],
  // FAQ (Marketing SEO brief attackfee-homepage.md, Nov 18, 2026), visible before the closing call to
  // action and marked up word for word as FAQPage JSON-LD.
  faq: [
    ["What is Attackfee?", "Attackfee is write-side security for websites and APIs. It puts a small cost on comments, signups, logins, posted search and write APIs, and leaves reading free for people, crawlers and AI agents."],
    ["How do I stop AI agents from flooding my forms without blocking them from my site?", "Mark the routes that change something. Each write then needs a pass checked on your server. A browser or script without a pass gets a 403 with a fresh challenge. A client that sends the Attackfee-Client: agent header gets a 402 with a price and a link to the same work. A browser earns a pass in the background while the visitor reads or types. Agents that only read never hit a check."],
    ["Do people have to pay or solve anything?", "No. People never pay money and there is nothing to solve. Their browser does a short background check while they read or type. In the repo's benchmark the median check took about 0.2 seconds on a desktop and about 0.4 seconds on an emulated phone. A real phone has not been measured yet."],
    ["What does an AI agent pay to write?", "On attackfee.dev, a client that sends Attackfee-Client: agent and writes without a pass gets HTTP 402 with a price and a link to do the work instead. A comment or form post costs under a cent, and signups and logins cost more. Current prices are at /v1/price. A paid pass covers one write. A work pass covers 20 actions for 15 minutes."],
    ["Is this the same as pay per crawl?", "Pay-per-crawl products charge crawlers for reading pages. Attackfee does not charge for reading. It prices the requests that change something on your site."],
    ["Does robots.txt stop AI agents from posting to my forms?", "robots.txt is a request about what to crawl, and crawlers can ignore it. It does not check a form post. Attackfee checks each write on your server and leaves reading, and your robots.txt, alone."],
    ["Will it stop bots guessing passwords on my login page?", "It makes every attempt cost something. Logins sit in the account class, which asks for 8 times the work of a search, and a script has to earn a new pass every 20 actions, so 10,000 attempts means earning 500 passes. It does not stop a funded attacker with rented GPUs, and it does not identify anyone."],
    ["Does Attackfee detect bots or AI?", "No. There is no bot score and no verdict on who is a person. Every protected write needs a pass, whoever sends it."],
    ["Where does it run?", "Node with Express middleware, PHP through a library shipped in the WordPress plugin, a WordPress plugin, and an edge worker that runs attackfee.dev. The packages are not on npm yet."],
  ],
  closing: "Send a write without a pass and see what your server says.",
};

/** Every visible string on the homepage body, in page order, as plain text (bold markers and backticks removed). */
export function homeStrings() {
  const plain = (s) => s.replace(/\*\*/g, "").replace(/`/g, "");
  const out = [HOME.kicker, HOME.h1, HOME.lede, HOME.definition, ...HOME.buttons.map((b) => b[1]), ...HOME.facts.map(plain)];
  for (const s of HOME.sections) {
    out.push(s.h);
    for (const b of s.body) {
      if (typeof b === "string") out.push(plain(b));
      else out.push(...(b.ol ?? b.ul).map(plain));
    }
  }
  out.push("Questions", ...HOME.faq.flat());
  out.push(HOME.closing, ...HOME.buttons.map((b) => b[1]));
  return out;
}

/** Inline text with a leading **bold** run: the bold part becomes <b>, the rest goes through inline(). */
function leadText(s) {
  const m = /^\*\*(.+?)\*\*(.*)$/.exec(s);
  return m ? `<b>${inline(m[1])}</b>${inline(m[2])}` : inline(s);
}

/**
 * Homepage JSON-LD, or "" when there is no site root: one block (the CSP hashes it) with the
 * Organization (sameAs: the official X profile), the SoftwareApplication (facts already on the
 * page: name, description, url, the social card, the docs link) and the FAQPage, word for word from the
 * visible FAQ.
 */
export function jsonLdTag(base) {
  if (!base) return "";
  const body = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": base + "/#org", name: "Attackfee", url: base + "/", logo: base + "/apple-touch-icon.png", sameAs: ["https://x.com/attackfee"] },
      {
        "@type": "SoftwareApplication",
        "@id": base + "/#app",
        name: "Attackfee",
        description: HOME.description,
        url: base + "/",
        image: base + OG_IMAGE,
        documentation: base + "/docs",
        publisher: { "@id": base + "/#org" },
      },
      {
        "@type": "FAQPage",
        "@id": base + "/#faq",
        mainEntity: HOME.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${body}</script>`;
}

/** The homepage: an Ink hero with the hail-grid art, then Paper sections in site-copy.md order. Styles in home.css, no inline styles, no scripts besides JSON-LD. */
export function renderHome(base = null) {
  const h = HOME;
  const buttons = (cls) => `<p class="${cls}">${h.buttons.map(([href, label], i) => `<a class="btn${i ? " ghost" : ""}" href="${href}">${esc(label)}</a>`).join("")}</p>`;
  const block = (b) => typeof b === "string" ? `<p>${leadText(b)}</p>` : b.ol ? `<ol>${b.ol.map((li) => `<li>${leadText(li)}</li>`).join("")}</ol>` : `<ul>${b.ul.map((li) => `<li>${leadText(li)}</li>`).join("")}</ul>`;
  const sections = h.sections.map((s) => `<section class="sec" id="${s.id}" aria-labelledby="${s.id}-h"><h2 id="${s.id}-h">${esc(s.h)}</h2>${s.body.map(block).join("")}</section>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(h.title)}</title><meta name="description" content="${esc(h.description)}">${socialTags("index", h.title, h.description, base)}${jsonLdTag(base)}
${ICON_TAGS}<link rel="preload" href="/fonts/plex/IBMPlexSans-Bold-Latin1.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/home.css"></head><body>
<header class="top"><div class="bar"><a class="mark" href="/" aria-current="page">Attackfee<i aria-hidden="true"></i></a><nav aria-label="Main">${siteNav()}</nav></div></header>
<main><section class="hero" aria-labelledby="hero-h"><div class="hero-in"><div class="copy"><p class="kicker">${esc(h.kicker)}</p><h1 id="hero-h">${esc(h.h1)}</h1><p class="lede">${esc(h.lede)}</p><p class="def">${esc(h.definition)}</p>${buttons("ctas")}<ul class="facts">${h.facts.map((f) => `<li>${leadText(f)}</li>`).join("")}</ul></div><figure class="art"><img src="/img/hail-grid.svg" alt="${esc(h.alt)}" width="640" height="640" fetchpriority="high"></figure></div></section>
${sections}
<section class="sec" id="faq" aria-labelledby="faq-h"><h2 id="faq-h">Questions</h2>${h.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}</section>
<section class="closing" aria-labelledby="closing-h"><h2 id="closing-h">${esc(h.closing)}</h2>${buttons("ctas")}</section></main>${FOOTER}</body></html>`;
}

/** Inline code and root-relative links. Anything else is escaped. */
function inline(s) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "`") {
      const j = s.indexOf("`", i + 1);
      if (j < 0) { out += esc(s.slice(i)); break; }
      out += "<code>" + esc(s.slice(i + 1, j)) + "</code>";
      i = j + 1;
      continue;
    }
    if (s[i] === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(s.slice(i));
      if (m && safeHref(m[2])) {
        out += `<a href="${esc(m[2])}">${inline(m[1])}</a>`;
        i += m[0].length;
        continue;
      }
    }
    const next = s.slice(i + 1).search(/[`\[]/);
    const end = next < 0 ? s.length : i + 1 + next;
    out += esc(s.slice(i, end));
    i = end;
  }
  return out;
}

function safeHref(url) {
  return /^\/(?!\/)[A-Za-z0-9._~/-]*$/.test(url) && !url.includes("..") && !/\.html?(?:$|[?#])/i.test(url);
}

/** Guide markdown: one h1, h2/h3, paragraphs, "- " lists, fenced code, and pipe tables (header row, --- row, body rows). */
export function parseGuide(md) {
  const lines = md.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  if (!/^# \S/.test(lines[0] ?? "")) throw new Error("website: guide must start with '# Title'");
  const title = lines[0].slice(2).trim();
  const blocks = [];
  let i = 1;
  const blank = (n) => n >= lines.length || lines[n].trim() === "";
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    if (line.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      if (i >= lines.length) throw new Error("website: unclosed code fence in " + title);
      i++;
      blocks.push({ code: buf.join("\n") });
      continue;
    }
    if (line.startsWith("# ")) throw new Error("website: guide has a second h1: " + title);
    const h = /^(#{2,3}) (.+)$/.exec(line);
    if (h) { blocks.push({ h: h[1].length, text: h[2].trim() }); i++; continue; }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2).trim());
      blocks.push({ list: items });
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      if (rows.length < 3 || !cells(rows[1]).every((c) => /^:?-{3,}:?$/.test(c)) || cells(rows[1]).length !== head.length) throw new Error("website: table needs a header row, a --- row, and at least one row in " + title);
      const body = rows.slice(2).map(cells);
      if (body.some((r) => r.length !== head.length)) throw new Error("website: table row has the wrong number of cells in " + title);
      blocks.push({ table: { head, rows: body } });
      continue;
    }
    if (/^(?:\* |\d+\. |>)/.test(line)) throw new Error("website: unsupported markdown in " + title + ": " + line);
    const buf = [];
    while (i < lines.length && !blank(i) && !lines[i].startsWith("```") && !lines[i].startsWith("#") && !lines[i].startsWith("- ") && !lines[i].startsWith("|")) buf.push(lines[i++].trim());
    blocks.push({ p: buf.join(" ") });
  }
  return { title, blocks };
}

export function guideHtml(md) {
  return guideBody(parseGuide(md).blocks);
}

function guideBody(blocks) {
  return blocks.map((b) => {
    if (b.h) return `<h${b.h}>${inline(b.text)}</h${b.h}>`;
    if (b.list) return `<ul>${b.list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`;
    if (b.code != null) return `<pre tabindex="0"><code>${esc(b.code)}</code></pre>`;
    if (b.table) return `<table>\n<thead><tr>${b.table.head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>\n<tbody>\n${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("\n")}\n</tbody>\n</table>`;
    return `<p>${inline(b.p)}</p>`;
  }).join("\n");
}

function applyTokens(md, rel, sha) {
  const checksum = sha || "see the .sha256 file next to the zip";
  return md.replaceAll("{{VERSION}}", rel.version).replaceAll("{{SHA}}", checksum);
}

export function renderGuide(page, md, base = null, rel = pluginRelease(), sha = "") {
  const path = pagePath(page.file);
  const { title, blocks } = parseGuide(applyTokens(md, rel, sha));
  const inDocs = path === "/docs" || path.startsWith("/docs/");
  const pagesNav = siteNav(inDocs ? "/docs" : "");
  const guides = GUIDE_PAGES.map((g) => `<a href="${pagePath(g.file)}"${pagePath(g.file) === path ? ' aria-current="page"' : ""}>${esc(g.nav)}</a>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Attackfee</title><meta name="description" content="${esc(page.description)}">${socialTags(page.file, `${title} · Attackfee`, page.description, base)}${ICON_TAGS}<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/docs.css"></head><body>
<header><div class="bar"><a class="mark" href="/">Attackfee<i aria-hidden="true"></i></a><nav aria-label="Pages">${pagesNav}</nav><nav class="guides" aria-label="Guides">${guides}</nav></div></header>
<main><h1>${esc(title)}</h1>
${guideBody(blocks)}
</main>${FOOTER}</body></html>`;
}

/** sha256 of the built plugin zip, or "" when the release dir has not been built yet. */
function releaseSha(rel) {
  const file = fileURLToPath(new URL("../dist-release/" + rel.shaName, import.meta.url));
  if (!existsSync(file)) return "";
  const hex = readFileSync(file, "utf8").trim().split(/\s+/)[0] ?? "";
  if (!/^[a-f0-9]{64}$/.test(hex)) throw new Error("website: dist-release/" + rel.shaName + " is not a sha256 line");
  return hex;
}

function copyPluginZip(out, rel) {
  const dir = fileURLToPath(new URL("../dist-release/", import.meta.url));
  const zip = dir + rel.zip;
  const sha = dir + rel.shaName;
  if (!existsSync(zip) || !existsSync(sha)) return false;
  mkdirSync(out + "download", { recursive: true });
  for (const f of readdirSync(out + "download")) {
    if (/^attackfee-.*\.zip(\.sha256)?$/.test(f) && f !== rel.zip && f !== rel.shaName) rmSync(out + "download/" + f);
  }
  copyFileSync(zip, out + "download/" + rel.zip);
  copyFileSync(sha, out + "download/" + rel.shaName);
  return true;
}

/** Public HTML pages, in sitemap order. `download/index` is already in DOC_PAGES. */
export function discoveryFiles() {
  return ["index", ...PAGES.map((p) => p.file), ...DOC_PAGES.map((p) => p.file), ...learnSourceFiles(), ...LEGAL_PAGES.map((p) => p.file), "demo"];
}

/** Paths a learn page may link to, besides other learn pages in the same set. */
export function sitePaths() {
  const set = new Set(["/", "/demo", ...Object.keys(MOVED_PAGES)]);
  for (const p of DOC_PAGES) set.add(pagePath(p.file));
  for (const p of LEGAL_PAGES) set.add(pagePath(p.file));
  for (const f of [...ICON_FILES, ...SITE_FILES, "site.css", "docs.css", "learn.css", "home.css", "demo.css", "demo.js", ...HOME_ASSETS]) set.add("/" + f);
  return [...set];
}

function learnOpts(pages, page, base) {
  const labels = { "/": "Attackfee", "/demo": "Demo" };
  for (const p of DOC_PAGES) labels[pagePath(p.file)] = p.nav;
  for (const p of LEGAL_PAGES) labels[pagePath(p.file)] = p.nav;
  for (const p of pages) labels[p.path] = p.title;
  return {
    base,
    lastmod: sourceLastmod(page.file),
    labels,
    hubPages: pages.filter((p) => p.slug === "index" && p.hub !== "index").map((p) => p.hub),
  };
}

function pageMarkdown(file, base) {
  if (file === "index") return homeMarkdown(HOME);
  if (file === "demo") return demoMarkdown(readFileSync(HERE + "demo.html", "utf8"));
  if (file.startsWith("learn/")) {
    const pages = loadLearnPages();
    const page = pages.find((p) => p.file === file);
    return renderLearnPage(page, learnOpts(pages, page, base)).markdown;
  }
  const rel = pluginRelease();
  return sourceMarkdown(applyTokens(readFileSync(HERE + file + ".md", "utf8"), rel, releaseSha(rel)));
}

/** One sitemap of HTML pages. /llms-learn.txt is the Learning Center catalog and is not a sitemap URL. */
export function learnDiscoveryGaps(base) {
  const pages = loadLearnPages();
  const files = discoveryFiles();
  const llms = base ? llmsText(base) : "";
  const learn = base ? llmsLearnText(base, pages) : undefined;
  const full = base ? llmsFull(base, files.map((f) => ({ url: base + pagePath(f), md: pageMarkdown(f, base) }))) : "";
  const errors = listingGaps(pages.map((p) => ({ file: p.file, path: p.path, markdown: pageMarkdown(p.file, base) })), {
    files,
    sitemap: base ? sitemapXml(base) : "",
    llms,
    learn,
    full,
    base: base || "",
  });
  if (base) {
    errors.push(...learnIndexGaps(llms, base));
    for (const p of pages) {
      if (!learn.includes(base + twinPath(p.file))) errors.push(p.path + ": twin not in llms-learn.txt");
    }
  }
  return errors;
}

export function cliSiteBase(env) {
  return parseSiteUrl(cliSiteRaw(env)).url;
}

const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Last content change, not build time. Omit lastmod if the source history is unavailable. */
export function sourceLastmod(file) {
  const paths = file === "index" ? ["website/build.mjs", "docs/copy.md"] : file === "demo" ? ["website/demo.html"] : ["website/" + file + ".md"];
  try {
    const date = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...paths], { cwd: HERE + "..", encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  } catch { return ""; }
}

export function sitemapXml(base, lastmod = sourceLastmod) {
  const rows = discoveryFiles().map((f) => {
    const date = lastmod(f);
    return `  <url><loc>${xml(base + pagePath(f))}</loc>${date ? `<lastmod>${xml(date)}</lastmod>` : ""}</url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

/** llms.txt lines (Marketing site-copy.md "llms.txt summary", Nov 17, 2026), verbatim. */
export const LLMS_SUMMARY = "Attackfee puts a small cost on the routes that change something on a website, like comments, signups, logins and write APIs. Reads stay free.";
export const LLMS_BODY = "Attackfee is write-side security for websites and APIs. Each protected write needs a pass. A browser earns one with a fraction of a second of background work, and one pass covers 20 actions for 15 minutes. An automated client sends the `Attackfee-Client: agent` header, does the same work and gets JSON responses. Page views, docs and GET requests are free and are never gated, and Attackfee does not block crawlers. It does not identify the caller. Checks run on the site owner's server. An automated client can pay per action over HTTP 402 instead of doing the work. Current prices are at `/v1/price`. Each site describes its write routes at `/.well-known/attackfee.json`.";
export const LLMS_SITE = "This site's pages, docs and downloads are static files with no analytics, no ads and no tracking scripts.";

/** Plain-language index for language models. The link blurbs are the pages' meta descriptions. */
export function llmsText(base) {
  const link = (href, label, description) => `- [${label}](${base}${href}): ${description}`;
  return [
    "# Attackfee",
    "",
    `> ${LLMS_SUMMARY}`,
    "",
    LLMS_BODY,
    "",
    LLMS_SITE,
    "",
    "## Docs",
    "",
    ...DOC_PAGES.map((p) => link(pagePath(p.file), p.nav, p.description)),
    "",
    ...learningLines(base, loadLearnPages()),
    "## Also on this site",
    "",
    link("/", "Attackfee", HOME.description),
    link("/demo", "Demo", DEMO_DESCRIPTION),
    ...LEGAL_PAGES.map((p) => link(pagePath(p.file), p.nav, p.description)),
    "",
    "## Markdown",
    "",
    link(twinPath("index"), "Attackfee", HOME.description),
    ...DOC_PAGES.map((p) => link(twinPath(p.file), p.nav, p.description)),
    link(twinPath("demo"), "Demo", DEMO_DESCRIPTION),
    ...LEGAL_PAGES.map((p) => link(twinPath(p.file), p.nav, p.description)),
    "- [All pages](" + base + "/llms-full.txt)",
    "",
  ].join("\n");
}

/** ATTACKFEE_SITE_URL from wrangler.toml [vars], or undefined when that line is absent. */
export function readWranglerSiteUrl() {
  const toml = readFileSync(fileURLToPath(new URL("../wrangler.toml", import.meta.url)), "utf8");
  return /^ATTACKFEE_SITE_URL\s*=\s*"([^"]*)"\s*$/m.exec(toml)?.[1];
}

/** What `node website/build.mjs` uses: the environment when it is set, otherwise the wrangler.toml value. */
export function cliSiteRaw(env = process.env) {
  if (env[SITE_URL_ENV] !== undefined) return env[SITE_URL_ENV];
  return readWranglerSiteUrl();
}

/**
 * /demo JSON-LD (Marketing SEO brief attackfee-demo.md, Nov 18, 2026): the WebPage with its
 * BreadcrumbList, tied to the homepage's SoftwareApplication (#app). "" without a site root.
 */
export function demoJsonLdTag(base) {
  if (!base) return "";
  const body = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": base + "/demo#page",
    url: base + "/demo",
    name: "Attackfee demo",
    description: "One contact form protected as a write. A browser send goes through, a script with no pass gets 403, and an agent gets HTTP 402 with a price or a work challenge.",
    about: { "@id": base + "/#app" },
    isPartOf: { "@type": "WebSite", url: base + "/", name: "Attackfee" },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Attackfee", item: base + "/" },
        { "@type": "ListItem", position: 2, name: "Demo", item: base + "/demo" },
      ],
    },
  }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${body}</script>`;
}

function decorateDemo(html, base) {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  const desc = /<meta name="description" content="([^"]*)">/.exec(html)?.[1];
  if (!title || desc == null) throw new Error("website: demo.html has no title or description");
  const tags = socialTags("demo", title, desc, base);
  const needle = `<meta name="description" content="${desc}">`;
  return html.replace(needle, needle + tags + demoJsonLdTag(base));
}

/** Add script-src for the homepage JSON-LD only. The rest of the site policy stays. Demo CSP is a different line. */
function withJsonLdCsp(headers, html) {
  const body = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!body) return headers;
  const hash = createHash("sha256").update(body).digest("base64");
  const from = "default-src 'none'; style-src 'self'";
  if (!headers.includes(from)) throw new Error("website: site CSP line not found");
  return headers.replace(from, `default-src 'none'; script-src 'sha256-${hash}'; style-src 'self'`);
}

/**
 * Build into `out`. `site` is the raw ATTACKFEE_SITE_URL value (default: the environment, then wrangler.toml).
 * It is validated by the protocol helper; an invalid value is reported through `warn` (without the value)
 * and treated as unset. The plugin zip is copied from dist-release/ when that build has been run.
 */
export function build(out = HERE + "dist/", site = cliSiteRaw(), warn = console.warn) {
  const { url: base, error } = parseSiteUrl(site);
  if (error) warn(`website: ${error}; ignored, so no page gets a canonical tag`);
  const learnErrors = validateLearnDir(HERE + "learn", { knownPaths: sitePaths(), lastmod: sourceLastmod, today: new Date().toISOString().slice(0, 10) });
  if (learnErrors.length) throw new Error(learnErrors.map((e) => (e.startsWith("learn:") ? e : "learn: " + e)).join("\n"));
  if (base) {
    const gaps = learnDiscoveryGaps(base);
    if (gaps.length) throw new Error(gaps.map((g) => "learn: " + g).join("\n"));
  }
  const rel = pluginRelease();
  const sha = releaseSha(rel);
  // Start clean so a file that no longer ships (an old page, photo or font) is not left behind and deployed.
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(out + "index.html", renderHome(base));
  mkdirSync(out + "docs", { recursive: true });
  mkdirSync(out + "download", { recursive: true });
  for (const p of DOC_PAGES) writeFileSync(out + p.file + ".html", renderGuide(p, readFileSync(HERE + p.file + ".md", "utf8"), base, rel, sha));
  for (const p of LEGAL_PAGES) writeFileSync(out + p.file + ".html", renderLegal(p, readFileSync(HERE + p.file + ".md", "utf8"), base));
  const learnPages = loadLearnPages();
  for (const p of learnPages) {
    const file = out + p.file + ".html";
    mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
    writeFileSync(file, renderLearnPage(p, learnOpts(learnPages, p, base)).html);
  }
  writeFileSync(out + "404.html", renderNotFound());
  copyFileSync(HERE + "site.css", out + "site.css");
  copyFileSync(HERE + "docs.css", out + "docs.css");
  copyFileSync(HERE + "learn.css", out + "learn.css");
  for (const f of ICON_FILES) copyFileSync(HERE + f, out + f);
  for (const f of SITE_FILES) copyFileSync(HERE + f, out + f);
  mkdirSync(out + ".well-known", { recursive: true });
  writeFileSync(out + ".well-known/security.txt", securityTxt());
  for (const f of DEMO_FILES) {
    if (f === "demo.html" && base) writeFileSync(out + f, decorateDemo(readFileSync(HERE + f, "utf8"), base));
    else copyFileSync(HERE + f, out + f);
  }
  for (const f of HOME_ASSETS) {
    mkdirSync(out + f.slice(0, f.lastIndexOf("/") + 1), { recursive: true });
    copyFileSync(HERE + f, out + f);
  }
  if (base) {
    writeFileSync(out + "robots.txt", readFileSync(out + "robots.txt", "utf8") + `Sitemap: ${base}/sitemap.xml\n`);
    writeFileSync(out + "sitemap.xml", sitemapXml(base));
    writeFileSync(out + "llms.txt", llmsText(base));
    writeFileSync(out + "llms-learn.txt", llmsLearnText(base, learnPages));
    // One source per page for both representations. Keep the released HTML bytes, adding only the alternate link.
    const pages = discoveryFiles().map((file) => {
      const htmlFile = out + file + ".html";
      const html = readFileSync(htmlFile, "utf8");
      const md = file.startsWith("learn/") ? pageMarkdown(file, base) : file === "index" ? homeMarkdown(HOME) : file === "demo" ? demoMarkdown(html) : sourceMarkdown(applyTokens(readFileSync(HERE + file + ".md", "utf8"), rel, sha));
      writeFileSync(out + twinPath(file).slice(1), md);
      writeFileSync(htmlFile, html.replace("</head>", alternateLink(file, base) + "</head>"));
      return { url: base + pagePath(file), md };
    });
    writeFileSync(out + "llms-full.txt", llmsFull(base, pages));
    writeFileSync(out + "_headers", withJsonLdCsp(readFileSync(out + "_headers", "utf8"), readFileSync(out + "index.html", "utf8")));
  }
  copyPluginZip(out, rel);
  return out;
}

useGuide({ parseGuide, guideHtml, siteNav, ICON_TAGS, FOOTER, socialTags });

if (import.meta.url === `file://${process.argv[1]}`) console.log("website: built " + build());
